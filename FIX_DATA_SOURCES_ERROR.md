# Fix for Data Sources Table Error

## Problem
The API endpoint `/api/data-sources` was returning a 500 Internal Server Error with the message:
```
psycopg2.errors.UndefinedTable: relation "data_sources" does not exist
```

## Root Cause
The `data_sources` table was missing from the database schema. This table is required to track data sources for H (Hazard), L (Local Lore), and V (Vulnerability) factors in the GEORISKMOD system.

## Solution

### Option 1: Run the Python Migration Script (Recommended)

1. Make sure you're in your virtual environment:
   ```bash
   source venv/bin/activate  # or source .venv/bin/activate
   ```

2. Run the migration script:
   ```bash
   python run_data_sources_migration.py
   ```

   This will:
   - Create the `data_sources` table with all required columns
   - Add appropriate indexes for performance
   - Insert default data source records for H, L, and V factors

### Option 2: Run the SQL Script Manually

If the Python script doesn't work, you can run the SQL directly:

1. Connect to your PostgreSQL database using your preferred method (psql, pgAdmin, etc.)

2. Run the SQL script:
   ```bash
   psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f add_data_sources_table.sql
   ```

   Or copy and paste the contents of `add_data_sources_table.sql` into your SQL client.

### Option 3: Use psql with Environment Variables

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f add_data_sources_table.sql
```

## Verification

After running the migration, you can verify the table was created:

1. Check that the table exists:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'data_sources';
   ```

2. Check the data sources:
   ```sql
   SELECT item_id, source_name, factor_category, status
   FROM data_sources
   ORDER BY factor_category, item_id;
   ```

3. Test the API endpoint:
   - Restart your API server: `python api_server.py`
   - Visit: http://localhost:8001/api/data-sources
   - You should see a JSON response with the data sources

## Table Structure

The `data_sources` table includes:
- **source_id**: Primary key
- **item_id**: Unique identifier (e.g., 'h-factor-dem')
- **source_name**: Display name
- **description**: Optional description
- **source_type**: Type of source ('file', 'api', 'database')
- **factor_category**: 'H', 'L', or 'V'
- **status**: 'missing', 'uploaded', or 'connected'
- File-related fields: file_format, file_type, file_path
- API-related fields: api_endpoint, api_service
- Metadata: current_version, last_updated, uploaded_by, created_at, updated_at

## Files Created/Modified

1. **add_data_sources_table.sql** - SQL migration script
2. **run_data_sources_migration.py** - Python migration helper
3. **databaseSourceCode.txt** - Updated with data_sources table schema
4. **FIX_DATA_SOURCES_ERROR.md** - This documentation file

## Next Steps

After the migration is complete:
1. Restart your API server
2. The `/api/data-sources` endpoint should now work correctly
3. You can manage data sources through the Data Management interface
