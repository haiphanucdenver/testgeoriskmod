# ...existing code...
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
import sys

# load .env from file next to this script (safer than relying on CWD)
env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    print(f".env not found at {env_path}. Create it with DB_* variables.", file=sys.stderr)
    sys.exit(1)

load_dotenv(dotenv_path=env_path)

def get_conn():
    """Establishes and returns a new database connection."""
    host = os.getenv("DB_HOST")
    if not host:
        raise RuntimeError("DB_HOST not set. Ensure .env is present and loaded.")
    try:
        conn = psycopg2.connect(
            host=host,
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            sslmode=os.getenv("DB_SSLMODE", "require"),
            connect_timeout=10,
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"--- DATABASE CONNECTION FAILED ---", file=sys.stderr)
        print(f"Error: {e}", file=sys.stderr)
        print("Please check your .env file and network/security group access.", file=sys.stderr)
        return None

if __name__ == "__main__":
    # Debug: show where .env was loaded from and masked values
    def _mask(s: str | None, show=3):
        if not s:
            return None
        return s[:show] + "..." + s[-show:]

    print("DEBUG: .env path =", env_path)
    print("DEBUG: DB_HOST =", os.getenv("DB_HOST"))
    print("DEBUG: DB_PORT =", os.getenv("DB_PORT"))
    print("DEBUG: DB_NAME =", os.getenv("DB_NAME"))
    print("DEBUG: DB_USER =", _mask(os.getenv("DB_USER")))
    print("DEBUG: DB_PASSWORD =", "***REDACTED***" if os.getenv("DB_PASSWORD") else None)

    conn = get_conn()
    if conn is None:
        sys.exit(1)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT now() AS now")
            print(cur.fetchone())
    finally:
        conn.close()
