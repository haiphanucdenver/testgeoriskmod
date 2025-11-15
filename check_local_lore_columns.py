#!/usr/bin/env python3
"""Check local_lore table columns"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    sslmode=os.getenv("DB_SSLMODE", "require"),
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'local_lore'
        ORDER BY ordinal_position;
    """)
    columns = cur.fetchall()

    print("Columns in local_lore table:")
    for col, dtype in columns:
        print(f"  {col}: {dtype}")

conn.close()
