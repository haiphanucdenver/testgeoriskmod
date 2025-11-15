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

            # Check if lore_narrative table exists OR lore_narrative column exists on local_lore
            table_names = [t[0] for t in tables]
            # Prefer a dedicated table, but accept a column on local_lore as equivalent (legacy schema)
            if 'lore_narrative' in table_names:
                print("\n✅ lore_narrative table EXISTS")
                cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lore_narrative' ORDER BY ordinal_position;")
                columns = cur.fetchall()
                print("\nColumns in lore_narrative:")
                for col, dtype in columns:
                    print(f"   - {col}: {dtype}")
            else:
                # Check for lore_narrative as a column on local_lore
                if 'local_lore' in table_names:
                    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'local_lore' ORDER BY ordinal_position;")
                    local_cols = cur.fetchall()
                    col_names = [c[0] for c in local_cols]
                    if 'lore_narrative' in col_names:
                        dtype = next((c[1] for c in local_cols if c[0] == 'lore_narrative'), 'unknown')
                        print("\n✅ lore_narrative column EXISTS in local_lore")
                        print(f"   Column type: {dtype}")
                    else:
                        print("\n❌ lore_narrative table DOES NOT EXIST")
                        print("   However, local_lore table exists. The AI subsystem expects either:")
                        print("     - a dedicated table named 'lore_narrative' OR")
                        print("     - a column named 'lore_narrative' on 'local_lore' containing story text.")
                        print("\n   Quick fixes:")
                        print("   1) Add a lore_narrative column to local_lore:")
                        print("      ALTER TABLE local_lore ADD COLUMN lore_narrative TEXT;")
                        print("   2) Or create a separate lore_narrative table (example):")
                        print('''      CREATE TABLE lore_narrative (
          id SERIAL PRIMARY KEY,
          local_lore_id INTEGER REFERENCES local_lore(id),
          narrative TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );''')
                else:
                    print("\n❌ lore_narrative table DOES NOT EXIST")
                    print("   This table (or a lore_narrative column on local_lore) is required for AI agent story submission.")

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
