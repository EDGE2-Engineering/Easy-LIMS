#!/usr/bin/env python3
"""
=============================================================================
Easy-LIMS: PostgreSQL to AWS DynamoDB Full Data Migration Tool
=============================================================================
Extracts all tables, schemas, relations, JSONB, timestamps, and binary files/PDFs
from PostgreSQL and migrates them cleanly into the AWS DynamoDB Single-Table schema.

Features:
- Auto-discovery of all public tables and their primary keys from PostgreSQL.
- Type conversions:
    * Decimal / Numeric / Float -> DynamoDB Decimal
    * DateTime / Date / Time -> ISO 8601 Strings
    * UUID -> Canonical String representation
    * JSON / JSONB -> Native DynamoDB Map / List structures
    * Bytea / Blobs / Files -> Native DynamoDB Binary (boto3.dynamodb.types.Binary)
- Transparent chunking for files exceeding 350 KB into sequential chunk items
  (PK = FILE#<id>, SK = CHUNK#<index>), exactly matching Easy-LIMS blob storage.
- Auto-updates atomic counters (PK = COUNTER, SK = <table>) with max(id) so
  sequential auto-incrementing IDs continue seamlessly without collisions.
- Optional table wipe/clear step before migration (via DYNAMODB_CLEAR_BEFORE_MIGRATION=true
  or --clear-before-migration / --wipe flag) to start with a clean table.
- High-performance batch writing with automatic backoff and retry handling.
- Flexible credentials from CLI arguments, environment variables, or .env files.

Usage:
    # 1. Using environment variables or .env file:
    python scripts/migrate_pg_to_dynamo.py

    # 2. Clear all existing DynamoDB items before migrating:
    python scripts/migrate_pg_to_dynamo.py --clear-before-migration
    # or set in .env: DYNAMODB_CLEAR_BEFORE_MIGRATION=true

    # 3. Specifying explicit connection URL and credentials:
    python scripts/migrate_pg_to_dynamo.py \
        --pg-url "postgresql://postgres:pass@localhost:5432/postgres" \
        --table-name "easy-lims" \
        --region "us-east-1"

    # 4. Dry-run (audit only, no writes or deletions to DynamoDB):
    python scripts/migrate_pg_to_dynamo.py --dry-run
=============================================================================
"""

import os
import sys
import argparse
import datetime
import logging
import uuid
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Set

import boto3
from boto3.dynamodb.types import Binary
from botocore.exceptions import ClientError
from dotenv import load_dotenv

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: 'psycopg2' is required for PostgreSQL extraction.")
    print("Run: pip install psycopg2-binary")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migration")

# Chunk size for storing large file blobs in DynamoDB items (under 400KB item limit)
BLOB_CHUNK_SIZE = 350 * 1024  # 350 KB


def to_dynamo_attribute(val: Any) -> Any:
    """Recursively converts Python / Postgres values into DynamoDB-safe values."""
    if val is None:
        return None
    if isinstance(val, (float, int)):
        if isinstance(val, float):
            return Decimal(str(val))
        return Decimal(val)
    if isinstance(val, Decimal):
        return val
    if isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, (bytes, bytearray, memoryview)):
        return Binary(bytes(val))
    if isinstance(val, list):
        converted_list = [to_dynamo_attribute(x) for x in val]
        return [x for x in converted_list if x is not None]
    if isinstance(val, dict):
        return {k: to_dynamo_attribute(v) for k, v in val.items() if v is not None}
    return val


