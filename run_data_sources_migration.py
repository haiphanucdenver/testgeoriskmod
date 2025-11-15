#!/usr/bin/env python3
"""
Migration script to add the data_sources table to the database
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the SQL migration to create data_sources table"""
    try:
        # Connect to database
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

        # Read the SQL migration file
        with open('add_data_sources_table.sql', 'r') as f:
            sql_script = f.read()

        # Execute the migration
        with conn.cursor() as cur:
            print("\n🔄 Executing migration to create data_sources table...")
            cur.execute(sql_script)
            conn.commit()
            print("✅ Migration completed successfully!")

            # Verify the table was created
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'data_sources'
            """)
            result = cur.fetchone()

            if result:
                print("\n✅ data_sources table verified!")

                # Count rows
                cur.execute("SELECT COUNT(*) FROM data_sources")
                count = cur.fetchone()[0]
                print(f"📊 Table contains {count} initial data source records")

                # Show sample data
                cur.execute("""
                    SELECT item_id, source_name, factor_category, status
                    FROM data_sources
                    ORDER BY factor_category, item_id
                    LIMIT 5
                """)
                samples = cur.fetchall()
                print("\nSample data sources:")
                for item_id, name, category, status in samples:
                    print(f"  [{category}] {item_id}: {name} ({status})")
            else:
                print("\n❌ Warning: data_sources table not found after migration!")

        conn.close()
        print("\n" + "="*80)
        print("✅ Migration completed successfully! You can now restart the API server.")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit(run_migration())
