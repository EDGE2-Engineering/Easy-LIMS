import asyncio
import asyncpg
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

base_dir = os.path.join(os.path.dirname(__file__), "..", "server")
for env_name in ["dev.env", ".env"]:
    load_dotenv(os.path.join(base_dir, "..", env_name))
    load_dotenv(os.path.join(base_dir, env_name))
load_dotenv()

DB_USER = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "postgres"))
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", ""))
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "postgres"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

def coerce_value(val, type_name):
    return val

def sanitize_row(row):
    return dict(row) if row else {}

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

async def test():
    ssl_val = "require" if "supabase.co" in DATABASE_URL or "sslmode=require" in DATABASE_URL or "pooler.supabase.com" in DATABASE_URL else None
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3, statement_cache_size=0, ssl=ssl_val)
    async with pool.acquire() as conn:
        parsed = [386, 385, 384]
        where_parts = []
        params = []
        
        params.append(parsed)
        where_parts.append(f"j.id = ANY(${len(params)}::int[])")
        where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        print("1. Testing count_query...")
        try:
            count_query = f"SELECT COUNT(*) FROM jobs j {where_sql}"
            print("count_query:", count_query, "params:", params)
            count_rows = await fetch_with_coerced_params(conn, count_query, params)
            print("count_rows:", count_rows)
        except Exception as e:
            print("count_query FAILED:", type(e), e)

        print("\n2. Testing data_query...")
        try:
            query_params = list(params)
            query_params.append(10000)
            limit_idx = len(query_params)
            query_params.append(0)
            offset_idx = len(query_params)

            data_query = f"""
                SELECT 
                    j.*,
                    CASE WHEN u.id IS NOT NULL THEN jsonb_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username, 'role', u.role, 'departments', u.departments) ELSE NULL END AS users,
                    CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('client_name', c.client_name, 'gstin', c.gstin) ELSE NULL END AS clients
                FROM jobs j
                LEFT JOIN users u ON j.created_by = u.id
                LEFT JOIN clients c ON j.client_id = c.id
                {where_sql}
                ORDER BY j.created_at DESC
                LIMIT ${limit_idx} OFFSET ${offset_idx}
            """
            print("data_query:", data_query, "query_params:", query_params)
            rows = await fetch_with_coerced_params(conn, data_query, query_params)
            print("rows count:", len(rows))
        except Exception as e:
            print("data_query FAILED:", type(e), e)

    await pool.close()

asyncio.run(test())
