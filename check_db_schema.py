#!/usr/bin/env python3
"""
Quick script to check database schema and tables
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def check_database():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            sslmode=os.getenv("DB_SSLMODE", "require"),
        )

        print("✅ Database connection successful!")
        print(f"Connected to: {os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}")
        print("\n" + "="*80)

        with conn.cursor() as cur:
            # Check all tables
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = cur.fetchall()

            print(f"\n📊 Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table[0]}")

            # Check if lore_stories table exists
            table_names = [t[0] for t in tables]
            if 'lore_stories' in table_names:
                print("\n✅ lore_stories table EXISTS")
                cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lore_stories' ORDER BY ordinal_position;")
                columns = cur.fetchall()
                print("\nColumns in lore_stories:")
                for col, dtype in columns:
                    print(f"   - {col}: {dtype}")
            else:
                print("\n❌ lore_stories table DOES NOT EXIST")
                print("   This table is required for AI agent story submission.")

            # Check if local_lore table exists
            if 'local_lore' in table_names:
                print("\n✅ local_lore table EXISTS")
            else:
                print("\n❌ local_lore table DOES NOT EXIST")

        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database()
