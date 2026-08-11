import os
import logging
import datetime
import re
import json
import uuid
import secrets
import hashlib
from decimal import Decimal
from typing import List, Dict, Any, Optional, Union
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import asyncpg
from pydantic import BaseModel
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Load dev.env from root or server directory if present, fallback to .env
base_dir = os.path.dirname(__file__)
for env_name in ["dev.env", ".env"]:
    load_dotenv(os.path.join(base_dir, "..", env_name))
    load_dotenv(os.path.join(base_dir, env_name))
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

app = FastAPI(title="Easy-LIMS Backend", docs_url="/docs")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

# Enforce environment variable check prior to server startup
has_database_url = bool(DATABASE_URL)
has_custom_db_config = bool(
    (os.getenv("DB_USER") or os.getenv("POSTGRES_USER")) and
    (os.getenv("DB_HOST") or os.getenv("POSTGRES_HOST")) and
    (os.getenv("DB_NAME") or os.getenv("POSTGRES_DB"))
)

if not (has_database_url or has_custom_db_config):
    error_msg = (
        "CRITICAL ERROR: Required database environment variables are not set! Server cannot start.\n"
        "Please set one of the following environment configurations in your environment or .env file:\n"
        "  1) DATABASE_URL\n"
        "  2) DB_USER (or POSTGRES_USER), DB_HOST (or POSTGRES_HOST), and DB_NAME (or POSTGRES_DB)"
    )
    logger.error(error_msg)
    raise RuntimeError(error_msg)

if has_database_url:
    logger.info("Using DATABASE_URL from environment.")
else:
    db_user = os.getenv("DB_USER") or os.getenv("POSTGRES_USER")
    db_pass = os.getenv("DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or ""
    db_host = os.getenv("DB_HOST") or os.getenv("POSTGRES_HOST")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME") or os.getenv("POSTGRES_DB")
    DATABASE_URL = f"postgresql://{quote_plus(db_user)}:{quote_plus(db_pass)}@{db_host}:{db_port}/{db_name}"
    logger.info("Using Postgres database configuration from environment.")
db_pool = None

async def init_db_pool():
    global db_pool
    if db_pool is None or getattr(db_pool, "_closed", False):
        logger.info("Connecting to database...")
        ssl_val = "require" if "sslmode=require" in DATABASE_URL else None
        
        min_size = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
        max_size = int(os.getenv("DB_POOL_MAX_SIZE", "20"))
        
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=min_size,
            max_size=max_size,
            max_queries=50000,
            max_inactive_connection_lifetime=300.0,
            command_timeout=30.0,
            statement_cache_size=0,
            ssl=ssl_val,
            timeout=15.0
        )
        logger.info(f"Database connection pool established (min_size={min_size}, max_size={max_size}).")
    return db_pool

@app.middleware("http")
async def ensure_db_connection(request: Request, call_next):
    global db_pool
    if db_pool is None or getattr(db_pool, "_closed", False):
        try:
            await init_db_pool()
        except Exception as e:
            logger.error(f"Failed to connect to database on demand: {e or repr(e)}")
            if request.url.path.startswith("/api/"):
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Database connection error: {str(e) or repr(e)}"}
                )
    return await call_next(request)

# ============================================================================
# Token-based Authentication Helpers & Middleware
# ============================================================================

TOKEN_EXPIRY_HOURS = int(os.getenv("API_TOKEN_EXPIRY_HOURS", "24"))

# Paths that do NOT require a Bearer token
AUTH_EXEMPT_PATHS = {"/api/auth/login"}

# In-memory token store: { token_hash: { "user_id": int, "expires_at": datetime } }
_token_store: Dict[str, dict] = {}

def generate_api_token() -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(48)

def hash_token(raw_token: str) -> str:
    """SHA-256 hash a raw token for safe storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()

def _cleanup_expired_tokens():
    """Remove expired tokens from the in-memory store."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expired = [k for k, v in _token_store.items() if v["expires_at"] < now]
    for k in expired:
        del _token_store[k]

def store_token(raw_token: str, user_id: int, expires_at: datetime.datetime):
    """Store a token hash in memory."""
    _cleanup_expired_tokens()
    _token_store[hash_token(raw_token)] = {"user_id": user_id, "expires_at": expires_at}

def revoke_token(raw_token: str):
    """Remove a token from the in-memory store."""
    _token_store.pop(hash_token(raw_token), None)

def lookup_token(raw_token: str) -> Optional[int]:
    """Look up a token and return the user_id if valid, or None."""
    token_hash = hash_token(raw_token)
    entry = _token_store.get(token_hash)
    if not entry:
        return None
    if entry["expires_at"] < datetime.datetime.now(datetime.timezone.utc):
        del _token_store[token_hash]
        return None
    return entry["user_id"]

@app.middleware("http")
async def enforce_auth_token(request: Request, call_next):
    """Reject /api/* requests (except auth-exempt paths) that lack a valid Bearer token."""
    path = request.url.path

    # Only protect /api/* endpoints
    if not path.startswith("/api/"):
        return await call_next(request)

    # Allow auth-exempt paths through
    if path in AUTH_EXEMPT_PATHS:
        return await call_next(request)

    # Extract the Bearer token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})

    raw_token = auth_header[7:]
    if not raw_token:
        return JSONResponse(status_code=401, content={"detail": "Empty bearer token"})

    # Validate token from in-memory store
    user_id = lookup_token(raw_token)
    if user_id is None:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

    # Fetch user from DB to ensure they are still active
    if db_pool is None or getattr(db_pool, "_closed", False):
        return JSONResponse(status_code=503, content={"detail": "Database not available"})

    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM users WHERE id = $1 AND is_active = true", user_id)

    if not rows:
        # User no longer active — revoke the token
        revoke_token(raw_token)
        return JSONResponse(status_code=401, content={"detail": "User account is deactivated"})

    current_user = {k: sanitize_db_val(v) for k, v in dict(rows[0]).items()}
    current_user.pop("password", None)

    # Attach authenticated user to request state for downstream handlers
    request.state.current_user = current_user
    return await call_next(request)

