import os
import re
import uuid
import datetime
import time
import logging
import asyncio
import threading
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union
import boto3
from boto3.dynamodb.conditions import Key, Attr
from boto3.dynamodb.types import Binary, TypeSerializer, TypeDeserializer
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger("server.dynamo")

# Chunk size for storing blobs in DynamoDB items (under DynamoDB 400KB limit)
BLOB_CHUNK_SIZE = 350 * 1024  # 350 KB


def to_dynamo_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, list):
        return [to_dynamo_val(x) for x in val]
    if isinstance(val, dict):
        return {k: to_dynamo_val(v) for k, v in val.items()}
    return val


def from_dynamo_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, Decimal):
        # Convert Decimal to int if no fractional part, else float
        if val % 1 == 0:
            return int(val)
        return float(val)
    if isinstance(val, Binary):
        return val.value
    if isinstance(val, list):
        return [from_dynamo_val(x) for x in val]
    if isinstance(val, dict):
        return {k: from_dynamo_val(v) for k, v in val.items()}
    return val


def sanitize_dynamo_row(item: Dict[str, Any]) -> Dict[str, Any]:
    if not item:
        return {}
    res = {}
    for k, v in item.items():
        if k in ("PK", "SK", "_type", "_deleted", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK"):
            continue
        res[k] = from_dynamo_val(v)
    return res


class DynamoDBService:
    def __init__(self):
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.table_name = os.getenv("DYNAMODB_TABLE_NAME", "easy-lims")
        self.endpoint_url = os.getenv("DYNAMODB_ENDPOINT_URL") or None
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID") or None
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY") or None

        # Sized connection pool for high concurrency
        boto_config = Config(
            max_pool_connections=100,
            retries={"max_attempts": 3, "mode": "standard"},
        )

        session_kwargs = {"region_name": self.region}
        if self.aws_access_key_id and self.aws_secret_access_key:
            session_kwargs["aws_access_key_id"] = self.aws_access_key_id
            session_kwargs["aws_secret_access_key"] = self.aws_secret_access_key

        self.session = boto3.Session(**session_kwargs)
        resource_kwargs = {"config": boto_config}
        if self.endpoint_url:
            resource_kwargs["endpoint_url"] = self.endpoint_url

        self.dynamodb = self.session.resource("dynamodb", **resource_kwargs)
        self.client = self.session.client("dynamodb", **resource_kwargs)
        self.table = self.dynamodb.Table(self.table_name)

        # In-memory entity cache to avoid repeating expensive full-table scans
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
        self._cache_lock = threading.Lock()
        self._cache_ttl = 15.0  # seconds

        logger.info(f"Initialized DynamoDBService with table '{self.table_name}' in region '{self.region}' (max_pool_connections=100)")

    def _invalidate_cache(self, table_key: Optional[str] = None):
        with self._cache_lock:
            if table_key:
                self._cache.pop(table_key.strip().lower(), None)
            else:
                self._cache.clear()

    def get_next_id(self, entity_name: str) -> int:
        """Atomic integer counter for auto-increment IDs in DynamoDB."""
        entity_key = entity_name.strip().lower()
        try:
            res = self.table.update_item(
                Key={"PK": "COUNTER", "SK": entity_key},
                UpdateExpression="ADD #v :inc",
                ExpressionAttributeNames={"#v": "current_value"},
                ExpressionAttributeValues={":inc": 1},
                ReturnValues="UPDATED_NEW",
            )
            return int(res["Attributes"]["current_value"])
        except Exception as e:
            logger.warning(f"Error in atomic counter for '{entity_key}', fallback to timestamp id: {e}")
            return int(datetime.datetime.now().timestamp() * 1000)

    # ------------------------------------------------------------------------
    # CRUD Operations for Entities
    # ------------------------------------------------------------------------

    def put_entity(self, table_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
        table_key = table_name.strip().lower()
        item_copy = dict(item)

        if "id" not in item_copy or item_copy["id"] is None:
            item_copy["id"] = self.get_next_id(table_key)

        id_val = item_copy["id"]
        pk = f"{table_key.upper()}#{id_val}"
        sk = "META"

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if "created_at" not in item_copy or not item_copy["created_at"]:
            item_copy["created_at"] = now_iso
        if "updated_at" not in item_copy or not item_copy["updated_at"]:
            item_copy["updated_at"] = now_iso

        # Consolidate embedded keys if saving a job document
        if table_key == "jobs":
            mats = item_copy.get("materials") or item_copy.get("material_inward_register") or []
            item_copy["materials"] = mats
            item_copy["material_inward_register"] = mats
            item_copy["materials_received"] = mats

            logs = item_copy.get("logs") or item_copy.get("job_workflow_logs") or item_copy.get("workflow_logs") or []
            item_copy["logs"] = logs
            item_copy["workflow_logs"] = logs
            item_copy["job_workflow_logs"] = logs

            techs = item_copy.get("technicians") or item_copy.get("job_to_technicians") or []
            item_copy["technicians"] = techs
            item_copy["job_to_technicians"] = techs
            item_copy["technician_assignments"] = techs

            tests = item_copy.get("tests") or item_copy.get("job_tests") or []
            item_copy["tests"] = tests
            item_copy["job_tests"] = tests

        dynamo_item = {k: to_dynamo_val(v) for k, v in item_copy.items() if v is not None}
        dynamo_item["PK"] = pk
        dynamo_item["SK"] = sk
        dynamo_item["_type"] = table_key
        dynamo_item["GSI1PK"] = f"ENTITY#{table_key}"
        dynamo_item["GSI1SK"] = str(dynamo_item.get("created_at") or dynamo_item.get("updated_at") or pk)

        self.table.put_item(Item=dynamo_item)
        self._invalidate_cache(table_key)
        return sanitize_dynamo_row(dynamo_item)

    def get_entity(self, table_name: str, id_val: Union[int, str]) -> Optional[Dict[str, Any]]:
        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        try:
            res = self.table.get_item(Key={"PK": pk, "SK": "META"})
            item = res.get("Item")
            if not item or item.get("_deleted"):
                return None
            sanitized = sanitize_dynamo_row(item)
            if table_key == "jobs":
                mats = sanitized.get("materials") or sanitized.get("material_inward_register") or []
                sanitized["materials"] = mats
                sanitized["material_inward_register"] = mats
                sanitized["materials_received"] = mats

                logs = sanitized.get("logs") or sanitized.get("job_workflow_logs") or sanitized.get("workflow_logs") or []
                sanitized["logs"] = logs
                sanitized["workflow_logs"] = logs
                sanitized["job_workflow_logs"] = logs

                techs = sanitized.get("technicians") or sanitized.get("job_to_technicians") or []
                sanitized["technicians"] = techs
                sanitized["job_to_technicians"] = techs
                sanitized["technician_assignments"] = techs

                tests = sanitized.get("tests") or sanitized.get("job_tests") or []
                sanitized["tests"] = tests
                sanitized["job_tests"] = tests
            return sanitized
        except Exception as e:
            logger.error(f"Error getting entity {pk}: {e}")
            return None

    def update_entity(self, table_name: str, id_val: Union[int, str], updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_entity(table_name, id_val)
        if not existing:
            return None

        merged = dict(existing)
        merged.update({k: v for k, v in updates.items() if v is not None or k in updates})
        merged["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        dynamo_item = {k: to_dynamo_val(v) for k, v in merged.items() if v is not None}
        dynamo_item["PK"] = pk
        dynamo_item["SK"] = "META"
        dynamo_item["_type"] = table_key
        dynamo_item["GSI1PK"] = f"ENTITY#{table_key}"
        dynamo_item["GSI1SK"] = str(dynamo_item.get("created_at") or dynamo_item.get("updated_at") or pk)

        self.table.put_item(Item=dynamo_item)
        self._invalidate_cache(table_key)
        return sanitize_dynamo_row(dynamo_item)

    def delete_entity(self, table_name: str, id_val: Union[int, str]) -> bool:
        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        try:
            self.table.delete_item(Key={"PK": pk, "SK": "META"})
            self._invalidate_cache(table_key)
            return True
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code == "AccessDeniedException":
                # Fallback to soft delete if IAM user lacks dynamodb:DeleteItem
                logger.warning(f"dynamodb:DeleteItem denied for {pk}, performing soft-delete fallback")
                try:
                    self.table.update_item(
                        Key={"PK": pk, "SK": "META"},
                        UpdateExpression="SET #del = :t",
                        ExpressionAttributeNames={"#del": "_deleted"},
                        ExpressionAttributeValues={":t": True},
                    )
                    self._invalidate_cache(table_key)
                    return True
                except Exception as inner_e:
                    logger.error(f"Failed soft delete fallback: {inner_e}")
                    return False
            logger.error(f"Error deleting entity {pk}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error deleting entity {pk}: {e}")
            return False

    def list_entities(
        self,
        table_name: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        order: str = "desc",
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        table_key = table_name.strip().lower()

        # Check cache
        now = time.time()
        items = None
        with self._cache_lock:
            if table_key in self._cache:
                cached_time, cached_items = self._cache[table_key]
                if now - cached_time < self._cache_ttl:
                    items = [dict(it) for it in cached_items]

        if items is None:
            # 1. Try querying GSI1 if available
            try:
                res = self.table.query(
                    IndexName="GSI1",
                    KeyConditionExpression=Key("GSI1PK").eq(f"ENTITY#{table_key}")
                )
                items = [sanitize_dynamo_row(it) for it in res.get("Items", []) if not it.get("_deleted")]
            except ClientError:
                # 2. Fallback to scan if GSI1 is not yet indexed
                scan_kwargs = {
                    "FilterExpression": Attr("_type").eq(table_key) & Attr("_deleted").not_exists()
                }
                items = []
                done = False
                start_key = None
                while not done:
                    if start_key:
                        scan_kwargs["ExclusiveStartKey"] = start_key
                    res = self.table.scan(**scan_kwargs)
                    for it in res.get("Items", []):
                        if not it.get("_deleted"):
                            items.append(sanitize_dynamo_row(it))
                    start_key = res.get("LastEvaluatedKey")
                    if not start_key:
                        done = True

            with self._cache_lock:
                self._cache[table_key] = (now, [dict(it) for it in items])

        # Apply in-memory filters if needed
        if filters:
            filtered = []
            for item in items:
                match = True
                for fk, fv in filters.items():
                    if fv is None:
                        continue
                    iv = item.get(fk)
                    if isinstance(fv, list):
                        if iv not in fv:
                            match = False
                            break
                    elif isinstance(fv, str) and fv.startswith("%") and fv.endswith("%"):
                        needle = fv.strip("%").lower()
                        if needle not in str(iv or "").lower():
                            match = False
                            break
                    elif iv != fv:
                        match = False
                        break
                if match:
                    filtered.append(item)
            items = filtered

        total = len(items)

        # Sorting
        if sort_by:
            is_desc = (order or "desc").lower() == "desc"
            items.sort(key=lambda x: (x.get(sort_by) is not None, x.get(sort_by)), reverse=is_desc)

        # Pagination
        if limit is not None:
            items = items[offset : offset + limit]

        return items, total

    # ------------------------------------------------------------------------
    # Dedicated File & PDF Blob Storage (Transparent Chunking)
    # ------------------------------------------------------------------------

    def put_file_blob(
        self,
        file_id: str,
        filename: str,
        content_type: Optional[str],
        data: bytes,
        created_by: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Stores any file/PDF/image in DynamoDB.
        Large files are automatically chunked into sequential binary items (350KB each).
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        file_size = len(data)

        # Calculate chunks
        chunks = []
        if file_size == 0:
            chunks = [b""]
        else:
            for offset in range(0, file_size, BLOB_CHUNK_SIZE):
                chunks.append(data[offset : offset + BLOB_CHUNK_SIZE])

        total_chunks = len(chunks)

        # 1. Store metadata item
        meta_item = {
            "PK": f"FILE#{file_id}",
            "SK": "META",
            "_type": "files",
            "id": file_id,
            "filename": filename,
            "content_type": content_type or "application/octet-stream",
            "file_size": file_size,
            "total_chunks": total_chunks,
            "created_by": created_by,
            "created_at": now_iso,
        }
        self.table.put_item(Item={k: to_dynamo_val(v) for k, v in meta_item.items() if v is not None})

        # 2. Store binary chunks
        for idx, chunk_bytes in enumerate(chunks):
            chunk_item = {
                "PK": f"FILE#{file_id}",
                "SK": f"CHUNK#{idx:05d}",
                "_type": "file_chunk",
                "file_id": file_id,
                "chunk_index": idx,
                "data": Binary(chunk_bytes),
            }
            self.table.put_item(Item=chunk_item)

        logger.info(f"Stored file '{filename}' ({file_size} bytes) in {total_chunks} DynamoDB chunk(s).")
        return sanitize_dynamo_row(meta_item)

    def get_file_blob(self, file_id: str) -> Optional[Tuple[Dict[str, Any], bytes]]:
        """
        Retrieves file metadata and reassembles all binary chunks into a complete byte string.
        """
        try:
            res = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"FILE#{file_id}")
            )
            items = res.get("Items", [])
            if not items:
                return None

            meta_item = None
            chunk_items = []
            for it in items:
                if it.get("_deleted"):
                    return None
                if it.get("SK") == "META":
                    meta_item = sanitize_dynamo_row(it)
                elif it.get("SK", "").startswith("CHUNK#"):
                    chunk_items.append(it)

            if not meta_item:
                return None

            # Reassemble chunks in order
            chunk_items.sort(key=lambda x: int(x.get("chunk_index", 0)))
            byte_segments = []
            for c in chunk_items:
                raw = c.get("data")
                if isinstance(raw, Binary):
                    byte_segments.append(raw.value)
                elif isinstance(raw, bytes):
                    byte_segments.append(raw)
                else:
                    byte_segments.append(b"")

            full_data = b"".join(byte_segments)
            return meta_item, full_data
        except Exception as e:
            logger.error(f"Error retrieving file blob {file_id}: {e}")
            return None

    def get_file_meta(self, file_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.table.get_item(Key={"PK": f"FILE#{file_id}", "SK": "META"})
            item = res.get("Item")
            if not item or item.get("_deleted"):
                res2 = self.table.get_item(Key={"PK": f"FILES#{file_id}", "SK": "META"})
                item = res2.get("Item")
            if not item or item.get("_deleted"):
                return None
            return sanitize_dynamo_row(item)
        except Exception as e:
            logger.error(f"Error getting file meta {file_id}: {e}")
            return None

    def delete_file_blob(self, file_id: str) -> bool:
        """Deletes all items for a file (metadata and all chunks)."""
        try:
            res = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"FILE#{file_id}")
            )
            items = res.get("Items", [])
            for it in items:
                pk = it["PK"]
                sk = it["SK"]
                try:
                    self.table.delete_item(Key={"PK": pk, "SK": sk})
                except Exception:
                    self.table.update_item(
                        Key={"PK": pk, "SK": sk},
                        UpdateExpression="SET #d = :t",
                        ExpressionAttributeNames={"#d": "_deleted"},
                        ExpressionAttributeValues={":t": True},
                    )
            return True
        except Exception as e:
            logger.error(f"Error deleting file blob {file_id}: {e}")
            return False

    # ------------------------------------------------------------------------
    # ACID Transaction APIs (TransactWriteItems & TransactGetItems)
    # ------------------------------------------------------------------------

    def transaction(self) -> "DynamoDBTransaction":
        """Returns a new ACID transaction builder context manager."""
        return DynamoDBTransaction(self)

    def transact_write(self, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Atomically executes up to 100 write operations (Put, Update, Delete, ConditionCheck).
        If any operation fails, the entire transaction is rolled back.
        """
        if not actions:
            return {}
        try:
            res = self.client.transact_write_items(TransactItems=actions)
            logger.info(f"Committed TransactWriteItems with {len(actions)} operation(s).")
            return res
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(f"TransactWriteItems failed [{code}]: {msg}")
            raise

    def transact_get(self, items: List[Tuple[str, Union[int, str]]]) -> List[Optional[Dict[str, Any]]]:
        """
        Atomically reads up to 100 items in a single consistent snapshot.
        items: list of (table_name, id_val)
        """
        if not items:
            return []
        serializer = TypeSerializer()
        deserializer = TypeDeserializer()
        transact_items = []
        for table_name, id_val in items:
            table_key = table_name.strip().lower()
            pk = f"{table_key.upper()}#{id_val}"
            sk = "META"
            key_raw = {"PK": pk, "SK": sk}
            key_serialized = {k: serializer.serialize(to_dynamo_val(v)) for k, v in key_raw.items()}
            transact_items.append({
                "Get": {
                    "TableName": self.table_name,
                    "Key": key_serialized
                }
            })
        try:
            res = self.client.transact_get_items(TransactItems=transact_items)
            responses = res.get("Responses", [])
            output = []
            for r in responses:
                raw_item = r.get("Item")
                if raw_item:
                    deserialized = {k: deserializer.deserialize(v) for k, v in raw_item.items()}
                    output.append(sanitize_dynamo_row(deserialized))
                else:
                    output.append(None)
            return output
        except ClientError as e:
            logger.error(f"TransactGetItems error: {e}")
            raise

    def transfer_balances_with_audit(
        self,
        from_account_id: Union[int, str],
        to_account_id: Union[int, str],
        amount: Union[int, float, Decimal],
        performed_by: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Example ACID Transaction:
        1. ConditionCheck: sender account exists and balance >= amount
        2. Update: debit sender balance
        3. ConditionCheck: receiver account exists
        4. Update: credit receiver balance
        5. Put: write immutable audit log entry
        If any step fails, all operations are atomically rolled back.
        """
        amt_dec = Decimal(str(amount))
        with self.transaction() as tx:
            # 1. Debit sender with balance condition
            tx.update(
                table_name="bank_accounts",
                id_val=from_account_id,
                update_expression="SET #bal = #bal - :amt, #up = :now",
                condition_expression="attribute_exists(PK) AND #bal >= :amt",
                expression_attribute_names={"#bal": "balance", "#up": "updated_at"},
                expression_attribute_values={
                    ":amt": amt_dec,
                    ":now": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            )

            # 2. Credit receiver
            tx.update(
                table_name="bank_accounts",
                id_val=to_account_id,
                update_expression="SET #bal = #bal + :amt, #up = :now",
                condition_expression="attribute_exists(PK)",
                expression_attribute_names={"#bal": "balance", "#up": "updated_at"},
                expression_attribute_values={
                    ":amt": amt_dec,
                    ":now": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            )

            # 3. Create Audit Log
            tx.put(
                table_name="audit_logs",
                item={
                    "user_id": performed_by,
                    "action": "TRANSFER_FUNDS",
                    "entity_type": "bank_accounts",
                    "entity_id": str(from_account_id),
                    "details": {
                        "from_account_id": str(from_account_id),
                        "to_account_id": str(to_account_id),
                        "amount": float(amt_dec),
                        "notes": notes
                    },
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            )
        return {"status": "SUCCESS", "message": f"Transferred {amount} atomically."}

    # ------------------------------------------------------------------------
    # SQL Query Interpretation Engine for DynamoDB
    # ------------------------------------------------------------------------

    def execute_query(self, query: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        """
        Executes SQL queries against the DynamoDB Single-Table backing store.
        Translates SELECT, INSERT, UPDATE, DELETE into DynamoDB operations.
        """
        clean_query = query.strip().rstrip(";")
        p = list(params) if params else []

        # Replace $1, $2 with corresponding parameter values
        q_upper = clean_query.upper()

        if q_upper.startswith("SELECT"):
            return self._handle_select(clean_query, p)
        elif q_upper.startswith("INSERT"):
            return self._handle_insert(clean_query, p)
        elif q_upper.startswith("UPDATE"):
            return self._handle_update(clean_query, p)
        elif q_upper.startswith("DELETE"):
            return self._handle_delete(clean_query, p)
        else:
            logger.warning(f"Unhandled query type: {clean_query[:40]}")
            return []

    def _replace_placeholders(self, clause: str, params: List[Any]) -> str:
        res = clause
        # Match $1, $2, etc.
        for idx in range(len(params), 0, -1):
            val = params[idx - 1]
            token = f"${idx}"
            # Type casts like $1::uuid or $1::int[] or $1::jsonb
            res = re.sub(rf"\${idx}::[a-zA-Z_0-9]+(\[\])?", token, res)
        return res

    def _extract_job_id_from_where(self, where_clause: str, params: List[Any]) -> Optional[Any]:
        """Extracts job_id value if present in WHERE conditions."""
        if not where_clause:
            return None
        m = re.search(r"(?:[a-zA-Z_0-9]+\.)?job_id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
        if m:
            idx = int(m.group(1)) - 1
            if idx < len(params):
                val = params[idx]
                if isinstance(val, (list, tuple)) and len(val) == 1:
                    return val[0]
                return val
        m2 = re.search(r"(?:[a-zA-Z_0-9]+\.)?job_id\s*=\s*([0-9]+)", where_clause, re.IGNORECASE)
        if m2:
            return int(m2.group(1))
        m3 = re.search(r"(?:[a-zA-Z_0-9]+\.)?job_id\s*=\s*ANY\s*\(\s*\$([0-9]+)", where_clause, re.IGNORECASE)
        if m3:
            idx = int(m3.group(1)) - 1
            if idx < len(params):
                return params[idx]
        return None

    def _handle_select(self, query: str, params: List[Any]) -> List[Dict[str, Any]]:
        # Check for COUNT(*)
        is_count = bool(re.search(r"SELECT\s+COUNT\s*\(\s*\*?\s*\)", query, re.IGNORECASE))

        # Extract table name: FROM <table>
        from_match = re.search(r"FROM\s+([a-zA-Z_0-9]+)", query, re.IGNORECASE)
        if not from_match:
            return []
        table_name = from_match.group(1).lower()

        # Handle special file queries
        if table_name == "files":
            # Check if querying a single file by id
            id_match = re.search(r"WHERE\s+id\s*=\s*\$1", query, re.IGNORECASE)
            if id_match and params:
                file_id = str(params[0])
                if "data" in query.lower():
                    blob_res = self.get_file_blob(file_id)
                    if not blob_res:
                        return []
                    meta, data_bytes = blob_res
                    meta["data"] = data_bytes
                    return [meta]
                else:
                    meta = self.get_file_meta(file_id)
                    return [meta] if meta else []

        # Extract WHERE clause
        where_clause = ""
        where_match = re.search(r"WHERE\s+(.*?)(?:ORDER\s+BY|LIMIT|GROUP\s+BY|$)", query, re.IGNORECASE | re.DOTALL)
        if where_match:
            where_clause = where_match.group(1).strip()

        # Extract ORDER BY clause
        order_by_col = None
        order_dir = "ASC"
        order_match = re.search(r"ORDER\s+BY\s+([a-zA-Z_0-9]+)(?:\s+(ASC|DESC))?", query, re.IGNORECASE)
        if order_match:
            order_by_col = order_match.group(1)
            if order_match.group(2):
                order_dir = order_match.group(2).upper()

        # Extract LIMIT & OFFSET
        limit_val = None
        offset_val = 0
        limit_match = re.search(r"LIMIT\s+(\$[0-9]+|\d+)", query, re.IGNORECASE)
        if limit_match:
            l_tok = limit_match.group(1)
            if l_tok.startswith("$"):
                idx = int(l_tok[1:]) - 1
                limit_val = int(params[idx]) if idx < len(params) else None
            else:
                limit_val = int(l_tok)

        offset_match = re.search(r"OFFSET\s+(\$[0-9]+|\d+)", query, re.IGNORECASE)
        if offset_match:
            o_tok = offset_match.group(1)
            if o_tok.startswith("$"):
                idx = int(o_tok[1:]) - 1
                offset_val = int(params[idx]) if idx < len(params) else 0
            else:
                offset_val = int(o_tok)

        # Embedded sub-entities of jobs (one document per job architecture)
        if table_name in ("job_workflow_logs", "job_to_technicians", "job_tests", "material_inward_register"):
            extracted_job_id = self._extract_job_id_from_where(where_clause, params)
            if extracted_job_id is not None:
                if isinstance(extracted_job_id, (list, tuple, set)):
                    target_jids = [str(x) for x in extracted_job_id]
                    all_jobs, _ = self.list_entities("jobs")
                    matched_jobs = [j for j in all_jobs if str(j.get("id")) in target_jids]
                else:
                    target_job = self.get_entity("jobs", extracted_job_id)
                    matched_jobs = [target_job] if target_job else []

                items = []
                for j in matched_jobs:
                    if table_name == "job_workflow_logs":
                        items.extend(list(j.get("logs") or j.get("job_workflow_logs") or []))
                    elif table_name == "job_to_technicians":
                        items.extend(list(j.get("technicians") or j.get("job_to_technicians") or []))
                    elif table_name == "job_tests":
                        items.extend(list(j.get("tests") or j.get("job_tests") or []))
                    elif table_name == "material_inward_register":
                        items.extend(list(j.get("materials") or j.get("material_inward_register") or []))
            else:
                # No job_id filter in WHERE; collect from all jobs
                all_jobs, _ = self.list_entities("jobs")
                items = []
                for j in all_jobs:
                    if table_name == "job_workflow_logs":
                        items.extend(list(j.get("logs") or j.get("job_workflow_logs") or []))
                    elif table_name == "job_to_technicians":
                        items.extend(list(j.get("technicians") or j.get("job_to_technicians") or []))
                    elif table_name == "job_tests":
                        items.extend(list(j.get("tests") or j.get("job_tests") or []))
                    elif table_name == "material_inward_register":
                        items.extend(list(j.get("materials") or j.get("material_inward_register") or []))
                if table_name == "material_inward_register":
                    standalone, _ = self.list_entities("material_inward_register")
                    items.extend([s for s in standalone if not s.get("job_id")])
        else:
            # Quick path for direct single ID lookup: WHERE id = $1
            id_eq_match = re.match(r"^id\s*=\s*\$([0-9]+)$", where_clause.strip(), re.IGNORECASE)
            if id_eq_match:
                p_idx = int(id_eq_match.group(1)) - 1
                if p_idx < len(params):
                    item = self.get_entity(table_name, params[p_idx])
                    if is_count:
                        return [{"count": 1 if item else 0}]
                    return [item] if item else []

            # Scan all items for table
            items, _ = self.list_entities(table_name)

        # Filter items
        if where_clause:
            items = [it for it in items if self._eval_where(it, where_clause, params)]

        if is_count:
            return [{"count": len(items)}]

        # Sort
        if order_by_col:
            is_desc = (order_dir == "DESC")
            items.sort(key=lambda x: (x.get(order_by_col) is not None, x.get(order_by_col)), reverse=is_desc)

        # Paginate
        if limit_val is not None:
            items = items[offset_val : offset_val + limit_val]

        return items

    def _eval_where(self, item: Dict[str, Any], where_clause: str, params: List[Any]) -> bool:
        """Evaluates WHERE conditions for an item."""
        # Split on AND
        conditions = re.split(r"\s+AND\s+", where_clause, flags=re.IGNORECASE)
        for cond in conditions:
            cond = cond.strip()
            if not cond:
                continue

            # col = ANY($1)
            any_match = re.search(r"([a-zA-Z_0-9]+)\s*=\s*ANY\s*\(\s*\$([0-9]+)", cond, re.IGNORECASE)
            if any_match:
                col = any_match.group(1)
                idx = int(any_match.group(2)) - 1
                allowed = params[idx] if idx < len(params) else []
                if not isinstance(allowed, (list, tuple, set)):
                    allowed = [allowed]
                val = item.get(col)
                if val not in allowed and str(val) not in [str(x) for x in allowed]:
                    return False
                continue

            # col ILIKE $1
            ilike_match = re.search(r"([a-zA-Z_0-9]+)\s+ILIKE\s+\$([0-9]+)", cond, re.IGNORECASE)
            if ilike_match:
                col = ilike_match.group(1)
                idx = int(ilike_match.group(2)) - 1
                pattern = str(params[idx]).strip("%").lower() if idx < len(params) else ""
                val_str = str(item.get(col) or "").lower()
                if pattern not in val_str:
                    return False
                continue

            # col = $1
            eq_match = re.search(r"([a-zA-Z_0-9]+)\s*=\s*\$([0-9]+)", cond, re.IGNORECASE)
            if eq_match:
                col = eq_match.group(1)
                idx = int(eq_match.group(2)) - 1
                target = params[idx] if idx < len(params) else None
                val = item.get(col)
                if str(val) != str(target) and val != target:
                    return False
                continue

            # col IS NULL
            is_null_match = re.search(r"([a-zA-Z_0-9]+)\s+IS\s+NULL", cond, re.IGNORECASE)
            if is_null_match:
                col = is_null_match.group(1)
                if item.get(col) is not None:
                    return False
                continue

            # col IS NOT NULL
            is_not_null_match = re.search(r"([a-zA-Z_0-9]+)\s+IS\s+NOT\s+NULL", cond, re.IGNORECASE)
            if is_not_null_match:
                col = is_not_null_match.group(1)
                if item.get(col) is None:
                    return False
                continue

            # col = literal (e.g. is_active = true)
            lit_eq_match = re.search(r"([a-zA-Z_0-9]+)\s*=\s*([a-zA-Z_0-9'\"]+)", cond, re.IGNORECASE)
            if lit_eq_match:
                col = lit_eq_match.group(1)
                lit_val = lit_eq_match.group(2).strip("'\"").lower()
                val = item.get(col)
                if lit_val in ("true", "t", "1"):
                    if not bool(val):
                        return False
                elif lit_val in ("false", "f", "0"):
                    if bool(val):
                        return False
                else:
                    if str(val).lower() != lit_val:
                        return False
                continue

        return True

    def _handle_insert(self, query: str, params: List[Any]) -> List[Dict[str, Any]]:
        # INSERT INTO <table> (<cols>) VALUES (<placeholders>) RETURNING *
        match = re.search(r"INSERT\s+INTO\s+([a-zA-Z_0-9]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)", query, re.IGNORECASE | re.DOTALL)
        if not match:
            return []

        table_name = match.group(1).lower()
        cols = [c.strip() for c in match.group(2).split(",")]
        placeholders = [p.strip() for p in match.group(3).split(",")]

        item = {}
        for col, ph in zip(cols, placeholders):
            # Check for $n
            p_match = re.search(r"\$([0-9]+)", ph)
            if p_match:
                idx = int(p_match.group(1)) - 1
                val = params[idx] if idx < len(params) else None
                item[col] = val
            elif "NOW()" in ph.upper():
                item[col] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            else:
                item[col] = ph.strip("'\"")

        # Special handling for files table
        if table_name == "files" and "data" in item:
            data_bytes = item.pop("data") or b""
            if not isinstance(data_bytes, bytes):
                data_bytes = bytes(data_bytes)
            file_id = str(item.get("id") or uuid.uuid4())
            res = self.put_file_blob(
                file_id=file_id,
                filename=item.get("filename", "file"),
                content_type=item.get("content_type"),
                data=data_bytes,
                created_by=item.get("created_by"),
            )
            return [res]

        # Embedded sub-entities of jobs (one document per job architecture)
        if table_name in ("job_workflow_logs", "job_to_technicians", "job_tests", "material_inward_register"):
            job_id = item.get("job_id")
            if job_id is not None:
                job = self.get_entity("jobs", job_id)
                if job:
                    if not item.get("id"):
                        item["id"] = self.get_next_id(table_name)
                    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    if not item.get("created_at"):
                        item["created_at"] = now_iso
                    if not item.get("updated_at"):
                        item["updated_at"] = now_iso

                    if table_name == "job_workflow_logs":
                        logs = list(job.get("logs") or [])
                        logs.append(item)
                        job["logs"] = logs
                        job["workflow_logs"] = logs
                        job["job_workflow_logs"] = logs
                    elif table_name == "job_to_technicians":
                        techs = list(job.get("technicians") or [])
                        if not any(str(t.get("technician_id")) == str(item.get("technician_id")) for t in techs):
                            techs.append(item)
                        job["technicians"] = techs
                        job["job_to_technicians"] = techs
                        job["technician_assignments"] = techs
                    elif table_name == "job_tests":
                        tests = list(job.get("tests") or [])
                        tests.append(item)
                        job["tests"] = tests
                        job["job_tests"] = tests
                    elif table_name == "material_inward_register":
                        mats = list(job.get("materials") or [])
                        mats.append(item)
                        job["materials"] = mats
                        job["material_inward_register"] = mats
                        job["materials_received"] = mats

                    self.put_entity("jobs", job)
                    return [item]

        created = self.put_entity(table_name, item)
        return [created]

    def _handle_update(self, query: str, params: List[Any]) -> List[Dict[str, Any]]:
        # UPDATE <table> SET <assignments> WHERE <conditions> RETURNING *
        match = re.search(r"UPDATE\s+([a-zA-Z_0-9]+)\s+SET\s+(.*?)\s+WHERE\s+(.*?)(?:RETURNING|$)", query, re.IGNORECASE | re.DOTALL)
        if not match:
            return []

        table_name = match.group(1).lower()
        set_clause = match.group(2).strip()
        where_clause = match.group(3).strip()

        # Find id from WHERE clause
        id_match = re.search(r"id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
        if not id_match:
            return []

        id_idx = int(id_match.group(1)) - 1
        id_val = params[id_idx] if id_idx < len(params) else None
        if id_val is None:
            return []

        # Parse assignments
        updates = {}
        assignments = [a.strip() for a in set_clause.split(",")]
        for assign in assignments:
            parts = assign.split("=", 1)
            if len(parts) != 2:
                continue
            col = parts[0].strip()
            val_expr = parts[1].strip()
            p_match = re.search(r"\$([0-9]+)", val_expr)
            if p_match:
                idx = int(p_match.group(1)) - 1
                val = params[idx] if idx < len(params) else None
                updates[col] = val
            elif "NOW()" in val_expr.upper():
                updates[col] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            else:
                updates[col] = val_expr.strip("'\"")

        # Embedded sub-entities of jobs
        if table_name in ("job_tests", "material_inward_register"):
            all_jobs, _ = self.list_entities("jobs")
            for j in all_jobs:
                if table_name == "job_tests":
                    tests = list(j.get("tests") or [])
                    for idx, t in enumerate(tests):
                        if str(t.get("id")) == str(id_val):
                            t.update(updates)
                            t["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                            tests[idx] = t
                            j["tests"] = tests
                            j["job_tests"] = tests
                            self.put_entity("jobs", j)
                            return [t]
                elif table_name == "material_inward_register":
                    mats = list(j.get("materials") or [])
                    for idx, m in enumerate(mats):
                        if str(m.get("id")) == str(id_val):
                            m.update(updates)
                            m["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                            mats[idx] = m
                            j["materials"] = mats
                            j["material_inward_register"] = mats
                            j["materials_received"] = mats
                            self.put_entity("jobs", j)
                            return [m]

        updated = self.update_entity(table_name, id_val, updates)
        return [updated] if updated else []

    def _handle_delete(self, query: str, params: List[Any]) -> List[Dict[str, Any]]:
        # DELETE FROM <table> WHERE <conditions>
        match = re.search(r"DELETE\s+FROM\s+([a-zA-Z_0-9]+)\s+WHERE\s+(.*)", query, re.IGNORECASE | re.DOTALL)
        if not match:
            return []

        table_name = match.group(1).lower()
        where_clause = match.group(2).strip()

        # Handle files
        if table_name == "files":
            id_match = re.search(r"id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
            if id_match:
                idx = int(id_match.group(1)) - 1
                file_id = str(params[idx]) if idx < len(params) else None
                if file_id:
                    self.delete_file_blob(file_id)
                    return [{"id": file_id}]

        # Embedded sub-entities of jobs
        if table_name in ("job_workflow_logs", "job_to_technicians", "job_tests", "material_inward_register"):
            extracted_job_id = self._extract_job_id_from_where(where_clause, params)
            if extracted_job_id is not None:
                job = self.get_entity("jobs", extracted_job_id)
                if job:
                    if table_name == "job_tests":
                        job["tests"] = []
                        job["job_tests"] = []
                    elif table_name == "job_to_technicians":
                        t_match = re.search(r"technician_id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
                        if t_match:
                            t_idx = int(t_match.group(1)) - 1
                            t_val = params[t_idx] if t_idx < len(params) else None
                            techs = [t for t in (job.get("technicians") or []) if str(t.get("technician_id")) != str(t_val)]
                        else:
                            techs = []
                        job["technicians"] = techs
                        job["job_to_technicians"] = techs
                        job["technician_assignments"] = techs
                    elif table_name == "material_inward_register":
                        job["materials"] = []
                        job["material_inward_register"] = []
                        job["materials_received"] = []
                    self.put_entity("jobs", job)
                    return []
            else:
                id_match = re.search(r"id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
                if id_match:
                    idx = int(id_match.group(1)) - 1
                    target_id = params[idx] if idx < len(params) else None
                    if target_id is not None:
                        all_jobs, _ = self.list_entities("jobs")
                        for j in all_jobs:
                            if table_name == "job_tests":
                                orig_len = len(j.get("tests") or [])
                                tests = [t for t in (j.get("tests") or []) if str(t.get("id")) != str(target_id)]
                                if len(tests) != orig_len:
                                    j["tests"] = tests
                                    j["job_tests"] = tests
                                    self.put_entity("jobs", j)
                                    return [{"id": target_id}]
                            elif table_name == "material_inward_register":
                                orig_len = len(j.get("materials") or [])
                                mats = [m for m in (j.get("materials") or []) if str(m.get("id")) != str(target_id)]
                                if len(mats) != orig_len:
                                    j["materials"] = mats
                                    j["material_inward_register"] = mats
                                    j["materials_received"] = mats
                                    self.put_entity("jobs", j)
                                    return [{"id": target_id}]

        # Single ID match
        id_match = re.search(r"id\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
        if id_match:
            idx = int(id_match.group(1)) - 1
            id_val = params[idx] if idx < len(params) else None
            if id_val is not None:
                self.delete_entity(table_name, id_val)
                return [{"id": id_val}]

        # Foreign key deletes (e.g. ticket_id = $1 or job_id = $1)
        fk_match = re.search(r"([a-zA-Z_0-9]+)\s*=\s*\$([0-9]+)", where_clause, re.IGNORECASE)
        if fk_match:
            col = fk_match.group(1)
            idx = int(fk_match.group(2)) - 1
            fk_val = params[idx] if idx < len(params) else None
            items, _ = self.list_entities(table_name)
            deleted_ids = []
            for it in items:
                if str(it.get(col)) == str(fk_val):
                    self.delete_entity(table_name, it["id"])
                    deleted_ids.append(it["id"])
            return [{"id": d} for d in deleted_ids]

        return []

    # ------------------------------------------------------------------------
    # Initial Seeding for Easy-LIMS
    # ------------------------------------------------------------------------

    def seed_initial_data(self):
        """Seed default email templates and default admin user if not present."""
        templates, count = self.list_entities("email_templates")
        if count == 0:
            default_templates = [
                {
                    "name": "Test Report Released Notice",
                    "subject": "Laboratory Test Report Available - {{client_name}}",
                    "body": "<h2>Laboratory Test Report Dispatch</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>We are pleased to inform you that the requested laboratory testing for your recent job sample has been completed and verified by our quality engineers.</p><p>You can access your verified report directly through your client portal or by contacting your account representative.</p><hr /><p>Best regards,<br /><strong>{{site_name}} Quality Laboratory Team</strong></p>",
                },
                {
                    "name": "Work Order & Sample Receipt Confirmation",
                    "subject": "Work Order & Sample Receipt Confirmation - {{client_name}}",
                    "body": "<h2>Sample Reception & Work Order Confirmation</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>Thank you for choosing <strong>{{site_name}}</strong>. We have officially logged your work order and material samples into our LIMS testing workflow.</p><p>Our technicians have begun sample preparation and testing per the required standards.</p><hr /><p>Regards,<br /><strong>Material Receiving Department</strong></p>",
                },
                {
                    "name": "General Communication Notice",
                    "subject": "Important Update from {{site_name}}",
                    "body": "<h2>Important Customer Update</h2><p>Dear Valued Partner,</p><p>We are writing to share an important announcement regarding our laboratory operations and technical testing services.</p><p>Please review the details below and reach out to our support team if you have any questions.</p><hr /><p>Sincerely,<br /><strong>Management Team - {{site_name}}</strong></p>",
                },
            ]
            for t in default_templates:
                self.put_entity("email_templates", t)
            logger.info("Seeded default email templates into DynamoDB.")

        # Seed default admin user if users table empty
        users, u_count = self.list_entities("users")
        if u_count == 0:
            admin_user = {
                "username": "admin",
                "password": "adminpassword",
                "email": "admin@easylims.com",
                "role": "admin",
                "name": "Administrator",
                "is_active": True,
            }
            self.put_entity("users", admin_user)
            logger.info("Seeded default admin user into DynamoDB.")


# ----------------------------------------------------------------------------
# ACID Transaction Builder (TransactWriteItems)
# ----------------------------------------------------------------------------

class DynamoDBTransaction:
    """
    ACID Transaction builder using AWS DynamoDB TransactWriteItems.
    Atomically performs multiple Put, Update, Delete, and ConditionCheck operations.
    If any operation fails (e.g. conditional check fails), the entire transaction rolls back.
    """
    def __init__(self, service: DynamoDBService):
        self.service = service
        self.serializer = TypeSerializer()
        self.actions: List[Dict[str, Any]] = []

    def _serialize_val(self, val: Any) -> Any:
        return self.serializer.serialize(to_dynamo_val(val))

    def _serialize_dict(self, d: Dict[str, Any]) -> Dict[str, Any]:
        return {k: self._serialize_val(v) for k, v in d.items()}

    def put(
        self,
        table_name: str,
        item: Dict[str, Any],
        condition_expression: Optional[str] = None,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
    ) -> "DynamoDBTransaction":
        table_key = table_name.strip().lower()
        item_copy = dict(item)
        if "id" not in item_copy or item_copy["id"] is None:
            item_copy["id"] = self.service.get_next_id(table_key)
        id_val = item_copy["id"]
        pk = f"{table_key.upper()}#{id_val}"
        sk = "META"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if "created_at" not in item_copy:
            item_copy["created_at"] = now_iso
        if "updated_at" not in item_copy:
            item_copy["updated_at"] = now_iso

        dynamo_item = {k: v for k, v in item_copy.items() if v is not None}
        dynamo_item["PK"] = pk
        dynamo_item["SK"] = sk
        dynamo_item["_type"] = table_key

        put_action: Dict[str, Any] = {
            "TableName": self.service.table_name,
            "Item": self._serialize_dict(dynamo_item),
        }
        if condition_expression:
            put_action["ConditionExpression"] = condition_expression
        if expression_attribute_names:
            put_action["ExpressionAttributeNames"] = expression_attribute_names
        if expression_attribute_values:
            put_action["ExpressionAttributeValues"] = self._serialize_dict(expression_attribute_values)

        self.actions.append({"Put": put_action})
        return self

    def update(
        self,
        table_name: str,
        id_val: Union[int, str],
        update_expression: str,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        condition_expression: Optional[str] = None,
    ) -> "DynamoDBTransaction":
        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        sk = "META"

        update_action: Dict[str, Any] = {
            "TableName": self.service.table_name,
            "Key": self._serialize_dict({"PK": pk, "SK": sk}),
            "UpdateExpression": update_expression,
        }
        if expression_attribute_values:
            update_action["ExpressionAttributeValues"] = self._serialize_dict(expression_attribute_values)
        if expression_attribute_names:
            update_action["ExpressionAttributeNames"] = expression_attribute_names
        if condition_expression:
            update_action["ConditionExpression"] = condition_expression

        self.actions.append({"Update": update_action})
        return self

    def delete(
        self,
        table_name: str,
        id_val: Union[int, str],
        condition_expression: Optional[str] = None,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
    ) -> "DynamoDBTransaction":
        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        sk = "META"

        del_action: Dict[str, Any] = {
            "TableName": self.service.table_name,
            "Key": self._serialize_dict({"PK": pk, "SK": sk}),
        }
        if condition_expression:
            del_action["ConditionExpression"] = condition_expression
        if expression_attribute_names:
            del_action["ExpressionAttributeNames"] = expression_attribute_names
        if expression_attribute_values:
            del_action["ExpressionAttributeValues"] = self._serialize_dict(expression_attribute_values)

        self.actions.append({"Delete": del_action})
        return self

    def condition_check(
        self,
        table_name: str,
        id_val: Union[int, str],
        condition_expression: str,
        expression_attribute_names: Optional[Dict[str, str]] = None,
        expression_attribute_values: Optional[Dict[str, Any]] = None,
    ) -> "DynamoDBTransaction":
        table_key = table_name.strip().lower()
        pk = f"{table_key.upper()}#{id_val}"
        sk = "META"

        check_action: Dict[str, Any] = {
            "TableName": self.service.table_name,
            "Key": self._serialize_dict({"PK": pk, "SK": sk}),
            "ConditionExpression": condition_expression,
        }
        if expression_attribute_names:
            check_action["ExpressionAttributeNames"] = expression_attribute_names
        if expression_attribute_values:
            check_action["ExpressionAttributeValues"] = self._serialize_dict(expression_attribute_values)

        self.actions.append({"ConditionCheck": check_action})
        return self

    def commit(self) -> Dict[str, Any]:
        if not self.actions:
            return {}
        try:
            res = self.service.client.transact_write_items(TransactItems=self.actions)
            logger.info(f"Committed ACID transaction with {len(self.actions)} action(s).")
            return res
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            msg = e.response.get("Error", {}).get("Message", str(e))
            logger.error(f"Transaction failed [{code}]: {msg}")
            raise

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()


# ----------------------------------------------------------------------------
# Connection & Pool Emulation for FastAPI
# ----------------------------------------------------------------------------

class DynamoDBConnection:
    def __init__(self, service: DynamoDBService):
        self.service = service

    async def fetch(self, query: str, *params) -> List[Dict[str, Any]]:
        return await asyncio.to_thread(self.service.execute_query, query, list(params))

    async def fetchrow(self, query: str, *params) -> Optional[Dict[str, Any]]:
        rows = await asyncio.to_thread(self.service.execute_query, query, list(params))
        return rows[0] if rows else None

    async def fetchval(self, query: str, *params) -> Any:
        rows = await asyncio.to_thread(self.service.execute_query, query, list(params))
        if rows:
            first_row = rows[0]
            if isinstance(first_row, dict) and first_row:
                return next(iter(first_row.values()))
        return None

    async def execute(self, query: str, *params) -> str:
        await asyncio.to_thread(self.service.execute_query, query, list(params))
        return "SUCCESS"

    async def prepare(self, query: str):
        class PreparedStatementMock:
            def __init__(self, conn, q):
                self.conn = conn
                self.q = q
            def get_parameters(self):
                # Return dummy parameter type list matching $1, $2, etc.
                matches = re.findall(r"\$([0-9]+)", self.q)
                count = max([int(m) for m in matches]) if matches else 0
                class DummyType:
                    name = "text"
                return [DummyType() for _ in range(count)]
            async def fetch(self, *coerced_params):
                return await self.conn.fetch(self.q, *coerced_params)
        return PreparedStatementMock(self, query)


class DynamoDBConnectionPool:
    def __init__(self, service: DynamoDBService):
        self.service = service
        self._closed = False

    def acquire(self):
        service = self.service
        class ConnectionContext:
            async def __aenter__(self):
                return DynamoDBConnection(service)
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
        return ConnectionContext()

    async def close(self):
        self._closed = True


# Global singleton instance
_dynamo_service: Optional[DynamoDBService] = None
_dynamo_pool: Optional[DynamoDBConnectionPool] = None


def get_dynamo_service() -> DynamoDBService:
    global _dynamo_service
    if _dynamo_service is None:
        _dynamo_service = DynamoDBService()
    return _dynamo_service


def get_dynamo_pool() -> DynamoDBConnectionPool:
    global _dynamo_pool
    if _dynamo_pool is None:
        _dynamo_pool = DynamoDBConnectionPool(get_dynamo_service())
    return _dynamo_pool