class PostgresToDynamoMigrator:
    def __init__(
        self,
        pg_url: str,
        dynamo_table_name: str,
        aws_region: str,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        dynamo_endpoint_url: Optional[str] = None,
        batch_size: int = 500,
        dry_run: bool = False,
        clear_before_migration: bool = False,
    ):
        self.pg_url = pg_url
        self.dynamo_table_name = dynamo_table_name
        self.aws_region = aws_region
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.clear_before_migration = clear_before_migration

        logger.info(f"Target DynamoDB Table: '{self.dynamo_table_name}' in region '{self.aws_region}'")
        if self.dry_run:
            logger.warning("DRY-RUN MODE ENABLED: No records will be written to DynamoDB.")
        if self.clear_before_migration:
            logger.warning(f"TABLE CLEAR ENABLED: All existing entries in '{self.dynamo_table_name}' will be deleted before migration.")

        # Initialize DynamoDB client & resource
        session_kwargs: Dict[str, Any] = {"region_name": self.aws_region}
        if aws_access_key_id and aws_secret_access_key:
            session_kwargs["aws_access_key_id"] = aws_access_key_id
            session_kwargs["aws_secret_access_key"] = aws_secret_access_key

        self.session = boto3.Session(**session_kwargs)
        resource_kwargs: Dict[str, Any] = {}
        if dynamo_endpoint_url:
            resource_kwargs["endpoint_url"] = dynamo_endpoint_url

        self.dynamodb = self.session.resource("dynamodb", **resource_kwargs)
        self.table = self.dynamodb.Table(self.dynamo_table_name)

        # Connect to Postgres
        logger.info("Connecting to PostgreSQL source...")
        self.pg_conn = psycopg2.connect(self.pg_url, connect_timeout=15)
        self.pg_conn.autocommit = True
        logger.info("Connected successfully to PostgreSQL database.")

    def clear_table(self) -> int:
        """
        Deletes all existing entries in DynamoDB before starting the migration.
        Scans the table for all Partition Keys (PK) and Sort Keys (SK) and deletes them in batches.
        """
        if self.dry_run:
            logger.warning("[DRY-RUN] Table wipe skipped in dry-run mode.")
            return 0

        logger.warning(f"Clearing all existing items from DynamoDB table '{self.dynamo_table_name}'...")
        deleted_count = 0
        scan_kwargs: Dict[str, Any] = {
            "ProjectionExpression": "#pk, #sk",
            "ExpressionAttributeNames": {"#pk": "PK", "#sk": "SK"},
        }

        while True:
            response = self.table.scan(**scan_kwargs)
            items = response.get("Items", [])
            if items:
                with self.table.batch_writer() as batch:
                    for item in items:
                        if "PK" in item and "SK" in item:
                            batch.delete_item(
                                Key={
                                    "PK": item["PK"],
                                    "SK": item["SK"],
                                }
                            )
                            deleted_count += 1
                logger.info(f"  [Wipe] Deleted {deleted_count} items from '{self.dynamo_table_name}' so far...")

            lek = response.get("LastEvaluatedKey")
            if not lek:
                break
            scan_kwargs["ExclusiveStartKey"] = lek

        logger.info(f"Successfully cleared table '{self.dynamo_table_name}'. Total items deleted: {deleted_count}")
        return deleted_count

    def get_public_tables(self, filter_tables: Optional[List[str]] = None) -> List[str]:
        """Discovers all public tables in the PostgreSQL database."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [r[0] for r in cur.fetchall()]

        if filter_tables:
            tables = [t for t in tables if t.lower() in [f.lower() for f in filter_tables]]
        return tables

    def get_table_primary_keys(self) -> Dict[str, List[str]]:
        """Maps each table to its list of primary key columns."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                SELECT tc.table_name, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.ordinal_position;
            """)
            pks: Dict[str, List[str]] = {}
            for t, col in cur.fetchall():
                pks.setdefault(t, []).append(col)
            return pks

    def migrate_table(self, table_name: str, pk_cols: List[str]) -> Tuple[int, int]:
        """
        Migrates all rows from a single PostgreSQL table to DynamoDB.
        Returns (rows_migrated, chunk_items_created).
        """
        table_key = table_name.strip().lower()
        logger.info(f"--- Migrating table '{table_name}' (PK columns: {pk_cols or ['<none>']}) ---")

        rows_count = 0
        chunks_count = 0
        max_numeric_id = 0

        with self.pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f'SELECT * FROM "{table_name}";')

            if self.dry_run:
                for row in cur:
                    rows_count += 1
                logger.info(f"[Dry-Run] Table '{table_name}': {rows_count} row(s) read.")
                return rows_count, 0

            with self.table.batch_writer() as batch:
                for row in cur:
                    rows_count += 1
                    row_dict = dict(row)

                    # Determine Partition Key (PK) & Sort Key (SK)
                    if pk_cols:
                        if len(pk_cols) == 1:
                            raw_id = row_dict.get(pk_cols[0])
                        else:
                            raw_id = "_".join(str(row_dict.get(c, "")) for c in pk_cols)
                    else:
                        raw_id = row_dict.get("id") or str(uuid.uuid4())

                    # Track max integer ID for atomic counter update
                    if "id" in row_dict and isinstance(row_dict["id"], int):
                        if row_dict["id"] > max_numeric_id:
                            max_numeric_id = row_dict["id"]

                    pk = f"{table_key.upper()}#{raw_id}"
                    sk = "META"

                    # Special handling for files table with binary chunking
                    if table_key == "files" and "data" in row_dict and row_dict["data"] is not None:
                        file_data = bytes(row_dict.pop("data"))
                        file_size = len(file_data)
                        file_id = str(raw_id)

                        # Chunk binary data if present
                        chunks = []
                        if file_size == 0:
                            chunks = [b""]
                        else:
                            for offset in range(0, file_size, BLOB_CHUNK_SIZE):
                                chunks.append(file_data[offset : offset + BLOB_CHUNK_SIZE])

                        total_chunks = len(chunks)

                        # 1. Main file metadata item
                        dynamo_item = {
                            k: to_dynamo_attribute(v)
                            for k, v in row_dict.items()
                            if v is not None
                        }
                        dynamo_item["PK"] = f"FILE#{file_id}"
                        dynamo_item["SK"] = "META"
                        dynamo_item["_type"] = "files"
                        dynamo_item["file_size"] = file_size
                        dynamo_item["total_chunks"] = total_chunks
                        dynamo_item["GSI1PK"] = "ENTITY#files"
                        dynamo_item["GSI1SK"] = str(dynamo_item.get("created_at") or f"FILE#{file_id}")
                        batch.put_item(Item=dynamo_item)

                        # 2. Chunk items
                        for idx, chunk_bytes in enumerate(chunks):
                            chunk_item = {
                                "PK": f"FILE#{file_id}",
                                "SK": f"CHUNK#{idx:05d}",
                                "_type": "file_chunk",
                                "file_id": file_id,
                                "chunk_index": idx,
                                "data": Binary(chunk_bytes),
                            }
                            batch.put_item(Item=chunk_item)
                            chunks_count += 1
                    else:
                        # Standard entity row
                        dynamo_item = {
                            k: to_dynamo_attribute(v)
                            for k, v in row_dict.items()
                            if v is not None
                        }
                        dynamo_item["PK"] = pk
                        dynamo_item["SK"] = sk
                        dynamo_item["_type"] = table_key
                        dynamo_item["GSI1PK"] = f"ENTITY#{table_key}"
                        dynamo_item["GSI1SK"] = str(dynamo_item.get("created_at") or dynamo_item.get("updated_at") or pk)

                        batch.put_item(Item=dynamo_item)

                    if rows_count % 1000 == 0:
                        logger.info(f"  -> Migrated {rows_count} rows in '{table_name}'...")

        # Update DynamoDB Atomic Counter if table has numeric IDs
        if max_numeric_id > 0 and not self.dry_run:
            try:
                self.table.update_item(
                    Key={"PK": "COUNTER", "SK": table_key},
                    UpdateExpression="SET #v = :m",
                    ExpressionAttributeNames={"#v": "current_value"},
                    ExpressionAttributeValues={":m": max_numeric_id},
                )
                logger.info(f"  [Counter] Initialized '{table_key}' counter to {max_numeric_id}")
            except Exception as e:
                logger.warning(f"  [Counter] Could not set counter for '{table_key}': {e}")

        logger.info(f"Done '{table_name}': {rows_count} row(s) migrated" + (f", {chunks_count} blob chunks created." if chunks_count else "."))
        return rows_count, chunks_count

    def run_all(self, filter_tables: Optional[List[str]] = None):
        """Runs the complete migration process across all discovered tables."""
        start_time = time.time()
        logger.info("==========================================================")
        logger.info("Starting PostgreSQL to DynamoDB Migration")
        logger.info("==========================================================")

        # Clear existing items if configured
        if self.clear_before_migration:
            self.clear_table()

        tables = self.get_public_tables(filter_tables)
        pks = self.get_table_primary_keys()

        logger.info(f"Discovered {len(tables)} tables to migrate.")

        total_rows = 0
        total_chunks = 0
        table_summaries = {}

        for table in tables:
            pk_cols = pks.get(table, ["id" if "id" in pks.get(table, []) else "id"])
            rows, chunks = self.migrate_table(table, pk_cols)
            total_rows += rows
            total_chunks += chunks
            table_summaries[table] = rows

        elapsed = round(time.time() - start_time, 2)
        logger.info("==========================================================")
        logger.info("Migration Complete Summary:")
        logger.info("==========================================================")
        for t, r in table_summaries.items():
            if r > 0:
                logger.info(f"  - {t:<35}: {r:>6} rows")
        logger.info(f"Total Rows Migrated: {total_rows}")
        if total_chunks > 0:
            logger.info(f"Total Blob Chunks: {total_chunks}")
        logger.info(f"Total Time Elapsed: {elapsed} seconds")
        logger.info("==========================================================")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate PostgreSQL database into AWS DynamoDB Single-Table"
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Path to environment file (default: .env)",
    )
    parser.add_argument(
        "--pg-url",
        help="PostgreSQL connection string (overrides PG_DATABASE_URL or DATABASE_URL)",
    )
    parser.add_argument(
        "--table-name",
        help="Target DynamoDB table name (overrides DYNAMODB_TABLE_NAME)",
    )
    parser.add_argument(
        "--region",
        help="AWS Region (overrides AWS_REGION, default: us-east-1)",
    )
    parser.add_argument(
        "--tables",
        help="Comma-separated list of specific tables to migrate (default: all)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch read size from PostgreSQL (default: 500)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Audit rows without writing to DynamoDB",
    )
    parser.add_argument(
        "--clear-before-migration",
        "--wipe",
        dest="clear_before_migration",
        action="store_true",
        default=None,
        help="Delete all existing entries in DynamoDB before migrating (env: DYNAMODB_CLEAR_BEFORE_MIGRATION=true)",
    )
    parser.add_argument(
        "--skip-clear",
        dest="clear_before_migration",
        action="store_false",
        help="Skip deleting existing entries in DynamoDB before migration even if env var is true",
    )

    args = parser.parse_args()

    # Load environment files
    if os.path.exists(args.env_file):
        load_dotenv(args.env_file)
    load_dotenv("server/.env")
    load_dotenv()

    # Determine PostgreSQL URL
    pg_url = (
        args.pg_url
        or os.getenv("PG_DATABASE_URL")
        or os.getenv("POSTGRES_DATABASE_URL")
        or os.getenv("DATABASE_URL")
    )
    if not pg_url:
        # Fallback to individual components
        user = os.getenv("PG_USER") or os.getenv("POSTGRES_USER") or "postgres"
        pwd = os.getenv("PG_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or ""
        host = os.getenv("PG_HOST") or os.getenv("POSTGRES_HOST") or "localhost"
        port = os.getenv("PG_PORT") or os.getenv("POSTGRES_PORT") or "5432"
        db = os.getenv("PG_NAME") or os.getenv("POSTGRES_DB") or "postgres"
        pg_url = f"postgresql://{user}:{pwd}@{host}:{port}/{db}"

    # Determine DynamoDB settings
    table_name = args.table_name or os.getenv("DYNAMODB_TABLE_NAME", "easy-lims")
    region = args.region or os.getenv("AWS_REGION", "us-east-1")
    endpoint_url = os.getenv("DYNAMODB_ENDPOINT_URL") or None
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if not pg_url:
        logger.error("Missing PostgreSQL connection URL. Set PG_DATABASE_URL or pass --pg-url.")
        sys.exit(1)

    clear_env = (
        os.getenv("DYNAMODB_CLEAR_BEFORE_MIGRATION")
        or os.getenv("CLEAR_DYNAMODB_BEFORE_MIGRATION")
        or "false"
    )
    clear_before = args.clear_before_migration
    if clear_before is None:
        clear_before = clear_env.strip().lower() in ("true", "1", "yes")

    filter_tables = [t.strip() for t in args.tables.split(",")] if args.tables else None

    migrator = PostgresToDynamoMigrator(
        pg_url=pg_url,
        dynamo_table_name=table_name,
        aws_region=region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        dynamo_endpoint_url=endpoint_url,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        clear_before_migration=clear_before,
    )
    migrator.run_all(filter_tables)


if __name__ == "__main__":
    main()