@app.on_event("startup")
async def startup():
    try:
        await init_db_pool()
    except Exception as e:
        logger.error(f"Failed to connect to database on startup: {e or repr(e)}")

    if db_pool and not getattr(db_pool, "_closed", False):
        try:
            async with db_pool.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS job_tests (
                        id SERIAL PRIMARY KEY,
                        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                        category TEXT NOT NULL,
                        results JSONB,
                        status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
                        assigned_technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_job_tests_job_id ON job_tests(job_id);

                    CREATE TABLE IF NOT EXISTS technician_capabilities (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        category TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_technician_capabilities_user_id ON technician_capabilities(user_id);

                    CREATE TABLE IF NOT EXISTS vendors_suppliers (
                        id SERIAL PRIMARY KEY,
                        type TEXT NOT NULL DEFAULT 'Vendor',
                        name TEXT NOT NULL,
                        address TEXT,
                        contact_person TEXT,
                        phone TEXT,
                        email TEXT,
                        gstin TEXT,
                        category TEXT,
                        contacts JSONB,
                        status BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_vendors_suppliers_type ON vendors_suppliers(type);

                    CREATE TABLE IF NOT EXISTS job_to_technicians (
                        id SERIAL PRIMARY KEY,
                        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                        technician_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        assigned_tests TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    ALTER TABLE job_to_technicians ADD COLUMN IF NOT EXISTS assigned_tests TEXT;

                    CREATE TABLE IF NOT EXISTS email_logs (
                        id SERIAL PRIMARY KEY,
                        subject TEXT NOT NULL,
                        body_html TEXT NOT NULL,
                        recipients JSONB NOT NULL,
                        recipient_count INTEGER NOT NULL DEFAULT 0,
                        sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        sent_by_name TEXT,
                        status TEXT NOT NULL DEFAULT 'SENT',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS email_templates (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        body TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                
                tpl_count = await conn.fetchval("SELECT COUNT(*) FROM email_templates")
                if tpl_count == 0:
                    await conn.execute("""
                        INSERT INTO email_templates (name, subject, body) VALUES
                        (
                            'Test Report Released Notice',
                            'Laboratory Test Report Available - {{client_name}}',
                            '<h2>Laboratory Test Report Dispatch</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>We are pleased to inform you that the requested laboratory testing for your recent job sample has been completed and verified by our quality engineers.</p><p>You can access your verified report directly through your client portal or by contacting your account representative.</p><hr /><p>Best regards,<br /><strong>{{site_name}} Quality Laboratory Team</strong></p>'
                        ),
                        (
                            'Work Order & Sample Receipt Confirmation',
                            'Work Order & Sample Receipt Confirmation - {{client_name}}',
                            '<h2>Sample Reception & Work Order Confirmation</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>Thank you for choosing <strong>{{site_name}}</strong>. We have officially logged your work order and material samples into our LIMS testing workflow.</p><p>Our technicians have begun sample preparation and testing per the required standards.</p><hr /><p>Regards,<br /><strong>Material Receiving Department</strong></p>'
                        ),
                        (
                            'General Communication Notice',
                            'Important Update from {{site_name}}',
                            '<h2>Important Customer Update</h2><p>Dear Valued Partner,</p><p>We are writing to share an important announcement regarding our laboratory operations and technical testing services.</p><p>Please review the details below and reach out to our support team if you have any questions.</p><hr /><p>Sincerely,<br /><strong>Management Team - {{site_name}}</strong></p>'
                        );
                    """)

                logger.info("Verified/created job_tests, technician_capabilities, vendors_suppliers, job_to_technicians, email_logs, and email_templates tables.")
        except Exception as e:
            logger.error(f"Failed to initialize auxiliary tables on startup: {e}")

@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool and not getattr(db_pool, "_closed", False):
        try:
            await db_pool.close()
            logger.info("Database connection pool closed.")
        except Exception as e:
            logger.warning(f"Error closing database connection pool: {e}")

# Helper to check if string is a safe identifier (to prevent SQL injection in table/column names)
def safe_identifier(name: str) -> str:
    if not name:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty")
    cleaned = "".join(c for c in name if c.isalnum() or c == "_")
    if cleaned != name:
        raise HTTPException(status_code=400, detail=f"Unsafe identifier: {name}")
    return cleaned

def coerce_value(val: Any, type_name: str) -> Any:
    if val is None:
        return None
    type_name = type_name.lower()
    
    if type_name in ('timestamptz', 'timestamp', 'date'):
        if isinstance(val, str):
            if re.match(r'^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}', val):
                try:
                    iso_str = val.replace('Z', '+00:00')
                    return datetime.datetime.fromisoformat(iso_str)
                except Exception:
                    pass
            elif re.match(r'^\d{4}-\d{2}-\d{2}$', val):
                try:
                    return datetime.date.fromisoformat(val)
                except Exception:
                    pass
    elif type_name in ('int2', 'int4', 'int8', 'integer', 'bigint', 'smallint'):
        if isinstance(val, (str, float)):
            try:
                return int(val)
            except ValueError:
                pass
    elif type_name in ('float4', 'float8', 'numeric', 'double precision'):
        if isinstance(val, (str, int)):
            try:
                return float(val)
            except ValueError:
                pass
    elif type_name in ('bool', 'boolean'):
        if isinstance(val, str):
            return val.lower() in ('true', '1', 't', 'yes')
    elif type_name == 'text' or 'char' in type_name:
        if not isinstance(val, (str, list, dict)):
            return str(val)
            
    return val

def sanitize_db_val(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, list):
        return [sanitize_db_val(item) for item in v]
    if isinstance(v, dict):
        return {k: sanitize_db_val(val) for k, val in v.items()}
    return v

def sanitize_row(row: Any) -> dict:
    if row is None:
        return {}
    d = dict(row)
    return {k: sanitize_db_val(v) for k, v in d.items()}

async def fetch_with_coerced_params(conn, query: str, params: list):
    if not params:
        rows = await conn.fetch(query)
    else:
        stmt = await conn.prepare(query)
        param_types = stmt.get_parameters()
        coerced = []
        for val, ptype in zip(params, param_types):
            if isinstance(val, list):
                coerced.append([coerce_value(v, ptype.name) for v in val])
            else:
                coerced.append(coerce_value(val, ptype.name))
        rows = await stmt.fetch(*coerced)
    return [sanitize_row(r) for r in rows]



# ============================================================================
# Dedicated Document REST API Endpoints
# ============================================================================

class DocumentCreate(BaseModel):
    quote_number: str
    document_type: str
    content: Any
    created_by: int
    client_id: Optional[int] = None
    job_id: Optional[int] = None
    payment_date: Optional[str] = None
    payment_mode: Optional[str] = None
    bank_details: Optional[str] = None
    version: Optional[int] = 1

class DocumentUpdate(BaseModel):
    quote_number: Optional[str] = None
    document_type: Optional[str] = None
    content: Optional[Any] = None
    payment_date: Optional[str] = None
    payment_mode: Optional[str] = None
    bank_details: Optional[str] = None
    client_id: Optional[int] = None
    job_id: Optional[int] = None

class DocumentVersionPayload(BaseModel):
    content: Optional[Any] = None
    created_by: Optional[int] = None
    quote_number: Optional[str] = None
    document_type: Optional[str] = None

def format_content(content: Any) -> str:
    if isinstance(content, (dict, list)):
        return json.dumps(content)
    return str(content) if content is not None else "{}"

def parse_id_list(val: Optional[Any]) -> List[int]:
    if val is None or val == "":
        return []
    if isinstance(val, int):
        return [val]
    if isinstance(val, str):
        res = []
        for part in val.split(","):
            part = part.strip()
            if part.isdigit():
                res.append(int(part))
        return res
    if isinstance(val, list):
        res = []
        for x in val:
            res.extend(parse_id_list(x))
        return res
    return []

def parse_str_list(val: Optional[Any]) -> List[str]:
    if val is None or val == "":
        return []
    if isinstance(val, str):
        return [p.strip() for p in val.split(",") if p.strip()]
    if isinstance(val, list):
        res = []
        for x in val:
            res.extend(parse_str_list(x))
        return res
    return []

@app.get("/api/documents", tags=["Documents"], summary="List, search & filter documents with pagination")
async def list_documents(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    id: Optional[str] = None,
    quote_number: Optional[str] = None,
    version: Optional[int] = None,
    document_type: Optional[str] = None,
    exclude_document_type: Optional[str] = None,
    client_id: Optional[str] = None,
    job_id: Optional[str] = None,
    created_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    safe_sort = safe_identifier(sort_by) if sort_by in ["id", "quote_number", "document_type", "created_at", "updated_at", "version"] else "created_at"
    sort_order = "ASC" if order.lower() == "asc" else "DESC"

    where_parts = []
    params = []

    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"d.id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"d.id = ANY(${len(params)}::int[])")

    if quote_number:
        params.append(quote_number)
        where_parts.append(f"d.quote_number = ${len(params)}")

    if version is not None:
        params.append(version)
        where_parts.append(f"d.version = ${len(params)}")

    if document_type:
        types = [t.strip() for t in document_type.split(",") if t.strip()]
        if len(types) == 1:
            params.append(types[0])
            where_parts.append(f"d.document_type = ${len(params)}")
        elif len(types) > 1:
            params.append(types)
            where_parts.append(f"d.document_type = ANY(${len(params)}::text[])")

    if exclude_document_type:
        types = [t.strip() for t in exclude_document_type.split(",") if t.strip()]
        if len(types) == 1:
            params.append(types[0])
            where_parts.append(f"d.document_type != ${len(params)}")
        elif len(types) > 1:
            params.append(types)
            where_parts.append(f"NOT (d.document_type = ANY(${len(params)}::text[]))")

    if client_id is not None:
        parsed = parse_id_list(client_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"d.client_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"d.client_id = ANY(${len(params)}::int[])")

    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"d.job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"d.job_id = ANY(${len(params)}::int[])")

    if created_by is not None:
        parsed = parse_id_list(created_by)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"d.created_by = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"d.created_by = ANY(${len(params)}::int[])")

    if date_from:
        params.append(date_from)
        where_parts.append(f"d.created_at >= ${len(params)}")

    if date_to:
        params.append(date_to)
        where_parts.append(f"d.created_at <= ${len(params)}")

    if q:
        params.append(f"%{q}%")
        p_idx = len(params)
        where_parts.append(f"(d.quote_number ILIKE ${p_idx} OR d.document_type ILIKE ${p_idx} OR d.content::text ILIKE ${p_idx} OR c.client_name ILIKE ${p_idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    async with db_pool.acquire() as conn:
        try:
            # 1. Total count
            count_query = f"SELECT COUNT(*) FROM documents d LEFT JOIN clients c ON d.client_id = c.id {where_sql}"
            count_rows = await fetch_with_coerced_params(conn, count_query, params)
            total = count_rows[0]["count"] if count_rows else 0

            # 2. Paginated / full data
            query_params = list(params)
            if limit is not None:
                p_val = max(1, page or 1)
                l_val = max(1, limit)
                o_val = (p_val - 1) * l_val
                query_params.append(l_val)
                limit_idx = len(query_params)
                query_params.append(o_val)
                offset_idx = len(query_params)
                limit_clause = f"LIMIT ${limit_idx} OFFSET ${offset_idx}"
                total_pages = (total + l_val - 1) // l_val if total > 0 else 0
            else:
                p_val = page or 1
                l_val = None
                limit_clause = ""
                total_pages = 1

            data_query = f"""
                SELECT 
                    d.*,
                    CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username, 'role', u.role, 'departments', u.departments) ELSE NULL END AS users,
                    CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'client_name', c.client_name, 'client_address', c.client_address, 'gstin', c.gstin, 'contacts', c.contacts) ELSE NULL END AS clients,
                    CASE WHEN j.id IS NOT NULL THEN jsonb_build_object('id', j.id, 'job_code', j.job_code, 'project_name', j.project_name, 'project_address', j.project_address, 'status', j.status) ELSE NULL END AS jobs
                FROM documents d
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN jobs j ON d.job_id = j.id
                {where_sql}
                ORDER BY d.{safe_sort} {sort_order}
                {limit_clause}
            """
            rows = await fetch_with_coerced_params(conn, data_query, query_params)
            documents = []
            for r in rows:
                doc = dict(r)
                for k in ["users", "clients", "jobs", "content"]:
                    if isinstance(doc.get(k), str):
                        try:
                            doc[k] = json.loads(doc[k])
                        except Exception:
                            pass
                documents.append(doc)

            return {
                "data": documents,
                "total": total,
                "page": p_val,
                "limit": l_val,
                "total_pages": total_pages
            }
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/documents/{doc_id}", tags=["Documents"], summary="Get document by ID")
async def get_document(doc_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = """
        SELECT 
            d.*,
            CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username, 'role', u.role, 'departments', u.departments) ELSE NULL END AS users,
            CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'client_name', c.client_name, 'client_address', c.client_address, 'gstin', c.gstin, 'contacts', c.contacts) ELSE NULL END AS clients,
            CASE WHEN j.id IS NOT NULL THEN jsonb_build_object('id', j.id, 'job_code', j.job_code, 'project_name', j.project_name, 'project_address', j.project_address, 'status', j.status) ELSE NULL END AS jobs
        FROM documents d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN jobs j ON d.job_id = j.id
        WHERE d.id = $1
    """
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, [doc_id])
            if not rows:
                raise HTTPException(status_code=404, detail=f"Document with ID {doc_id} not found")
            doc = dict(rows[0])
            for k in ["users", "clients", "jobs", "content"]:
                if isinstance(doc.get(k), str):
                    try:
                        doc[k] = json.loads(doc[k])
                    except Exception:
                        pass
            return doc
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching document {doc_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/documents", tags=["Documents"], status_code=201, summary="Create document")
async def create_document(doc: DocumentCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    content_str = format_content(doc.content)
    query = """
        INSERT INTO documents (quote_number, document_type, content, created_by, client_id, job_id, payment_date, payment_mode, bank_details, version, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
    """
    params = [
        doc.quote_number,
        doc.document_type,
        content_str,
        doc.created_by,
        doc.client_id,
        doc.job_id,
        doc.payment_date,
        doc.payment_mode,
        doc.bank_details,
        doc.version or 1
    ]

    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, params)
            return dict(rows[0])
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/documents/{doc_id}", tags=["Documents"], summary="Update document")
async def update_document(doc_id: int, payload: DocumentUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    update_fields = []
    params = []

    if payload.quote_number is not None:
        params.append(payload.quote_number)
        update_fields.append(f"quote_number = ${len(params)}")

    if payload.document_type is not None:
        params.append(payload.document_type)
        update_fields.append(f"document_type = ${len(params)}")

    if payload.content is not None:
        params.append(format_content(payload.content))
        update_fields.append(f"content = ${len(params)}::jsonb")

    if payload.payment_date is not None:
        params.append(payload.payment_date)
        update_fields.append(f"payment_date = ${len(params)}")

    if payload.payment_mode is not None:
        params.append(payload.payment_mode)
        update_fields.append(f"payment_mode = ${len(params)}")

    if payload.bank_details is not None:
        params.append(payload.bank_details)
        update_fields.append(f"bank_details = ${len(params)}")

    if payload.client_id is not None:
        params.append(payload.client_id)
        update_fields.append(f"client_id = ${len(params)}")

    if payload.job_id is not None:
        params.append(payload.job_id)
        update_fields.append(f"job_id = ${len(params)}")

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_fields.append("updated_at = NOW()")
    params.append(doc_id)
    doc_id_idx = len(params)

    query = f"UPDATE documents SET {', '.join(update_fields)} WHERE id = ${doc_id_idx} RETURNING *"

    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, params)
            if not rows:
                raise HTTPException(status_code=404, detail=f"Document with ID {doc_id} not found")
            return dict(rows[0])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating document {doc_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/documents/{doc_id}/version", tags=["Documents"], status_code=201, summary="Save document with new version")
async def save_document_version(doc_id: int, payload: Optional[DocumentVersionPayload] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    async with db_pool.acquire() as conn:
        try:
            # 1. Fetch current document
            current_rows = await fetch_with_coerced_params(conn, "SELECT * FROM documents WHERE id = $1", [doc_id])
            if not current_rows:
                raise HTTPException(status_code=404, detail=f"Source document with ID {doc_id} not found")
            
            curr = dict(current_rows[0])
            
            # Determine new version
            new_version = (curr.get("version") or 1) + 1
            content = format_content(payload.content) if (payload and payload.content is not None) else format_content(curr.get("content"))
            created_by = payload.created_by if (payload and payload.created_by is not None) else curr.get("created_by")
            quote_number = payload.quote_number if (payload and payload.quote_number) else curr.get("quote_number")
            document_type = payload.document_type if (payload and payload.document_type) else curr.get("document_type")

            insert_query = """
                INSERT INTO documents (quote_number, document_type, content, created_by, client_id, job_id, payment_date, payment_mode, bank_details, version, created_at, updated_at)
                VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                RETURNING *
            """
            insert_params = [
                quote_number,
                document_type,
                content,
                created_by,
                curr.get("client_id"),
                curr.get("job_id"),
                curr.get("payment_date"),
                curr.get("payment_mode"),
                curr.get("bank_details"),
                new_version
            ]

            new_rows = await fetch_with_coerced_params(conn, insert_query, insert_params)
            return dict(new_rows[0])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating version for document {doc_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/documents/{doc_id}", tags=["Documents"], summary="Delete document")
async def delete_document(doc_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = "DELETE FROM documents WHERE id = $1 RETURNING id"
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, [doc_id])
            if not rows:
                raise HTTPException(status_code=404, detail=f"Document with ID {doc_id} not found")
            return {"message": "Document deleted successfully", "id": doc_id}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Dedicated Jobs REST API Endpoints
# ============================================================================

class JobCreate(BaseModel):
    project_name: str
    client_id: int
    created_by: int
    job_code: Optional[str] = None
    project_address: Optional[str] = None
    status: Optional[str] = "NEW"
    work_order_id: Optional[str] = None
    test_types: Optional[Any] = None
    updated_by: Optional[int] = None

class JobUpdate(BaseModel):
    project_name: Optional[str] = None
    job_code: Optional[str] = None
    project_address: Optional[str] = None
    status: Optional[str] = None
    work_order_id: Optional[str] = None
    test_types: Optional[Any] = None
    client_id: Optional[int] = None
    updated_by: Optional[int] = None

@app.get("/api/jobs", tags=["Jobs"], summary="List, search & filter jobs with pagination")
async def list_jobs(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    id: Optional[str] = None,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    created_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    safe_sort = safe_identifier(sort_by) if sort_by in ["id", "job_code", "project_name", "status", "created_at", "updated_at"] else "created_at"
    sort_order = "ASC" if order.lower() == "asc" else "DESC"

    where_parts = []
    params = []

    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"j.id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"j.id = ANY(${len(params)}::int[])")

    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            params.append(statuses[0])
            where_parts.append(f"j.status = ${len(params)}")
        elif len(statuses) > 1:
            params.append(statuses)
            where_parts.append(f"j.status = ANY(${len(params)}::text[])")

    if client_id is not None:
        parsed = parse_id_list(client_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"j.client_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"j.client_id = ANY(${len(params)}::int[])")

    if created_by is not None:
        parsed = parse_id_list(created_by)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"j.created_by = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"j.created_by = ANY(${len(params)}::int[])")

    if date_from:
        params.append(date_from)
        where_parts.append(f"j.created_at >= ${len(params)}")

    if date_to:
        params.append(date_to)
        where_parts.append(f"j.created_at <= ${len(params)}")

    if q:
        params.append(f"%{q}%")
        p_idx = len(params)
        where_parts.append(f"(j.job_code ILIKE ${p_idx} OR j.project_name ILIKE ${p_idx} OR j.project_address ILIKE ${p_idx} OR j.work_order_id ILIKE ${p_idx} OR c.client_name ILIKE ${p_idx} OR u1.full_name ILIKE ${p_idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    async with db_pool.acquire() as conn:
        try:
            # 1. Total count
            count_query = f"""
                SELECT COUNT(*) 
                FROM jobs j 
                LEFT JOIN clients c ON j.client_id = c.id
                LEFT JOIN users u1 ON j.created_by = u1.id
                {where_sql}
            """
            count_rows = await fetch_with_coerced_params(conn, count_query, params)
            total = count_rows[0]["count"] if count_rows else 0

            # 2. Paginated / full data
            query_params = list(params)
            if limit is not None:
                p_val = max(1, page or 1)
                l_val = max(1, limit)
                o_val = (p_val - 1) * l_val
                query_params.append(l_val)
                limit_idx = len(query_params)
                query_params.append(o_val)
                offset_idx = len(query_params)
                limit_clause = f"LIMIT ${limit_idx} OFFSET ${offset_idx}"
                total_pages = (total + l_val - 1) // l_val if total > 0 else 0
            else:
                p_val = page or 1
                l_val = None
                limit_clause = ""
                total_pages = 1

            data_query = f"""
                SELECT 
                    j.*,
                    c.client_name AS client_name,
                    u1.full_name AS created_by_name,
                    u2.full_name AS updated_by_name,
                    (
                        SELECT ROUND(
                            (
                                (
                                    COALESCE((
                                        SELECT SUM((item->>'total')::numeric)
                                        FROM jsonb_array_elements(dq.content->'items') AS item
                                    ), 0)
                                ) * (1 - COALESCE((dq.content->>'discount')::numeric, 0) / 100.0)
                            ) * 1.18,
                            2
                        )
                        FROM documents dq
                        WHERE dq.job_id = j.id
                          AND LOWER(dq.document_type) = 'quotation'
                        ORDER BY dq.created_at DESC
                        LIMIT 1
                    ) AS "quotationAmount"
                FROM jobs j
                LEFT JOIN clients c ON j.client_id = c.id
                LEFT JOIN users u1 ON j.created_by = u1.id
                LEFT JOIN users u2 ON j.updated_by = u2.id
                {where_sql}
                ORDER BY j.{safe_sort} {sort_order}
                {limit_clause}
            """
            rows = await fetch_with_coerced_params(conn, data_query, query_params)
            jobs = []
            for r in rows:
                job = dict(r)
                for k in ["client_id", "created_by", "updated_by"]:
                    job.pop(k, None)
                jobs.append(job)

            return {
                "data": jobs,
                "total": total,
                "page": p_val,
                "limit": l_val,
                "total_pages": total_pages
            }
        except Exception as e:
            logger.error(f"Error listing jobs: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/workflow-logs", tags=["Jobs"], summary="List job workflow logs")
async def list_workflow_logs(
    job_id: Optional[int] = None,
    limit: Optional[int] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if job_id is not None:
        params.append(job_id)
        where_parts.append(f"l.job_id = ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    limit_clause = ""
    if limit is not None:
        params.append(max(1, limit))
        limit_clause = f"LIMIT ${len(params)}"
    query = f"""
        SELECT 
            l.*,
            CASE WHEN j.id IS NOT NULL THEN jsonb_build_object('job_code', j.job_code, 'project_name', j.project_name) ELSE NULL END AS jobs,
            CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('full_name', u.full_name, 'username', u.username) ELSE NULL END AS users
        FROM job_workflow_logs l
        LEFT JOIN jobs j ON l.job_id = j.id
        LEFT JOIN users u ON l.performed_by = u.id
        {where_sql}
        ORDER BY l.created_at DESC
        {limit_clause}
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        result = []
        for r in rows:
            doc = dict(r)
            for k in ["jobs", "users"]:
                if isinstance(doc.get(k), str):
                    try:
                        doc[k] = json.loads(doc[k])
                    except Exception:
                        pass
            result.append(doc)
        return {"data": result, "total": len(result)}

@app.get("/api/jobs/{job_id}", tags=["Jobs"], summary="Get job by ID")
async def get_job(job_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = """
        SELECT 
            j.*,
            c.client_name AS client_name,
            u1.full_name AS created_by_name,
            u2.full_name AS updated_by_name
        FROM jobs j
        LEFT JOIN clients c ON j.client_id = c.id
        LEFT JOIN users u1 ON j.created_by = u1.id
        LEFT JOIN users u2 ON j.updated_by = u2.id
        WHERE j.id = $1
    """
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, [job_id])
            if not rows:
                raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
            return dict(rows[0])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching job {job_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/jobs", tags=["Jobs"], status_code=201, summary="Create job")
async def create_job(job: JobCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    test_types_str = format_content(job.test_types) if job.test_types is not None else None
    query = """
        INSERT INTO jobs (job_code, project_name, project_address, status, test_types, work_order_id, client_id, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
    """
    params = [
        job.job_code,
        job.project_name,
        job.project_address,
        job.status or "NEW",
        test_types_str,
        job.work_order_id,
        job.client_id,
        job.created_by,
        job.updated_by or job.created_by
    ]

    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, params)
            return dict(rows[0])
        except Exception as e:
            logger.error(f"Error creating job: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/jobs/{job_id}", tags=["Jobs"], summary="Update job")
async def update_job(job_id: int, payload: JobUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    update_fields = []
    params = []

    if payload.project_name is not None:
        params.append(payload.project_name)
        update_fields.append(f"project_name = ${len(params)}")

    if payload.job_code is not None:
        params.append(payload.job_code)
        update_fields.append(f"job_code = ${len(params)}")

    if payload.project_address is not None:
        params.append(payload.project_address)
        update_fields.append(f"project_address = ${len(params)}")

    if payload.status is not None:
        params.append(payload.status)
        update_fields.append(f"status = ${len(params)}")

    if payload.work_order_id is not None:
        params.append(payload.work_order_id)
        update_fields.append(f"work_order_id = ${len(params)}")

    if payload.test_types is not None:
        params.append(format_content(payload.test_types))
        update_fields.append(f"test_types = ${len(params)}::jsonb")

    if payload.client_id is not None:
        params.append(payload.client_id)
        update_fields.append(f"client_id = ${len(params)}")

    if payload.updated_by is not None:
        params.append(payload.updated_by)
        update_fields.append(f"updated_by = ${len(params)}")

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_fields.append("updated_at = NOW()")
    params.append(job_id)
    job_id_idx = len(params)

    query = f"UPDATE jobs SET {', '.join(update_fields)} WHERE id = ${job_id_idx} RETURNING *"

    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, params)
            if not rows:
                raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
            return dict(rows[0])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/jobs/{job_id}", tags=["Jobs"], summary="Delete job")
async def delete_job(job_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = "DELETE FROM jobs WHERE id = $1 RETURNING id"
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, [job_id])
            if not rows:
                raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
            return {"message": "Job deleted successfully", "id": job_id}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

class JobTechnicianAssignReq(BaseModel):
    job_id: int
    technician_id: int
    assigned_tests: Optional[str] = None

class EmailSendReq(BaseModel):
    subject: str
    body_html: str
    recipients: List[dict]
    recipient_count: Optional[int] = None
    sent_by: Optional[int] = None
    sent_by_name: Optional[str] = None

class EmailTemplateReq(BaseModel):
    name: str
    subject: str
    body: str

class JobWorkflowLogCreateReq(BaseModel):
    job_id: int
    performed_by: int
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    action_id: Optional[str] = None
    remarks: Optional[str] = None

class MaterialSampleCreateReq(BaseModel):
    inward_id: int
    sample_code: str
    sample_name: Optional[str] = None
    quantity: Optional[str] = None
    status: Optional[str] = "RECEIVED"
    received_by: Optional[int] = None
    collection_center_id: Optional[int] = None
    remarks: Optional[str] = None

class MaterialSampleUpdateReq(BaseModel):
    sample_code: Optional[str] = None
    sample_name: Optional[str] = None
    quantity: Optional[str] = None
    status: Optional[str] = None
    received_by: Optional[int] = None
    collection_center_id: Optional[int] = None
    remarks: Optional[str] = None

@app.get("/api/job-technicians", tags=["Jobs"], summary="Get job technicians assignments")
async def list_job_technicians(job_id: Optional[str] = None, technician_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"job_id = ANY(${len(params)}::int[])")
    if technician_id is not None:
        parsed = parse_id_list(technician_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"technician_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"technician_id = ANY(${len(params)}::int[])")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM job_to_technicians {where_sql}", params)
        return [dict(r) for r in rows]

@app.post("/api/job-technicians", tags=["Jobs"], status_code=201, summary="Assign technician to job")
async def assign_job_technician(req: Union[JobTechnicianAssignReq, List[JobTechnicianAssignReq]] = Body(...)):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    items = req if isinstance(req, list) else [req]
    results = []
    async with db_pool.acquire() as conn:
        for item in items:
            rows = await fetch_with_coerced_params(
                conn,
                "INSERT INTO job_to_technicians (job_id, technician_id, assigned_tests) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *",
                [item.job_id, item.technician_id, item.assigned_tests]
            )
            results.append(dict(rows[0]) if rows else {"job_id": item.job_id, "technician_id": item.technician_id, "assigned_tests": item.assigned_tests})
    return results if isinstance(req, list) else results[0]

@app.delete("/api/job-technicians", tags=["Jobs"], summary="Unassign technicians from job")
async def unassign_job_technician(job_id: Optional[str] = None, technician_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"job_id = ANY(${len(params)}::int[])")
    if technician_id is not None:
        parsed = parse_id_list(technician_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"technician_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"technician_id = ANY(${len(params)}::int[])")
    if not where_parts:
        raise HTTPException(status_code=400, detail="Must provide job_id or technician_id")
    where_sql = "WHERE " + " AND ".join(where_parts)
    async with db_pool.acquire() as conn:
        await fetch_with_coerced_params(conn, f"DELETE FROM job_to_technicians {where_sql}", params)
        return {"message": "Unassigned successfully"}

@app.get("/api/email/history", tags=["Email"], summary="Get email dispatch history")
@app.get("/api/email-logs", tags=["Email"], summary="Get email dispatch history alias")
async def get_email_history(sort_by: Optional[str] = None, order: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    order_sql = "DESC" if order and order.lower() == "desc" else "ASC"
    limit_sql = f" LIMIT {int(limit)}" if limit else ""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM email_logs ORDER BY created_at {order_sql}{limit_sql}")
        return [sanitize_db_val(dict(r)) for r in rows]

@app.post("/api/email/send", tags=["Email"], status_code=201, summary="Log/Send client email communication")
@app.post("/api/email-logs", tags=["Email"], status_code=201, summary="Log/Send client email communication alias")
async def send_email(req: EmailSendReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    rec_count = req.recipient_count if req.recipient_count is not None else len(req.recipients)
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            INSERT INTO email_logs (subject, body_html, recipients, recipient_count, sent_by, sent_by_name, status)
            VALUES ($1, $2, $3::jsonb, $4, $5, $6, 'SENT')
            RETURNING *
            """,
            req.subject,
            req.body_html,
            json.dumps(req.recipients),
            rec_count,
            req.sent_by,
            req.sent_by_name,
        )
        return sanitize_db_val(dict(rows[0]))

@app.get("/api/email/templates", tags=["Email"], summary="Get all email templates")
@app.get("/api/email-templates", tags=["Email"], summary="Get all email templates alias")
async def get_email_templates():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM email_templates ORDER BY id ASC")
        return [sanitize_db_val(dict(r)) for r in rows]

@app.post("/api/email/templates", tags=["Email"], status_code=201, summary="Create new email template")
@app.post("/api/email-templates", tags=["Email"], status_code=201, summary="Create new email template alias")
async def create_email_template(req: EmailTemplateReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "INSERT INTO email_templates (name, subject, body) VALUES ($1, $2, $3) RETURNING *",
            req.name.strip(),
            req.subject.strip(),
            req.body.strip(),
        )
        return sanitize_db_val(dict(rows[0]))

@app.put("/api/email/templates/{template_id}", tags=["Email"], summary="Update email template")
@app.put("/api/email-templates/{template_id}", tags=["Email"], summary="Update email template alias")
async def update_email_template(template_id: int, req: EmailTemplateReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            UPDATE email_templates
            SET name = $1, subject = $2, body = $3, updated_at = NOW()
            WHERE id = $4
            RETURNING *
            """,
            req.name.strip(),
            req.subject.strip(),
            req.body.strip(),
            template_id,
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Email template not found")
        return sanitize_db_val(dict(rows[0]))

@app.delete("/api/email/templates/{template_id}", tags=["Email"], summary="Delete email template")
@app.delete("/api/email-templates/{template_id}", tags=["Email"], summary="Delete email template alias")
async def delete_email_template(template_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM email_templates WHERE id = $1", template_id)
        return {"message": "Template deleted successfully"}

@app.get("/api/job-workflow-logs", tags=["Jobs"], summary="Get job workflow logs with pagination")
async def list_job_workflow_logs(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    job_id: Optional[str] = None,
    performed_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    safe_sort = safe_identifier(sort_by) if sort_by in ["id", "created_at", "action_id", "from_state", "to_state", "job_id", "performed_by"] else "created_at"
    sort_order = "ASC" if order.lower() == "asc" else "DESC"

    where_parts, params = [], []
    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"job_id = ANY(${len(params)}::int[])")

    if performed_by is not None:
        parsed = parse_id_list(performed_by)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"performed_by = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"performed_by = ANY(${len(params)}::int[])")

    if date_from:
        params.append(date_from)
        where_parts.append(f"created_at >= ${len(params)}")
    if date_to:
        params.append(date_to)
        where_parts.append(f"created_at <= ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(remarks ILIKE ${idx} OR action_id ILIKE ${idx} OR from_state ILIKE ${idx} OR to_state ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM job_workflow_logs {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        data_query = f"SELECT * FROM job_workflow_logs {where_sql} ORDER BY {safe_sort} {sort_order} {limit_sql}"
        rows = await fetch_with_coerced_params(conn, data_query, query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.post("/api/job-workflow-logs", tags=["Jobs"], status_code=201, summary="Log job workflow step")
async def create_job_workflow_log(log: JobWorkflowLogCreateReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO job_workflow_logs (job_id, performed_by, from_state, to_state, action_id, remarks, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [log.job_id, log.performed_by, log.from_state, log.to_state, log.action_id, log.remarks])
        return dict(rows[0])

# ============================================================================
# Dedicated Job Tests REST API Endpoints
# ============================================================================

class JobTestCreate(BaseModel):
    job_id: int
    category: str
    results: Optional[Any] = None
    status: Optional[str] = "IN_PROGRESS"
    assigned_technician_id: Optional[int] = None

class JobTestUpdate(BaseModel):
    job_id: Optional[int] = None
    category: Optional[str] = None
    results: Optional[Any] = None
    status: Optional[str] = None
    assigned_technician_id: Optional[int] = None

@app.get("/api/job-tests", tags=["Job Tests"], summary="List and filter job tests")
async def list_job_tests(
    job_id: Optional[str] = None,
    category: Optional[str] = None,
    id: Optional[str] = None,
    limit: Optional[int] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"id = ANY(${len(params)}::int[])")
    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"job_id = ANY(${len(params)}::int[])")
    if category:
        params.append(category)
        where_parts.append(f"category = ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    limit_clause = ""
    if limit is not None:
        params.append(max(1, limit))
        limit_clause = f"LIMIT ${len(params)}"
    query = f"SELECT * FROM job_tests {where_sql} ORDER BY id ASC {limit_clause}"
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, query, params)
            result = []
            for r in rows:
                doc = dict(r)
                if isinstance(doc.get("results"), str):
                    try: doc["results"] = json.loads(doc["results"])
                    except Exception: pass
                result.append(doc)
            return result
        except Exception as e:
            logger.error(f"Error listing job tests: {e}")
            return []

@app.get("/api/job-tests/{test_id}", tags=["Job Tests"], summary="Get job test by ID")
async def get_job_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM job_tests WHERE id = $1", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Job test not found")
        doc = dict(rows[0])
        if isinstance(doc.get("results"), str):
            try: doc["results"] = json.loads(doc["results"])
            except Exception: pass
        return doc

@app.post("/api/job-tests", tags=["Job Tests"], status_code=201, summary="Create job test entry")
async def create_job_test(jt: JobTestCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    results_str = format_content(jt.results) if jt.results is not None else "{}"
    query = """
        INSERT INTO job_tests (job_id, category, results, status, assigned_technician_id, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [jt.job_id, jt.category, results_str, jt.status or "IN_PROGRESS", jt.assigned_technician_id])
        return dict(rows[0])

@app.put("/api/job-tests/{test_id}", tags=["Job Tests"], summary="Update job test entry")
async def update_job_test(test_id: int, payload: JobTestUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            if k == "results":
                params.append(format_content(v))
                fields.append(f"results = ${len(params)}::jsonb")
            else:
                params.append(v)
                fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(test_id)
    query = f"UPDATE job_tests SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Job test not found")
        return dict(rows[0])

@app.delete("/api/job-tests/{test_id}", tags=["Job Tests"], summary="Delete job test entry")
async def delete_job_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM job_tests WHERE id = $1 RETURNING id", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Job test not found")
        return {"message": "Job test deleted", "id": test_id}

@app.delete("/api/job-tests", tags=["Job Tests"], summary="Delete job tests by filter")
async def delete_job_tests_by_filter(job_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")
    parsed = parse_id_list(job_id)
    async with db_pool.acquire() as conn:
        if len(parsed) == 1:
            await conn.execute("DELETE FROM job_tests WHERE job_id = $1", parsed[0])
        elif len(parsed) > 1:
            await conn.execute("DELETE FROM job_tests WHERE job_id = ANY($1::int[])", parsed)
        return {"message": "Job tests deleted"}

# ============================================================================
# Dedicated Technician Capabilities REST API Endpoints
# ============================================================================

class TechnicianCapabilityCreate(BaseModel):
    user_id: int
    category: str

@app.get("/api/technician-capabilities", tags=["Technician Capabilities"], summary="List technician capabilities")
async def list_technician_capabilities(user_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if user_id is not None:
        parsed = parse_id_list(user_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"user_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"user_id = ANY(${len(params)}::int[])")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        try:
            rows = await fetch_with_coerced_params(conn, f"SELECT * FROM technician_capabilities {where_sql} ORDER BY id ASC", params)
            return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error listing technician capabilities: {e}")
            return []

@app.post("/api/technician-capabilities", tags=["Technician Capabilities"], status_code=201, summary="Create technician capability")
async def create_technician_capability(tc: TechnicianCapabilityCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO technician_capabilities (user_id, category, created_at) VALUES ($1, $2, NOW()) RETURNING *", [tc.user_id, tc.category])
        return dict(rows[0])

@app.get("/api/material-samples", tags=["Material Inward"], summary="Get material samples")
async def list_material_samples(inward_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if inward_id:
            ids = [int(i.strip()) for i in inward_id.split(",") if i.strip().isdigit()]
            if ids:
                rows = await fetch_with_coerced_params(conn, "SELECT * FROM material_samples WHERE inward_id = ANY($1::int[]) ORDER BY id ASC", [ids])
            else:
                rows = []
        else:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM material_samples ORDER BY id ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/material-samples", tags=["Material Inward"], status_code=201, summary="Create material sample")
async def create_material_sample(s: MaterialSampleCreateReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO material_samples (inward_id, sample_code, sample_name, quantity, status, received_by, collection_center_id, remarks, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [s.inward_id, s.sample_code, s.sample_name, s.quantity, s.status, s.received_by, s.collection_center_id, s.remarks])
        return dict(rows[0])

@app.put("/api/material-samples/{sample_id}", tags=["Material Inward"], summary="Update material sample")
async def update_material_sample(sample_id: int, payload: MaterialSampleUpdateReq):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    params.append(sample_id)
    query = f"UPDATE material_samples SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Material sample not found")
        return dict(rows[0])

@app.delete("/api/material-samples/{sample_id}", tags=["Material Inward"], summary="Delete material sample")
async def delete_material_sample(sample_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM material_samples WHERE id = $1 RETURNING id", [sample_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Material sample not found")
        return {"message": "Sample deleted", "id": sample_id}

# ============================================================================
# Dedicated Expenses REST API Endpoints
# ============================================================================

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    date: str
    created_by: int
    project_name: Optional[str] = None
    site_address: Optional[str] = None
    paid_by: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    project_name: Optional[str] = None
    site_address: Optional[str] = None
    paid_by: Optional[str] = None
    remarks: Optional[str] = None

@app.get("/api/expenses", tags=["Expenses"], summary="List, search & filter expenses with pagination")
async def list_expenses(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    id: Optional[str] = None,
    created_by: Optional[str] = None,
    paid_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "date",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    safe_sort = safe_identifier(sort_by) if sort_by in ["id", "amount", "date", "created_at", "paid_by", "project_name"] else "date"
    sort_order = "ASC" if order.lower() == "asc" else "DESC"

    where_parts, params = [], []
    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"id = ANY(${len(params)}::int[])")

    if created_by is not None:
        parsed = parse_id_list(created_by)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"created_by = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"created_by = ANY(${len(params)}::int[])")
    if paid_by:
        params.append(paid_by)
        where_parts.append(f"paid_by = ${len(params)}")
    if date_from:
        params.append(date_from)
        where_parts.append(f"date >= ${len(params)}")
    if date_to:
        params.append(date_to)
        where_parts.append(f"date <= ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(description ILIKE ${idx} OR remarks ILIKE ${idx} OR project_name ILIKE ${idx} OR site_address ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    async with db_pool.acquire() as conn:
        try:
            count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM expenses {where_sql}", params)
            total = count_rows[0]["count"] if count_rows else 0
            if limit is not None:
                p_val = max(1, page or 1)
                l_val = max(1, limit)
                o_val = (p_val - 1) * l_val
                query_params = list(params) + [l_val, o_val]
                limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
                total_pages = (total + l_val - 1) // l_val if total > 0 else 0
            else:
                p_val = page or 1
                l_val = None
                query_params = list(params)
                limit_sql = ""
                total_pages = 1

            data_query = f"SELECT * FROM expenses {where_sql} ORDER BY {safe_sort} {sort_order} {limit_sql}"
            rows = await fetch_with_coerced_params(conn, data_query, query_params)
            return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}
        except Exception as e:
            logger.error(f"Error listing expenses: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/expenses/{expense_id}", tags=["Expenses"], summary="Get expense by ID")
async def get_expense(expense_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM expenses WHERE id = $1", [expense_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Expense not found")
        return dict(rows[0])

@app.post("/api/expenses", tags=["Expenses"], status_code=201, summary="Create expense")
async def create_expense(exp: ExpenseCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO expenses (description, amount, date, created_by, project_name, site_address, paid_by, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *
    """
    params = [exp.description, exp.amount, exp.date, exp.created_by, exp.project_name, exp.site_address, exp.paid_by, exp.remarks]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/expenses/{expense_id}", tags=["Expenses"], summary="Update expense")
async def update_expense(expense_id: int, payload: ExpenseUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(expense_id)
    query = f"UPDATE expenses SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Expense not found")
        return dict(rows[0])

@app.delete("/api/expenses/{expense_id}", tags=["Expenses"], summary="Delete expense")
async def delete_expense(expense_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM expenses WHERE id = $1 RETURNING id", [expense_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Expense not found")
        return {"message": "Expense deleted", "id": expense_id}

# ============================================================================
# Dedicated Approvals & Leaves REST API Endpoints
# ============================================================================

class ApprovalCreate(BaseModel):
    request_type: str
    requester_id: int
    request_data: Optional[Any] = None
    status: Optional[str] = "PENDING"
    admin_remarks: Optional[str] = None

class ApprovalUpdate(BaseModel):
    status: Optional[str] = None
    admin_remarks: Optional[str] = None
    reviewed_by: Optional[int] = None
    request_data: Optional[Any] = None

@app.get("/api/approvals", tags=["Approvals & Leaves"], summary="List approvals & leaves with pagination")
async def list_approvals(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    request_type: Optional[str] = None,
    status: Optional[str] = None,
    requester_id: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if request_type:
        params.append(request_type)
        where_parts.append(f"r.request_type = ${len(params)}")
    if status:
        params.append(status)
        where_parts.append(f"r.status = ${len(params)}")
    if requester_id is not None:
        parsed = parse_id_list(requester_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"r.requester_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"r.requester_id = ANY(${len(params)}::int[])")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM request_approvals r {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        query = f"""
            SELECT 
                r.*,
                CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username, 'role', u.role) ELSE NULL END AS requester
            FROM request_approvals r
            LEFT JOIN users u ON r.requester_id = u.id
            {where_sql}
            ORDER BY r.created_at DESC
            {limit_sql}
        """
        rows = await fetch_with_coerced_params(conn, query, query_params)
        result = []
        for r in rows:
            doc = dict(r)
            for k in ["requester", "request_data"]:
                if isinstance(doc.get(k), str):
                    try:
                        doc[k] = json.loads(doc[k])
                    except Exception:
                        pass
            result.append(doc)
        return {"data": result, "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/approvals/{approval_id}", tags=["Approvals & Leaves"], summary="Get approval by ID")
async def get_approval(approval_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM request_approvals WHERE id = $1", [approval_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Approval request not found")
        return dict(rows[0])

@app.post("/api/approvals", tags=["Approvals & Leaves"], status_code=201, summary="Create approval request")
async def create_approval(appr: ApprovalCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO request_approvals (request_type, requester_id, request_data, status, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW()) RETURNING *
    """
    params = [appr.request_type, appr.requester_id, format_content(appr.request_data), appr.status or "PENDING"]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/approvals/{approval_id}", tags=["Approvals & Leaves"], summary="Update approval request")
async def update_approval(approval_id: int, payload: ApprovalUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            if k == "request_data":
                params.append(format_content(v))
                fields.append(f"request_data = ${len(params)}::jsonb")
            else:
                params.append(v)
                fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(approval_id)
    query = f"UPDATE request_approvals SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Approval request not found")
        return dict(rows[0])

@app.delete("/api/approvals/{approval_id}", tags=["Approvals & Leaves"], summary="Delete approval request")
async def delete_approval(approval_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM request_approvals WHERE id = $1 RETURNING id", [approval_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Approval request not found")
        return {"message": "Approval deleted", "id": approval_id}

# Alias endpoint for /api/leaves
@app.get("/api/leaves", tags=["Approvals & Leaves"], summary="List leave requests with pagination")
async def list_leaves(page: Optional[int] = None, limit: Optional[int] = None, status: Optional[str] = None, requester_id: Optional[str] = None):
    return await list_approvals(page=page, limit=limit, request_type="LEAVE", status=status, requester_id=requester_id)

# ============================================================================
# Dedicated Audit Logs REST API Endpoints
# ============================================================================

class AuditLogCreate(BaseModel):
    performed_by: int
    entity_type: str
    action: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[Any] = None

@app.get("/api/audit-logs", tags=["Audit Logs"], summary="List, search & filter audit logs with pagination")
async def list_audit_logs(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    entity_type: Optional[str] = None,
    performed_by: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    safe_sort = safe_identifier(sort_by) if sort_by in ["id", "created_at", "action", "entity_type", "entity_name", "performed_by"] else "created_at"
    sort_order = "ASC" if order.lower() == "asc" else "DESC"

    where_parts, params = [], []
    if entity_type:
        params.append(entity_type)
        where_parts.append(f"entity_type = ${len(params)}")
    if performed_by is not None:
        parsed = parse_id_list(performed_by)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"performed_by = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"performed_by = ANY(${len(params)}::int[])")
    if date_from:
        params.append(date_from)
        where_parts.append(f"created_at >= ${len(params)}")
    if date_to:
        params.append(date_to)
        where_parts.append(f"created_at <= ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(entity_name ILIKE ${idx} OR action ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM audit_logs {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        data_query = f"SELECT * FROM audit_logs {where_sql} ORDER BY {safe_sort} {sort_order} {limit_sql}"
        rows = await fetch_with_coerced_params(conn, data_query, query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/audit-logs/{log_id}", tags=["Audit Logs"], summary="Get audit log entry by ID")
async def get_audit_log(log_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM audit_logs WHERE id = $1", [log_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Audit log entry not found")
        return dict(rows[0])

@app.post("/api/audit-logs", tags=["Audit Logs"], status_code=201, summary="Create audit log entry")
async def create_audit_log(log: AuditLogCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    details_str = format_content(log.details) if log.details is not None else None
    query = """
        INSERT INTO audit_logs (performed_by, entity_type, action, entity_id, entity_name, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW()) RETURNING *
    """
    params = [log.performed_by, log.entity_type, log.action, log.entity_id, log.entity_name, details_str]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

# ============================================================================
# Dedicated Company Calendar REST API Endpoints
# ============================================================================

class CalendarEventCreate(BaseModel):
    event_date: str
    event_name: str
    is_holiday: Optional[bool] = False

class CalendarEventUpdate(BaseModel):
    event_date: Optional[str] = None
    event_name: Optional[str] = None
    is_holiday: Optional[bool] = None

@app.get("/api/calendar", tags=["Company Calendar"], summary="List company calendar events")
async def list_calendar_events(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_holiday: Optional[bool] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if date_from:
        params.append(date_from)
        where_parts.append(f"event_date >= ${len(params)}")
    if date_to:
        params.append(date_to)
        where_parts.append(f"event_date <= ${len(params)}")
    if is_holiday is not None:
        params.append(is_holiday)
        where_parts.append(f"is_holiday = ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM company_calendar {where_sql} ORDER BY event_date ASC", params)
        return [dict(r) for r in rows]

@app.get("/api/calendar/{event_id}", tags=["Company Calendar"], summary="Get calendar event by ID")
async def get_calendar_event(event_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM company_calendar WHERE id = $1", [event_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Calendar event not found")
        return dict(rows[0])

@app.post("/api/calendar", tags=["Company Calendar"], status_code=201, summary="Create calendar event / holiday")
async def create_calendar_event(evt: CalendarEventCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = "INSERT INTO company_calendar (event_date, event_name, is_holiday, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [evt.event_date, evt.event_name, evt.is_holiday or False])
        return dict(rows[0])

@app.put("/api/calendar/{event_id}", tags=["Company Calendar"], summary="Update calendar event")
async def update_calendar_event(event_id: int, payload: CalendarEventUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(event_id)
    query = f"UPDATE company_calendar SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Calendar event not found")
        return dict(rows[0])

@app.delete("/api/calendar/{event_id}", tags=["Company Calendar"], summary="Delete calendar event")
async def delete_calendar_event(event_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM company_calendar WHERE id = $1 RETURNING id", [event_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Calendar event not found")
        return {"message": "Calendar event deleted", "id": event_id}

# ============================================================================
# Dedicated Clients REST API Endpoints
# ============================================================================

class ClientCreate(BaseModel):
    client_name: str
    client_address: Optional[str] = None
    gstin: Optional[str] = None
    contacts: Optional[Any] = None

class ClientUpdate(BaseModel):
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    gstin: Optional[str] = None
    contacts: Optional[Any] = None

@app.get("/api/filter-options/clients", tags=["Clients"], summary="List client names and IDs for filter dropdowns")
async def list_client_filter_options():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(
            conn,
            "SELECT id, client_name FROM clients ORDER BY client_name ASC",
            []
        )
        return {"data": [dict(r) for r in rows], "total": len(rows)}

@app.get("/api/filter-options/users", tags=["Users"], summary="List user names and IDs for filter dropdowns")
async def list_user_filter_options():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(
            conn,
            "SELECT id, full_name, username, role FROM users WHERE is_active = true ORDER BY full_name ASC",
            []
        )
        return {"data": [dict(r) for r in rows], "total": len(rows)}

def format_client_record(c: dict) -> dict:
    if not c:
        return c
    res = dict(c)
    if isinstance(res.get("contacts"), str):
        try:
            res["contacts"] = json.loads(res["contacts"])
        except Exception:
            pass
    return res

@app.get("/api/clients", tags=["Clients"], summary="List clients with pagination")
async def list_clients(page: Optional[int] = None, limit: Optional[int] = None, q: Optional[str] = None, id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"id = ANY(${len(params)}::int[])")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(client_name ILIKE ${idx} OR gstin ILIKE ${idx} OR client_address ILIKE ${idx})")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM clients {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM clients {where_sql} ORDER BY client_name ASC {limit_sql}", query_params)
        return {"data": [format_client_record(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/clients/{client_id}", tags=["Clients"], summary="Get client by ID")
async def get_client(client_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM clients WHERE id = $1", [client_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Client not found")
        return format_client_record(rows[0])

@app.post("/api/clients", tags=["Clients"], status_code=201, summary="Create client")
async def create_client(client: ClientCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    contacts_str = format_content(client.contacts) if client.contacts is not None else None
    query = "INSERT INTO clients (client_name, client_address, gstin, contacts, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [client.client_name, client.client_address, client.gstin, contacts_str])
        return format_client_record(rows[0])

@app.put("/api/clients/{client_id}", tags=["Clients"], summary="Update client")
async def update_client(client_id: int, payload: ClientUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    if payload.client_name is not None:
        params.append(payload.client_name)
        fields.append(f"client_name = ${len(params)}")
    if payload.client_address is not None:
        params.append(payload.client_address)
        fields.append(f"client_address = ${len(params)}")
    if payload.gstin is not None:
        params.append(payload.gstin)
        fields.append(f"gstin = ${len(params)}")
    if payload.contacts is not None:
        params.append(format_content(payload.contacts))
        fields.append(f"contacts = ${len(params)}::jsonb")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(client_id)
    query = f"UPDATE clients SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Client not found")
        return format_client_record(rows[0])

@app.delete("/api/clients/{client_id}", tags=["Clients"], summary="Delete client")
async def delete_client(client_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM clients WHERE id = $1 RETURNING id", [client_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"message": "Client deleted", "id": client_id}

# ============================================================================
# Dedicated Vendors & Suppliers REST API Endpoints
# ============================================================================

class VendorSupplierCreate(BaseModel):
    type: str = "Vendor"
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    category: Optional[str] = None
    contacts: Optional[Any] = None
    status: Optional[bool] = True

class VendorSupplierUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    category: Optional[str] = None
    contacts: Optional[Any] = None
    status: Optional[bool] = None

def format_vendor_supplier_record(v: dict) -> dict:
    if not v:
        return v
    res = dict(v)
    if isinstance(res.get("contacts"), str):
        try:
            res["contacts"] = json.loads(res["contacts"])
        except Exception:
            pass
    return res

@app.get("/api/vendors-suppliers", tags=["Vendors & Suppliers"], summary="List vendors & suppliers")
async def list_vendors_suppliers(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    id: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"id = ANY(${len(params)}::int[])")
    if type and type.lower() != 'all':
        params.append(type)
        where_parts.append(f"type ILIKE ${len(params)}")
    if category and category.lower() != 'all':
        params.append(category)
        where_parts.append(f"category ILIKE ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(name ILIKE ${idx} OR contact_person ILIKE ${idx} OR phone ILIKE ${idx} OR email ILIKE ${idx} OR gstin ILIKE ${idx} OR address ILIKE ${idx} OR category ILIKE ${idx})")
    
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM vendors_suppliers {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM vendors_suppliers {where_sql} ORDER BY name ASC {limit_sql}", query_params)
        return {"data": [format_vendor_supplier_record(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/vendors-suppliers/{vs_id}", tags=["Vendors & Suppliers"], summary="Get vendor/supplier by ID")
async def get_vendor_supplier(vs_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM vendors_suppliers WHERE id = $1", [vs_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Vendor/Supplier not found")
        return format_vendor_supplier_record(rows[0])

@app.post("/api/vendors-suppliers", tags=["Vendors & Suppliers"], status_code=201, summary="Create vendor or supplier")
async def create_vendor_supplier(item: VendorSupplierCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    contacts_str = format_content(item.contacts) if item.contacts is not None else None
    query = """
        INSERT INTO vendors_suppliers (type, name, address, contact_person, phone, email, gstin, category, contacts, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, NOW(), NOW()) RETURNING *
    """
    params = [item.type or "Vendor", item.name, item.address, item.contact_person, item.phone, item.email, item.gstin, item.category, contacts_str, item.status if item.status is not None else True]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return format_vendor_supplier_record(rows[0])

@app.put("/api/vendors-suppliers/{vs_id}", tags=["Vendors & Suppliers"], summary="Update vendor or supplier")
async def update_vendor_supplier(vs_id: int, payload: VendorSupplierUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            if k == "contacts":
                params.append(format_content(v))
                fields.append(f"contacts = ${len(params)}::jsonb")
            else:
                params.append(v)
                fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(vs_id)
    query = f"UPDATE vendors_suppliers SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Vendor/Supplier not found")
        return format_vendor_supplier_record(rows[0])

@app.delete("/api/vendors-suppliers/{vs_id}", tags=["Vendors & Suppliers"], summary="Delete vendor or supplier")
async def delete_vendor_supplier(vs_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM vendors_suppliers WHERE id = $1 RETURNING id", [vs_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Vendor/Supplier not found")
        return {"message": "Vendor/Supplier deleted", "id": vs_id}

# ============================================================================
# Dedicated Client Pricing REST API Endpoints
# ============================================================================

class ClientLabPricePayload(BaseModel):
    client_id: int
    lab_test_id: int
    price: float

class ClientFieldPricePayload(BaseModel):
    client_id: int
    field_test_id: int
    price: float

@app.get("/api/client-pricing/lab", tags=["Client Pricing"], summary="List client lab test prices")
async def list_client_lab_prices(client_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if client_id is not None:
            parsed = parse_id_list(client_id)
            if len(parsed) == 1:
                rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_lab_test_prices WHERE client_id = $1", [parsed[0]])
            elif len(parsed) > 1:
                rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_lab_test_prices WHERE client_id = ANY($1::int[])", [parsed])
            else:
                rows = []
        else:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_lab_test_prices", [])
        return [dict(r) for r in rows]

@app.post("/api/client-pricing/lab", tags=["Client Pricing"], status_code=201, summary="Upsert client lab test price")
async def upsert_client_lab_price(payload: ClientLabPricePayload):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO client_lab_test_prices (client_id, lab_test_id, price, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [payload.client_id, payload.lab_test_id, payload.price])
        return dict(rows[0])

@app.delete("/api/client-pricing/lab/{price_id}", tags=["Client Pricing"], summary="Delete client lab test price override")
async def delete_client_lab_price(price_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM client_lab_test_prices WHERE id = $1 RETURNING id", [price_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Lab test price override not found")
        return {"message": "Client lab price override deleted", "id": price_id}

@app.get("/api/client-pricing/field", tags=["Client Pricing"], summary="List client field test prices")
async def list_client_field_prices(client_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if client_id is not None:
            parsed = parse_id_list(client_id)
            if len(parsed) == 1:
                rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_field_test_prices WHERE client_id = $1", [parsed[0]])
            elif len(parsed) > 1:
                rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_field_test_prices WHERE client_id = ANY($1::int[])", [parsed])
            else:
                rows = []
        else:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM client_field_test_prices", [])
        return [dict(r) for r in rows]

@app.post("/api/client-pricing/field", tags=["Client Pricing"], status_code=201, summary="Upsert client field test price")
async def upsert_client_field_price(payload: ClientFieldPricePayload):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO client_field_test_prices (client_id, field_test_id, price, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [payload.client_id, payload.field_test_id, payload.price])
        return dict(rows[0])

@app.delete("/api/client-pricing/field/{price_id}", tags=["Client Pricing"], summary="Delete client field test price override")
async def delete_client_field_price(price_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM client_field_test_prices WHERE id = $1 RETURNING id", [price_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Field test price override not found")
        return {"message": "Client field price override deleted", "id": price_id}

# ============================================================================
# Dedicated Field Tests REST API Endpoints
# ============================================================================

class FieldTestCreate(BaseModel):
    name: str
    unit: Optional[str] = None
    price: Optional[float] = None
    qty: Optional[float] = None
    method_of_sampling: Optional[str] = None
    num_bhs: Optional[float] = None
    measure: Optional[str] = None
    hsn_code: Optional[str] = None
    num_days: Optional[int] = None

class FieldTestUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    qty: Optional[float] = None
    method_of_sampling: Optional[str] = None
    num_bhs: Optional[float] = None
    measure: Optional[str] = None
    hsn_code: Optional[str] = None
    num_days: Optional[int] = None

@app.get("/api/field-tests", tags=["Field Tests"], summary="List field tests with pagination")
async def list_field_tests(page: Optional[int] = None, limit: Optional[int] = None, q: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(name ILIKE ${idx} OR method_of_sampling ILIKE ${idx} OR hsn_code ILIKE ${idx})")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM field_tests {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM field_tests {where_sql} ORDER BY name ASC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/field-tests/{test_id}", tags=["Field Tests"], summary="Get field test by ID")
async def get_field_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM field_tests WHERE id = $1", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Field test not found")
        return dict(rows[0])

@app.post("/api/field-tests", tags=["Field Tests"], status_code=201, summary="Create field test")
async def create_field_test(ft: FieldTestCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO field_tests (name, unit, price, qty, method_of_sampling, num_bhs, measure, hsn_code, num_days, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *
    """
    params = [ft.name, ft.unit, ft.price, ft.qty, ft.method_of_sampling, ft.num_bhs, ft.measure, ft.hsn_code, ft.num_days]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/field-tests/{test_id}", tags=["Field Tests"], summary="Update field test")
async def update_field_test(test_id: int, payload: FieldTestUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(test_id)
    query = f"UPDATE field_tests SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Field test not found")
        return dict(rows[0])

@app.delete("/api/field-tests/{test_id}", tags=["Field Tests"], summary="Delete field test")
async def delete_field_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM field_tests WHERE id = $1 RETURNING id", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Field test not found")
        return {"message": "Field test deleted", "id": test_id}

# ============================================================================
# Dedicated Lab Tests REST API Endpoints
# ============================================================================

class LabTestCreate(BaseModel):
    name: str
    materials: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    num_days: Optional[int] = None
    price: Optional[float] = None
    hsn_code: Optional[str] = None

class LabTestUpdate(BaseModel):
    name: Optional[str] = None
    materials: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    num_days: Optional[int] = None
    price: Optional[float] = None
    hsn_code: Optional[str] = None

@app.get("/api/lab-tests", tags=["Lab Tests"], summary="List lab tests with pagination")
async def list_lab_tests(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    group: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if group:
        params.append(group)
        where_parts.append(f"\"group\" = ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(name ILIKE ${idx} OR materials ILIKE ${idx} OR test_method_specification ILIKE ${idx} OR hsn_code ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM lab_tests {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM lab_tests {where_sql} ORDER BY name ASC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/lab-tests/{test_id}", tags=["Lab Tests"], summary="Get lab test by ID")
async def get_lab_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM lab_tests WHERE id = $1", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Lab test not found")
        return dict(rows[0])

@app.post("/api/lab-tests", tags=["Lab Tests"], status_code=201, summary="Create lab test")
async def create_lab_test(lt: LabTestCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO lab_tests (name, materials, "group", test_method_specification, num_days, price, hsn_code, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *
    """
    params = [lt.name, lt.materials, lt.group, lt.test_method_specification, lt.num_days, lt.price, lt.hsn_code]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/lab-tests/{test_id}", tags=["Lab Tests"], summary="Update lab test")
async def update_lab_test(test_id: int, payload: LabTestUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            col = f'"{k}"' if k == "group" else k
            params.append(v)
            fields.append(f"{col} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(test_id)
    query = f"UPDATE lab_tests SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Lab test not found")
        return dict(rows[0])

@app.delete("/api/lab-tests/{test_id}", tags=["Lab Tests"], summary="Delete lab test")
async def delete_lab_test(test_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM lab_tests WHERE id = $1 RETURNING id", [test_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Lab test not found")
        return {"message": "Lab test deleted", "id": test_id}

# ============================================================================
# Dedicated Sampling Services REST API Endpoints
# ============================================================================

class SamplingCreate(BaseModel):
    name: str
    test_type: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = None
    price: Optional[float] = None
    hsn_code: Optional[str] = None
    num_days: Optional[int] = None

class SamplingUpdate(BaseModel):
    name: Optional[str] = None
    test_type: Optional[str] = None
    group: Optional[str] = None
    test_method_specification: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = None
    price: Optional[float] = None
    hsn_code: Optional[str] = None
    num_days: Optional[int] = None

@app.get("/api/sampling", tags=["Sampling"], summary="List sampling services with pagination")
async def list_sampling_services(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    test_type: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if test_type:
        params.append(test_type)
        where_parts.append(f"test_type = ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(name ILIKE ${idx} OR \"group\" ILIKE ${idx} OR test_method_specification ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM sampling {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM sampling {where_sql} ORDER BY name ASC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/sampling/{sampling_id}", tags=["Sampling"], summary="Get sampling service by ID")
async def get_sampling_service(sampling_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM sampling WHERE id = $1", [sampling_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Sampling service not found")
        return dict(rows[0])

@app.post("/api/sampling", tags=["Sampling"], status_code=201, summary="Create sampling service")
async def create_sampling_service(samp: SamplingCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO sampling (name, test_type, "group", test_method_specification, unit, qty, price, hsn_code, num_days, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *
    """
    params = [samp.name, samp.test_type, samp.group, samp.test_method_specification, samp.unit, samp.qty, samp.price, samp.hsn_code, samp.num_days]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/sampling/{sampling_id}", tags=["Sampling"], summary="Update sampling service")
async def update_sampling_service(sampling_id: int, payload: SamplingUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            col = f'"{k}"' if k == "group" else k
            params.append(v)
            fields.append(f"{col} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(sampling_id)
    query = f"UPDATE sampling SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Sampling service not found")
        return dict(rows[0])

@app.delete("/api/sampling/{sampling_id}", tags=["Sampling"], summary="Delete sampling service")
async def delete_sampling_service(sampling_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM sampling WHERE id = $1 RETURNING id", [sampling_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Sampling service not found")
        return {"message": "Sampling service deleted", "id": sampling_id}

# ============================================================================
# Dedicated Packages REST API Endpoints
# ============================================================================

class PackageCreate(BaseModel):
    id: str
    name: str
    created_by: int
    items: Optional[Any] = None

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    items: Optional[Any] = None

@app.get("/api/packages", tags=["Packages"], summary="List packages with pagination")
async def list_packages(page: Optional[int] = None, limit: Optional[int] = None, q: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if q:
        params.append(f"%{q}%")
        where_parts.append(f"(name ILIKE ${len(params)} OR id ILIKE ${len(params)})")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM packages {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM packages {where_sql} ORDER BY name ASC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/packages/{pkg_id}", tags=["Packages"], summary="Get package by ID")
async def get_package(pkg_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM packages WHERE id = $1", [pkg_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Package not found")
        return dict(rows[0])

@app.post("/api/packages", tags=["Packages"], status_code=201, summary="Create package")
async def create_package(pkg: PackageCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    items_str = format_content(pkg.items) if pkg.items is not None else None
    query = "INSERT INTO packages (id, name, created_by, items, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [pkg.id, pkg.name, pkg.created_by, items_str])
        return dict(rows[0])

@app.put("/api/packages/{pkg_id}", tags=["Packages"], summary="Update package")
async def update_package(pkg_id: str, payload: PackageUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    if payload.name is not None:
        params.append(payload.name)
        fields.append(f"name = ${len(params)}")
    if payload.items is not None:
        params.append(format_content(payload.items))
        fields.append(f"items = ${len(params)}::jsonb")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(pkg_id)
    query = f"UPDATE packages SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Package not found")
        return dict(rows[0])

@app.delete("/api/packages/{pkg_id}", tags=["Packages"], summary="Delete package")
async def delete_package(pkg_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM packages WHERE id = $1 RETURNING id", [pkg_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Package not found")
        return {"message": "Package deleted", "id": pkg_id}

# ============================================================================
# Dedicated Service Units REST API Endpoints
# ============================================================================

class ServiceUnitCreate(BaseModel):
    unit_type: str

@app.get("/api/service-units", tags=["Service Units"], summary="List service unit types")
async def list_service_units():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM service_unit_types ORDER BY unit_type ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/service-units", tags=["Service Units"], status_code=201, summary="Create service unit type")
async def create_service_unit(su: ServiceUnitCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO service_unit_types (unit_type) VALUES ($1) RETURNING *", [su.unit_type])
        return dict(rows[0])

@app.delete("/api/service-units/{unit_id}", tags=["Service Units"], summary="Delete service unit type")
async def delete_service_unit(unit_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM service_unit_types WHERE id = $1 RETURNING id", [unit_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Service unit type not found")
        return {"message": "Service unit type deleted", "id": unit_id}

# ============================================================================
# Dedicated HSN/SAC Codes REST API Endpoints
# ============================================================================

class HsnSacCodeCreate(BaseModel):
    code: str
    description: Optional[str] = None

@app.get("/api/hsn-sac-codes", tags=["HSN/SAC Codes"], summary="List HSN/SAC codes")
async def list_hsn_sac_codes():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM hsn_sac_codes ORDER BY code ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/hsn-sac-codes", tags=["HSN/SAC Codes"], status_code=201, summary="Create HSN/SAC code")
async def create_hsn_sac_code(item: HsnSacCodeCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO hsn_sac_codes (code, description) VALUES ($1, $2) RETURNING *", [item.code, item.description])
        return dict(rows[0])

@app.delete("/api/hsn-sac-codes/{code_id}", tags=["HSN/SAC Codes"], summary="Delete HSN/SAC code")
async def delete_hsn_sac_code(code_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM hsn_sac_codes WHERE id = $1 RETURNING id", [code_id])
        if not rows:
            raise HTTPException(status_code=404, detail="HSN/SAC code not found")
        return {"message": "HSN/SAC code deleted", "id": code_id}

# ============================================================================
# Business Insights REST API Endpoint
# ============================================================================

@app.get("/api/insights", tags=["Business Insights"], summary="Get aggregated business analytics and KPIs")
async def get_business_insights():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        try:
            job_stats = await fetch_with_coerced_params(conn, "SELECT status, COUNT(*) FROM jobs GROUP BY status", [])
            doc_stats = await fetch_with_coerced_params(conn, "SELECT document_type, COUNT(*) FROM documents GROUP BY document_type", [])
            exp_stats = await fetch_with_coerced_params(conn, "SELECT COALESCE(SUM(amount), 0) AS total_expenses, COUNT(*) AS expense_count FROM expenses", [])
            client_stats = await fetch_with_coerced_params(conn, "SELECT COUNT(*) FROM clients", [])
            recent_logs = await fetch_with_coerced_params(conn, "SELECT * FROM job_workflow_logs ORDER BY created_at DESC LIMIT 5", [])

            return {
                "jobs_by_status": {r["status"]: r["count"] for r in job_stats},
                "documents_by_type": {r["document_type"]: r["count"] for r in doc_stats},
                "total_expenses": float(exp_stats[0]["total_expenses"]) if exp_stats else 0.0,
                "expense_count": exp_stats[0]["expense_count"] if exp_stats else 0,
                "total_clients": client_stats[0]["count"] if client_stats else 0,
                "recent_workflow_logs": [dict(r) for r in recent_logs]
            }
        except Exception as e:
            logger.error(f"Error fetching business insights: {e}")
            raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Dedicated Users REST API Endpoints
# ============================================================================

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str
    base_salary: Optional[float] = None
    departments: Optional[List[str]] = None
    employee_id: Optional[str] = None
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    base_salary: Optional[float] = None
    departments: Optional[List[str]] = None
    employee_id: Optional[str] = None
    is_active: Optional[bool] = None

class LoginPayload(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login", tags=["Auth"], summary="Exchange credentials for an API token")
async def login_user(payload: LoginPayload):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(
            conn,
            "SELECT * FROM users WHERE username = $1 AND password = $2 AND is_active = true",
            [payload.username, payload.password]
        )
        if not rows:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        user = dict(rows[0])
        user.pop("password", None)
        user.pop("base_salary", None)

        # Generate new token and store in memory
        raw_token = generate_api_token()
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS)
        store_token(raw_token, user["id"], expires_at)

        return {
            "token": raw_token,
            "expires_at": expires_at.isoformat(),
            "user": user
        }

@app.post("/api/auth/logout", tags=["Auth"], summary="Destroy the current API token")
async def logout_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]
        revoke_token(raw_token)
    return {"message": "Logged out successfully", "redirect": "/"}

@app.get("/api/auth/me", tags=["Auth"], summary="Get current authenticated user from token")
async def get_current_user_endpoint(request: Request):
    """Returns the user associated with the current bearer token. Used for session verification on page reload."""
    current_user = getattr(request.state, "current_user", None)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@app.get("/api/users", tags=["Users"], summary="List users with pagination and filtering")
async def list_users(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    id: Optional[str] = None,
    username: Optional[str] = None,
    role: Optional[str] = None,
    exclude_role: Optional[str] = None,
    is_active: Optional[bool] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if id is not None:
        parsed = parse_id_list(id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"id = ANY(${len(params)}::int[])")
    if username:
        params.append(username)
        where_parts.append(f"username = ${len(params)}")
    if role:
        parsed_roles = parse_str_list(role)
        if len(parsed_roles) == 1:
            params.append(parsed_roles[0])
            where_parts.append(f"role = ${len(params)}")
        elif len(parsed_roles) > 1:
            params.append(parsed_roles)
            where_parts.append(f"role = ANY(${len(params)}::text[])")
    if exclude_role:
        params.append(exclude_role)
        where_parts.append(f"role != ${len(params)}")
    if is_active is not None:
        params.append(is_active)
        where_parts.append(f"is_active = ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(username ILIKE ${idx} OR full_name ILIKE ${idx} OR employee_id ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM users {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM users {where_sql} ORDER BY full_name ASC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/users/{user_id}", tags=["Users"], summary="Get user by ID")
async def get_user(user_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM users WHERE id = $1", [user_id])
        if not rows:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(rows[0])

@app.post("/api/users", tags=["Users"], status_code=201, summary="Create user account")
async def create_user(u: UserCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO users (username, password, full_name, role, base_salary, departments, employee_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *
    """
    params = [u.username, u.password, u.full_name, u.role, u.base_salary, u.departments, u.employee_id, u.is_active if u.is_active is not None else True]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/users/{user_id}", tags=["Users"], summary="Update user account")
async def update_user(user_id: int, payload: UserUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(rows[0])

@app.delete("/api/users/{user_id}", tags=["Users"], summary="Deactivate / delete user account")
async def delete_user(user_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id", [user_id])
        if not rows:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deactivated successfully", "id": user_id}

# ============================================================================
# Dedicated Inquiries REST API Endpoints
# ============================================================================

class InquiryCreate(BaseModel):
    client_name: str
    phone_number: str
    received_by: int
    email: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "PENDING"

class InquiryUpdate(BaseModel):
    client_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

@app.get("/api/inquiries", tags=["Inquiries"], summary="List inquiries with pagination")
async def list_inquiries(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    status: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if status:
        params.append(status)
        where_parts.append(f"status = ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(client_name ILIKE ${idx} OR phone_number ILIKE ${idx} OR email ILIKE ${idx} OR description ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM inquiries {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM inquiries {where_sql} ORDER BY created_at DESC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/inquiries/{inquiry_id}", tags=["Inquiries"], summary="Get inquiry by ID")
async def get_inquiry(inquiry_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM inquiries WHERE id = $1", [inquiry_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return dict(rows[0])

@app.post("/api/inquiries", tags=["Inquiries"], status_code=201, summary="Create inquiry")
async def create_inquiry(inq: InquiryCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO inquiries (client_name, phone_number, email, description, received_by, status, received_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW()) RETURNING *
    """
    params = [inq.client_name, inq.phone_number, inq.email, inq.description, inq.received_by, inq.status or "PENDING"]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/inquiries/{inquiry_id}", tags=["Inquiries"], summary="Update inquiry")
async def update_inquiry(inquiry_id: int, payload: InquiryUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(inquiry_id)
    query = f"UPDATE inquiries SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return dict(rows[0])

@app.delete("/api/inquiries/{inquiry_id}", tags=["Inquiries"], summary="Delete inquiry")
async def delete_inquiry(inquiry_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM inquiries WHERE id = $1 RETURNING id", [inquiry_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return {"message": "Inquiry deleted", "id": inquiry_id}

# ============================================================================
# Dedicated Files REST API Endpoints
# ============================================================================

@app.post("/api/files", tags=["Files"], status_code=201, summary="Upload a file")
async def upload_file(
    file: UploadFile = File(...),
    created_by: Optional[int] = Form(None)
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    data = await file.read()
    file_id = str(uuid.uuid4())
    query = """
        INSERT INTO files (id, filename, content_type, file_size, data, created_by, created_at)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
        RETURNING id, filename, content_type, file_size, created_at, created_by
    """
    params = [file_id, file.filename, file.content_type, len(data), data, created_by]
    async with db_pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, *params)
            row = dict(rows[0])
            row["id"] = str(row["id"])
            row["created_at"] = row["created_at"].isoformat() if row["created_at"] else None
            return row
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/files/{file_id}", tags=["Files"], summary="Download a file by ID")
async def download_file(file_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = "SELECT id, filename, content_type, file_size, data, created_at, created_by FROM files WHERE id = $1::uuid"
    async with db_pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, file_id)
            if not rows:
                raise HTTPException(status_code=404, detail="File not found")
            row = dict(rows[0])
            return Response(
                content=bytes(row["data"]),
                media_type=row["content_type"] or "application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{row["filename"]}"',
                    "Content-Length": str(row["file_size"] or len(row["data"])),
                }
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/files/{file_id}/meta", tags=["Files"], summary="Get file metadata (no binary data)")
async def get_file_meta(file_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = "SELECT id, filename, content_type, file_size, created_at, created_by FROM files WHERE id = $1::uuid"
    async with db_pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, file_id)
            if not rows:
                raise HTTPException(status_code=404, detail="File not found")
            row = dict(rows[0])
            row["id"] = str(row["id"])
            row["created_at"] = row["created_at"].isoformat() if row["created_at"] else None
            return row
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching file meta {file_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/files/{file_id}", tags=["Files"], summary="Delete a file")
async def delete_file(file_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")

    query = "DELETE FROM files WHERE id = $1::uuid RETURNING id"
    async with db_pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, file_id)
            if not rows:
                raise HTTPException(status_code=404, detail="File not found")
            return {"message": "File deleted", "id": file_id}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))

# Helper: resolve attachment metadata for a list of file UUIDs
async def _get_attachment_metas(conn, file_ids: List[str]) -> List[dict]:
    if not file_ids:
        return []
    rows = await conn.fetch(
        "SELECT id, filename, content_type, file_size, created_at, created_by FROM files WHERE id = ANY($1::uuid[])",
        file_ids
    )
    result = []
    for r in rows:
        meta = dict(r)
        meta["id"] = str(meta["id"])
        meta["created_at"] = meta["created_at"].isoformat() if meta["created_at"] else None
        meta["url"] = f"/api/files/{meta['id']}"
        result.append(meta)
    return result

# ============================================================================
# Dedicated Support Tickets REST API Endpoints
# ============================================================================

class TicketCreate(BaseModel):
    title: str
    created_by: int
    description: Optional[str] = None
    department: Optional[str] = "General"
    priority: Optional[str] = "MEDIUM"
    status: Optional[str] = "OPEN"
    # file_ids: list of already-uploaded file UUIDs to associate as attachments
    file_ids: Optional[List[str]] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    # file_ids: when provided, replaces all existing attachment associations
    file_ids: Optional[List[str]] = None

class TicketCommentCreate(BaseModel):
    author_id: int
    comment: str
    file_ids: Optional[List[str]] = None

class TicketCommentCreateFull(BaseModel):
    ticket_id: int
    author_id: int
    comment: str
    file_ids: Optional[List[str]] = None

class TicketCommentUpdate(BaseModel):
    comment: Optional[str] = None
    file_ids: Optional[List[str]] = None

class TicketHistoryCreate(BaseModel):
    ticket_id: int
    user_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

# ---------------------------------------------------------------------------
# Ticket/comment attachment helpers
# ---------------------------------------------------------------------------

async def _get_ticket_attachments(conn, ticket_id: int) -> List[dict]:
    rows = await conn.fetch(
        """
        SELECT f.id, f.filename, f.content_type, f.file_size, f.created_at, f.created_by
        FROM tickets_to_attachments ta
        JOIN files f ON f.id = ta.file_id
        WHERE ta.ticket_id = $1
        ORDER BY ta.created_at ASC
        """,
        ticket_id
    )
    result = []
    for r in rows:
        meta = dict(r)
        meta["id"] = str(meta["id"])
        meta["created_at"] = meta["created_at"].isoformat() if meta["created_at"] else None
        meta["url"] = f"/api/files/{meta['id']}"
        result.append(meta)
    return result

async def _get_comment_attachments(conn, comment_id: int) -> List[dict]:
    rows = await conn.fetch(
        """
        SELECT f.id, f.filename, f.content_type, f.file_size, f.created_at, f.created_by
        FROM comments_to_attachments ca
        JOIN files f ON f.id = ca.file_id
        WHERE ca.comment_id = $1
        ORDER BY ca.created_at ASC
        """,
        comment_id
    )
    result = []
    for r in rows:
        meta = dict(r)
        meta["id"] = str(meta["id"])
        meta["created_at"] = meta["created_at"].isoformat() if meta["created_at"] else None
        meta["url"] = f"/api/files/{meta['id']}"
        result.append(meta)
    return result

async def _set_ticket_attachments(conn, ticket_id: int, file_ids: List[str]):
    await conn.execute("DELETE FROM tickets_to_attachments WHERE ticket_id = $1", ticket_id)
    for fid in file_ids:
        await conn.execute(
            "INSERT INTO tickets_to_attachments (ticket_id, file_id) VALUES ($1, $2::uuid) ON CONFLICT DO NOTHING",
            ticket_id, fid
        )

async def _set_comment_attachments(conn, comment_id: int, file_ids: List[str]):
    await conn.execute("DELETE FROM comments_to_attachments WHERE comment_id = $1", comment_id)
    for fid in file_ids:
        await conn.execute(
            "INSERT INTO comments_to_attachments (comment_id, file_id) VALUES ($1, $2::uuid) ON CONFLICT DO NOTHING",
            comment_id, fid
        )

@app.get("/api/tickets", tags=["Support Tickets"], summary="List tickets with pagination")
async def list_tickets(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    q: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if status:
        params.append(status)
        where_parts.append(f"status = ${len(params)}")
    if priority:
        params.append(priority)
        where_parts.append(f"priority = ${len(params)}")
    if department:
        params.append(department)
        where_parts.append(f"department = ${len(params)}")
    if q:
        params.append(f"%{q}%")
        idx = len(params)
        where_parts.append(f"(title ILIKE ${idx} OR description ILIKE ${idx})")

    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM tickets {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(
            conn,
            f"SELECT * FROM tickets {where_sql} ORDER BY created_at DESC {limit_sql}",
            query_params
        )
        if not rows:
            return {"data": [], "total": total, "page": p_val, "limit": l_val, "total_pages": 0}

        ticket_ids = [r["id"] for r in rows]
        att_count_rows = await conn.fetch(
            "SELECT ticket_id, COUNT(*)::int AS att_count FROM tickets_to_attachments WHERE ticket_id = ANY($1::int[]) GROUP BY ticket_id",
            ticket_ids
        )
        att_counts = {r["ticket_id"]: r["att_count"] for r in att_count_rows}

        tickets = []
        for r in rows:
            ticket = dict(r)
            cnt = att_counts.get(ticket["id"], 0)
            ticket["attachment_count"] = cnt
            ticket["attachments"] = [{}] * cnt
            tickets.append(ticket)
        return {"data": tickets, "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/ticket-comments", tags=["Support Tickets"], summary="List ticket comments")
async def list_ticket_comments(
    ticket_id: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "asc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    order_sql = "ASC" if order.lower() == "asc" else "DESC"
    valid_sorts = {"id": "id", "created_at": "created_at", "ticket_id": "ticket_id"}
    sort_col = valid_sorts.get(sort_by, "created_at")

    async with db_pool.acquire() as conn:
        if ticket_id is not None:
            parsed = parse_id_list(ticket_id)
            if len(parsed) == 1:
                rows = await fetch_with_coerced_params(
                    conn,
                    f"SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY {sort_col} {order_sql}",
                    [parsed[0]]
                )
            elif len(parsed) > 1:
                rows = await fetch_with_coerced_params(
                    conn,
                    f"SELECT * FROM ticket_comments WHERE ticket_id = ANY($1::int[]) ORDER BY {sort_col} {order_sql}",
                    [parsed]
                )
            else:
                rows = []
        else:
            rows = await fetch_with_coerced_params(
                conn,
                f"SELECT * FROM ticket_comments ORDER BY {sort_col} {order_sql}",
                []
            )
        comments = []
        for r in rows:
            comment = dict(r)
            comment.pop("attachments", None)
            comment["attachments"] = await _get_comment_attachments(conn, comment["id"])
            comments.append(comment)
        return comments

@app.post("/api/ticket-comments", tags=["Support Tickets"], status_code=201, summary="Create ticket comment")
async def create_ticket_comment_standalone(c: TicketCommentCreateFull):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = "INSERT INTO ticket_comments (ticket_id, author_id, comment, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [c.ticket_id, c.author_id, c.comment])
        comment = dict(rows[0])
        if c.file_ids:
            await _set_comment_attachments(conn, comment["id"], c.file_ids)
        comment.pop("attachments", None)
        comment["attachments"] = await _get_comment_attachments(conn, comment["id"])
        return comment

@app.put("/api/ticket-comments/{comment_id}", tags=["Support Tickets"], summary="Update ticket comment")
async def update_ticket_comment(comment_id: int, payload: TicketCommentUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if payload.comment is not None:
            rows = await fetch_with_coerced_params(
                conn,
                "UPDATE ticket_comments SET comment = $1 WHERE id = $2 RETURNING *",
                [payload.comment, comment_id]
            )
            if not rows:
                raise HTTPException(status_code=404, detail="Comment not found")
        else:
            rows = await fetch_with_coerced_params(
                conn, "SELECT * FROM ticket_comments WHERE id = $1", [comment_id]
            )
            if not rows:
                raise HTTPException(status_code=404, detail="Comment not found")

        if payload.file_ids is not None:
            await _set_comment_attachments(conn, comment_id, payload.file_ids)

        comment = dict(rows[0])
        comment.pop("attachments", None)
        comment["attachments"] = await _get_comment_attachments(conn, comment_id)
        return comment

@app.delete("/api/ticket-comments/{comment_id}", tags=["Support Tickets"], summary="Delete ticket comment")
async def delete_ticket_comment(comment_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM ticket_comments WHERE id = $1 RETURNING id", [comment_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted", "id": comment_id}

@app.get("/api/ticket-history", tags=["Support Tickets"], summary="List ticket history")
async def list_ticket_history(
    ticket_id: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    order_sql = "ASC" if order.lower() == "asc" else "DESC"
    valid_sorts = {"id": "id", "created_at": "created_at", "ticket_id": "ticket_id"}
    sort_col = valid_sorts.get(sort_by, "created_at")

    async with db_pool.acquire() as conn:
        if ticket_id is not None:
            parsed = parse_id_list(ticket_id)
            if len(parsed) == 1:
                rows = await fetch_with_coerced_params(
                    conn,
                    f"SELECT * FROM ticket_history WHERE ticket_id = $1 ORDER BY {sort_col} {order_sql}",
                    [parsed[0]]
                )
            elif len(parsed) > 1:
                rows = await fetch_with_coerced_params(
                    conn,
                    f"SELECT * FROM ticket_history WHERE ticket_id = ANY($1::int[]) ORDER BY {sort_col} {order_sql}",
                    [parsed]
                )
            else:
                rows = []
        else:
            rows = await fetch_with_coerced_params(
                conn,
                f"SELECT * FROM ticket_history ORDER BY {sort_col} {order_sql}"
            )
        return [dict(r) for r in rows]

@app.post("/api/ticket-history", tags=["Support Tickets"], status_code=201, summary="Create ticket history entry")
async def create_ticket_history_entry(h: TicketHistoryCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = "INSERT INTO ticket_history (ticket_id, user_id, field_name, old_value, new_value, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [h.ticket_id, h.user_id, h.field_name, h.old_value, h.new_value])
        return dict(rows[0])

@app.get("/api/tickets/{ticket_id}", tags=["Support Tickets"], summary="Get ticket with comments and attachments")
async def get_ticket(ticket_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        t_rows = await fetch_with_coerced_params(conn, "SELECT * FROM tickets WHERE id = $1", [ticket_id])
        if not t_rows:
            raise HTTPException(status_code=404, detail="Ticket not found")
        ticket = dict(t_rows[0])
        ticket.pop("attachments", None)
        ticket["attachments"] = await _get_ticket_attachments(conn, ticket_id)
        c_rows = await fetch_with_coerced_params(
            conn,
            "SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC",
            [ticket_id]
        )
        comments = []
        for c in c_rows:
            comment = dict(c)
            comment.pop("attachments", None)
            comment["attachments"] = await _get_comment_attachments(conn, comment["id"])
            comments.append(comment)
        ticket["comments"] = comments
        return ticket

@app.post("/api/tickets", tags=["Support Tickets"], status_code=201, summary="Create ticket")
async def create_ticket(t: TicketCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO tickets (title, description, department, priority, status, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
    """
    params = [t.title, t.description, t.department or "General", t.priority or "MEDIUM", t.status or "OPEN", t.created_by]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        ticket = dict(rows[0])
        if t.file_ids:
            await _set_ticket_attachments(conn, ticket["id"], t.file_ids)
        ticket.pop("attachments", None)
        ticket["attachments"] = await _get_ticket_attachments(conn, ticket["id"])
        return ticket

@app.put("/api/tickets/{ticket_id}", tags=["Support Tickets"], summary="Update ticket")
async def update_ticket(ticket_id: int, payload: TicketUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        fields, params = [], []
        data = payload.model_dump(exclude_unset=True)
        data.pop("file_ids", None)  # handled via mapping table separately
        for k, v in data.items():
            if v is not None:
                params.append(v)
                fields.append(f"{k} = ${len(params)}")

        if fields:
            params.append(ticket_id)
            query = f"UPDATE tickets SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
            rows = await fetch_with_coerced_params(conn, query, params)
            if not rows:
                raise HTTPException(status_code=404, detail="Ticket not found")
        else:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM tickets WHERE id = $1", [ticket_id])
            if not rows:
                raise HTTPException(status_code=404, detail="Ticket not found")

        if payload.file_ids is not None:
            await _set_ticket_attachments(conn, ticket_id, payload.file_ids)

        ticket = dict(rows[0])
        ticket.pop("attachments", None)
        ticket["attachments"] = await _get_ticket_attachments(conn, ticket_id)
        return ticket

@app.post("/api/tickets/{ticket_id}/comments", tags=["Support Tickets"], status_code=201, summary="Add comment to ticket")
async def add_ticket_comment(ticket_id: int, c: TicketCommentCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = "INSERT INTO ticket_comments (ticket_id, author_id, comment, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [ticket_id, c.author_id, c.comment])
        comment = dict(rows[0])
        if c.file_ids:
            await _set_comment_attachments(conn, comment["id"], c.file_ids)
        comment.pop("attachments", None)
        comment["attachments"] = await _get_comment_attachments(conn, comment["id"])
        return comment

@app.delete("/api/tickets/{ticket_id}", tags=["Support Tickets"], summary="Delete ticket")
async def delete_ticket(ticket_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM tickets WHERE id = $1 RETURNING id", [ticket_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"message": "Ticket deleted", "id": ticket_id}

# ============================================================================
# Dedicated Materials & Material Inward REST API Endpoints
# ============================================================================

class MaterialCreate(BaseModel):
    name: str

class MaterialInwardCreate(BaseModel):
    created_by: int
    job_order_no: Optional[str] = None
    po_wo_number: Optional[str] = None
    status: Optional[str] = "RECEIVED"
    client_id: Optional[int] = None
    job_id: Optional[int] = None

class MaterialInwardUpdate(BaseModel):
    job_order_no: Optional[str] = None
    po_wo_number: Optional[str] = None
    status: Optional[str] = None
    client_id: Optional[int] = None
    job_id: Optional[int] = None
    updated_by: Optional[int] = None

@app.get("/api/materials", tags=["Materials & Material Inward"], summary="List master materials")
async def list_materials():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM materials ORDER BY name ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/materials", tags=["Materials & Material Inward"], status_code=201, summary="Create master material")
async def create_material(mat: MaterialCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO materials (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING *", [mat.name])
        return dict(rows[0])

@app.delete("/api/materials/{material_id}", tags=["Materials & Material Inward"], summary="Delete master material")
async def delete_material(material_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM materials WHERE id = $1 RETURNING id", [material_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Material not found")
        return {"message": "Material deleted", "id": material_id}

class MaterialFormAssocCreate(BaseModel):
    material_id: int
    form_type: str

class MaterialFormAssocBulkCreate(BaseModel):
    items: List[MaterialFormAssocCreate]

@app.get("/api/material-form-associations", tags=["Materials & Material Inward"], summary="List material form associations")
async def list_material_form_associations(material_id: Optional[int] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if material_id is not None:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM material_form_associations WHERE material_id = $1", [material_id])
        else:
            rows = await fetch_with_coerced_params(conn, "SELECT * FROM material_form_associations ORDER BY id ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/material-form-associations", tags=["Materials & Material Inward"], status_code=201, summary="Create material form associations (single or bulk)")
async def create_material_form_association(payload: MaterialFormAssocCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO material_form_associations (material_id, form_type) VALUES ($1, $2) RETURNING *", [payload.material_id, payload.form_type])
        return dict(rows[0]) if rows else {}

@app.post("/api/material-form-associations/bulk", tags=["Materials & Material Inward"], status_code=201, summary="Bulk create material form associations")
async def bulk_create_material_form_associations(payload: MaterialFormAssocBulkCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    results = []
    async with db_pool.acquire() as conn:
        for item in payload.items:
            rows = await fetch_with_coerced_params(conn, "INSERT INTO material_form_associations (material_id, form_type) VALUES ($1, $2) RETURNING *", [item.material_id, item.form_type])
            if rows:
                results.append(dict(rows[0]))
    return results

@app.delete("/api/material-form-associations", tags=["Materials & Material Inward"], summary="Delete material form associations by material_id")
async def delete_material_form_associations(material_id: Optional[int] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        if material_id is not None:
            await conn.execute("DELETE FROM material_form_associations WHERE material_id = $1", material_id)
        return {"message": "Associations deleted"}

@app.get("/api/material-inward", tags=["Materials & Material Inward"], summary="List material inward register")
async def list_material_inward(page: Optional[int] = None, limit: Optional[int] = None, status: Optional[str] = None, client_id: Optional[str] = None, job_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if status:
        params.append(status)
        where_parts.append(f"status = ${len(params)}")
    if client_id is not None:
        parsed = parse_id_list(client_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"client_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"client_id = ANY(${len(params)}::int[])")
    if job_id is not None:
        parsed = parse_id_list(job_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"job_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"job_id = ANY(${len(params)}::int[])")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM material_inward_register {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM material_inward_register {where_sql} ORDER BY created_at DESC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/material-inward/{inward_id}", tags=["Materials & Material Inward"], summary="Get material inward entry by ID")
async def get_material_inward(inward_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM material_inward_register WHERE id = $1", [inward_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Material inward entry not found")
        return dict(rows[0])

@app.post("/api/material-inward", tags=["Materials & Material Inward"], status_code=201, summary="Register material inward")
async def create_material_inward(mi: MaterialInwardCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO material_inward_register (job_order_no, po_wo_number, status, client_id, job_id, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6, NOW(), NOW()) RETURNING *
    """
    params = [mi.job_order_no, mi.po_wo_number, mi.status or "RECEIVED", mi.client_id, mi.job_id, mi.created_by]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.put("/api/material-inward/{inward_id}", tags=["Materials & Material Inward"], summary="Update material inward entry")
async def update_material_inward(inward_id: int, payload: MaterialInwardUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            params.append(v)
            fields.append(f"{k} = ${len(params)}")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(inward_id)
    query = f"UPDATE material_inward_register SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Material inward entry not found")
        return dict(rows[0])

@app.delete("/api/material-inward/{inward_id}", tags=["Materials & Material Inward"], summary="Delete material inward entry")
async def delete_material_inward(inward_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM material_inward_register WHERE id = $1 RETURNING id", [inward_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Material inward entry not found")
        return {"message": "Material inward entry deleted", "id": inward_id}

# ============================================================================
# Master Terms & Technical Specifications REST API Endpoints
# ============================================================================

class TermCreate(BaseModel):
    text: str
    type: Optional[str] = "GENERAL"

@app.get("/api/payment-terms", tags=["Master Terms & Technicals"], summary="List payment terms")
async def list_payment_terms():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM payment_terms ORDER BY id ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/payment-terms", tags=["Master Terms & Technicals"], status_code=201, summary="Create payment term")
async def create_payment_term(item: TermCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO payment_terms (text, type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *", [item.text, item.type or "GENERAL"])
        return dict(rows[0])

@app.delete("/api/payment-terms/{term_id}", tags=["Master Terms & Technicals"], summary="Delete payment term")
async def delete_payment_term(term_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM payment_terms WHERE id = $1 RETURNING id", [term_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Payment term not found")
        return {"message": "Payment term deleted", "id": term_id}

@app.get("/api/terms-conditions", tags=["Master Terms & Technicals"], summary="List terms and conditions")
async def list_terms_conditions():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM terms_and_conditions ORDER BY id ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/terms-conditions", tags=["Master Terms & Technicals"], status_code=201, summary="Create term and condition")
async def create_term_condition(item: TermCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO terms_and_conditions (text, type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *", [item.text, item.type or "GENERAL"])
        return dict(rows[0])

@app.delete("/api/terms-conditions/{term_id}", tags=["Master Terms & Technicals"], summary="Delete term and condition")
async def delete_term_condition(term_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM terms_and_conditions WHERE id = $1 RETURNING id", [term_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Term and condition not found")
        return {"message": "Term and condition deleted", "id": term_id}

@app.get("/api/technicals", tags=["Master Terms & Technicals"], summary="List technical specifications")
async def list_technicals():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM technicals ORDER BY id ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/technicals", tags=["Master Terms & Technicals"], status_code=201, summary="Create technical specification")
async def create_technical(item: TermCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO technicals (text, type, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *", [item.text, item.type or "GENERAL"])
        return dict(rows[0])

@app.delete("/api/technicals/{tech_id}", tags=["Master Terms & Technicals"], summary="Delete technical specification")
async def delete_technical(tech_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM technicals WHERE id = $1 RETURNING id", [tech_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Technical specification not found")
        return {"message": "Technical specification deleted", "id": tech_id}

# ============================================================================
# Dedicated App Settings REST API Endpoints
# ============================================================================

class AppSettingCreate(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str] = None

@app.get("/api/app-settings", tags=["App Settings"], summary="List application settings")
async def list_app_settings():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM app_settings ORDER BY setting_key ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/app-settings", tags=["App Settings"], status_code=201, summary="Upsert application setting")
async def upsert_app_setting(item: AppSettingCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO app_settings (setting_key, setting_value, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *
    """
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [item.setting_key, item.setting_value, item.description])
        return dict(rows[0])

@app.delete("/api/app-settings/{setting_id}", tags=["App Settings"], summary="Delete application setting")
async def delete_app_setting(setting_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM app_settings WHERE id = $1 RETURNING id", [setting_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Application setting not found")
        return {"message": "Application setting deleted", "id": setting_id}

# ============================================================================
# Dedicated Banking REST API Endpoints
# ============================================================================

class BankAccountCreate(BaseModel):
    bank_name: str
    bank_account_holder_name: str
    bank_account_number: str
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    is_default: Optional[bool] = False
    qr_code_url: Optional[str] = None

class BankStatementCreate(BaseModel):
    date: str
    particulars: str
    debit_amt: Optional[float] = 0.0
    credit_amt: Optional[float] = 0.0
    balance_amt: Optional[float] = 0.0
    ref_num: Optional[str] = None
    transaction_id: Optional[str] = None
    source: Optional[str] = "MANUAL"
    sheet_number: Optional[str] = None

@app.get("/api/bank-accounts", tags=["Banking"], summary="List bank accounts")
async def list_bank_accounts():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM bank_accounts ORDER BY created_at ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/bank-accounts", tags=["Banking"], status_code=201, summary="Create bank account")
async def create_bank_account(b: BankAccountCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO bank_accounts (bank_name, bank_account_holder_name, bank_account_number, branch_name, ifsc_code, is_default, qr_code_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *
    """
    params = [b.bank_name, b.bank_account_holder_name, b.bank_account_number, b.branch_name, b.ifsc_code, b.is_default or False, b.qr_code_url]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

@app.delete("/api/bank-accounts/{account_id}", tags=["Banking"], summary="Delete bank account")
async def delete_bank_account(account_id: str):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM bank_accounts WHERE id = $1::uuid RETURNING id", [account_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Bank account not found")
        return {"message": "Bank account deleted", "id": account_id}

@app.get("/api/bank-statements", tags=["Banking"], summary="List bank statement transactions")
async def list_bank_statements(page: Optional[int] = None, limit: Optional[int] = None, source: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if source:
        params.append(source)
        where_parts.append(f"source = ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM bank_statements {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM bank_statements {where_sql} ORDER BY date DESC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.post("/api/bank-statements", tags=["Banking"], status_code=201, summary="Add bank statement transaction")
async def create_bank_statement(bs: BankStatementCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    query = """
        INSERT INTO bank_statements (date, particulars, debit_amt, credit_amt, balance_amt, ref_num, transaction_id, source, sheet_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *
    """
    params = [bs.date, bs.particulars, bs.debit_amt, bs.credit_amt, bs.balance_amt, bs.ref_num, bs.transaction_id, bs.source or "MANUAL", bs.sheet_number]
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        return dict(rows[0])

# ============================================================================
# Dedicated Collection Centers REST API Endpoints
# ============================================================================

class CollectionCenterCreate(BaseModel):
    name: str
    address: Optional[str] = None

@app.get("/api/collection-centers", tags=["Collection Centers"], summary="List collection centers")
async def list_collection_centers():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM collection_centers ORDER BY name ASC", [])
        return [dict(r) for r in rows]

@app.post("/api/collection-centers", tags=["Collection Centers"], status_code=201, summary="Create collection center")
async def create_collection_center(cc: CollectionCenterCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "INSERT INTO collection_centers (name, address, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *", [cc.name, cc.address])
        return dict(rows[0])

@app.delete("/api/collection-centers/{center_id}", tags=["Collection Centers"], summary="Delete collection center")
async def delete_collection_center(center_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM collection_centers WHERE id = $1 RETURNING id", [center_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Collection center not found")
        return {"message": "Collection center deleted", "id": center_id}

# ============================================================================
# Dedicated Test Reports REST API Endpoints
# ============================================================================

class ReportCreate(BaseModel):
    report_number: str
    created_by: int
    client_id: Optional[int] = None
    content: Optional[Any] = None

class ReportUpdate(BaseModel):
    report_number: Optional[str] = None
    content: Optional[Any] = None
    client_id: Optional[int] = None

@app.get("/api/reports", tags=["Test Reports"], summary="List test reports with pagination")
async def list_reports(page: Optional[int] = None, limit: Optional[int] = None, q: Optional[str] = None, client_id: Optional[str] = None):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    where_parts, params = [], []
    if client_id is not None:
        parsed = parse_id_list(client_id)
        if len(parsed) == 1:
            params.append(parsed[0])
            where_parts.append(f"client_id = ${len(params)}")
        elif len(parsed) > 1:
            params.append(parsed)
            where_parts.append(f"client_id = ANY(${len(params)}::int[])")
    if q:
        params.append(f"%{q}%")
        where_parts.append(f"report_number ILIKE ${len(params)}")
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    async with db_pool.acquire() as conn:
        count_rows = await fetch_with_coerced_params(conn, f"SELECT COUNT(*) FROM reports {where_sql}", params)
        total = count_rows[0]["count"] if count_rows else 0
        if limit is not None:
            p_val = max(1, page or 1)
            l_val = max(1, limit)
            o_val = (p_val - 1) * l_val
            query_params = list(params) + [l_val, o_val]
            limit_sql = f"LIMIT ${len(query_params)-1} OFFSET ${len(query_params)}"
            total_pages = (total + l_val - 1) // l_val if total > 0 else 0
        else:
            p_val = page or 1
            l_val = None
            query_params = list(params)
            limit_sql = ""
            total_pages = 1

        rows = await fetch_with_coerced_params(conn, f"SELECT * FROM reports {where_sql} ORDER BY created_at DESC {limit_sql}", query_params)
        return {"data": [dict(r) for r in rows], "total": total, "page": p_val, "limit": l_val, "total_pages": total_pages}

@app.get("/api/reports/{report_id}", tags=["Test Reports"], summary="Get report by ID")
async def get_report(report_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "SELECT * FROM reports WHERE id = $1", [report_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Report not found")
        return dict(rows[0])

@app.post("/api/reports", tags=["Test Reports"], status_code=201, summary="Create test report")
async def create_report(rep: ReportCreate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    content_str = format_content(rep.content) if rep.content is not None else None
    query = "INSERT INTO reports (report_number, created_by, client_id, content, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW()) RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, [rep.report_number, rep.created_by, rep.client_id, content_str])
        return dict(rows[0])

@app.put("/api/reports/{report_id}", tags=["Test Reports"], summary="Update test report")
async def update_report(report_id: int, payload: ReportUpdate):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    fields, params = [], []
    if payload.report_number is not None:
        params.append(payload.report_number)
        fields.append(f"report_number = ${len(params)}")
    if payload.client_id is not None:
        params.append(payload.client_id)
        fields.append(f"client_id = ${len(params)}")
    if payload.content is not None:
        params.append(format_content(payload.content))
        fields.append(f"content = ${len(params)}::jsonb")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields.append("updated_at = NOW()")
    params.append(report_id)
    query = f"UPDATE reports SET {', '.join(fields)} WHERE id = ${len(params)} RETURNING *"
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, query, params)
        if not rows:
            raise HTTPException(status_code=404, detail="Report not found")
        return dict(rows[0])

@app.delete("/api/reports/{report_id}", tags=["Test Reports"], summary="Delete test report")
async def delete_report(report_id: int):
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not connected")
    async with db_pool.acquire() as conn:
        rows = await fetch_with_coerced_params(conn, "DELETE FROM reports WHERE id = $1 RETURNING id", [report_id])
        if not rows:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"message": "Report deleted", "id": report_id}

# Serve UI static files
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))
if not os.path.exists(dist_path):
    dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../ui/dist"))
if not os.path.exists(dist_path):
    dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../dist"))

if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

@app.get("/{catchall:path}")
async def read_index(catchall: str):
    if catchall.startswith("api/") or catchall.startswith("api"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Static files check
    file_path = os.path.join(dist_path, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # SPA fallback to index.html
    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": f"Vite build not found at {dist_path}. Please build the project."}

