#!/usr/bin/env python3
"""
CLI utility to apply SQL scripts against the configured PostgreSQL database.
Reads database configuration from .env or environment variables.

Usage:
    python3 scripts/apply_sql.py [path/to/script.sql]
Example:
    python3 scripts/apply_sql.py setup.sql
"""

import os
import sys
import asyncio
from pathlib import Path
from urllib.parse import quote_plus


def load_environment():
    """Load .env files without requiring external python-dotenv package."""
    root_dir = Path(__file__).resolve().parent.parent
    dotenv_paths = [root_dir / ".env", root_dir / "server" / ".env"]
    for p in dotenv_paths:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key and key not in os.environ:
                        os.environ[key] = val
            except Exception:
                pass


def get_database_url() -> str:
    load_environment()
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    db_user = os.getenv("DB_USER") or os.getenv("POSTGRES_USER") or "postgres"
    db_pass = os.getenv("DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or ""
    db_host = os.getenv("DB_HOST") or os.getenv("POSTGRES_HOST") or "localhost"
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME") or os.getenv("POSTGRES_DB") or "postgres"

    return f"postgresql://{quote_plus(db_user)}:{quote_plus(db_pass)}@{db_host}:{db_port}/{db_name}"


async def apply_sql_file(file_path: Path):
    if not file_path.exists():
        print(f"[ERROR] SQL file not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    sql_content = file_path.read_text(encoding="utf-8")
    if not sql_content.strip():
        print(f"[WARN] SQL file is empty: {file_path}")
        return

    try:
        import asyncpg
    except ImportError:
        print("[ERROR] 'asyncpg' is not installed in current Python environment.", file=sys.stderr)
        print("Please run using the project virtual environment:", file=sys.stderr)
        print("    .venv/bin/python scripts/apply_sql.py setup.sql", file=sys.stderr)
        print("Or run via Makefile:", file=sys.stderr)
        print("    make db-setup", file=sys.stderr)
        sys.exit(1)

    db_url = get_database_url()
    # Mask credentials for safe logging
    safe_display_url = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"Connecting to database (...@{safe_display_url})...")

    ssl_val = "require" if "sslmode=require" in db_url else None

    conn = await asyncpg.connect(db_url, ssl=ssl_val, timeout=15.0)
    try:
        print(f"Applying SQL script '{file_path.name}'...")
        await conn.execute(sql_content)
        print(f"✓ Successfully applied '{file_path.name}' to database.")
    finally:
        await conn.close()


def main():
    target_file = sys.argv[1] if len(sys.argv) > 1 else "setup.sql"
    path = Path(target_file)
    if not path.is_absolute():
        root_dir = Path(__file__).resolve().parent.parent
        path = (root_dir / path).resolve()

    try:
        asyncio.run(apply_sql_file(path))
    except Exception as e:
        print(f"[ERROR] Failed to apply SQL script: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
