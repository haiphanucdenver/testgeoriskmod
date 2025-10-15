<<<<<<< HEAD
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import random
# Load environment variables from .env file
load_dotenv()

# --- Database Connection ---
def get_conn():
    """Establishes and returns a new database connection."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        sslmode=os.getenv("DB_SSLMODE", "require"),
        connect_timeout=10,
    )

# --- Data Insertion Functions ---
# Note: These now accept a 'conn' object for efficiency
def insert_location(conn, name: str, lat: float, lon: float, description: str = None, region: str = None) -> int:
    sql = """
    INSERT INTO location (name, coordinates, description, region)
    VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s)
    RETURNING location_id;
    """
    with conn.cursor() as cur:
        cur.execute(sql, (name, lon, lat, description, region))
        return cur.fetchone()[0]

def insert_event(conn, location_id: int, hazard_type: str, date_observed: str) -> int:
    sql = "INSERT INTO event (location_id, date_observed, hazard_type) VALUES (%s, %s, %s) RETURNING event_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (location_id, date_observed, hazard_type))
        return cur.fetchone()[0]

def insert_vulnerability(conn, location_id: int, asset_type: str, num_buildings: int) -> int:
    sql = "INSERT INTO vulnerability (location_id, asset_type, num_buildings) VALUES (%s, %s, %s) RETURNING vulnerability_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (location_id, asset_type, num_buildings))
        return cur.fetchone()[0]

def insert_local_lore(conn, location_id: int, lore_narrative: str, source_title: str) -> int:
    sql = "INSERT INTO local_lore (location_id, lore_narrative, source_title) VALUES (%s, %s, %s) RETURNING lore_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (location_id, lore_narrative, source_title))
        return cur.fetchone()[0]

def insert_risk(conn, location_id: int, title: str, description: str,
                h_score: float, l_score: float, v_score: float,
                event_id: int, vulnerability_id: int, lore_id: int) -> int:
    """Computes overall_score using the Borromean product (H * L * V)."""
    # This is the correct Borromean "product" calculation
    scores = [s for s in (h_score, l_score, v_score) if s is not None]
    
    # Calculate the average if the list is not empty, otherwise set to None
    overall = round(sum(scores) / len(scores), 2) if scores else None

    sql = """
    INSERT INTO risk (
      location_id, event_id, vulnerability_id, lore_id,
      title, description,
      h_score, l_score, v_score, overall_score
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING risk_id;
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            location_id, event_id, vulnerability_id, lore_id,
            title, description, h_score, l_score, v_score, overall
        ))
        return cur.fetchone()[0]

# --- Data Display Function ---
def display_all_risks(conn):
    """Fetches and prints all risk records in a detailed format."""
    sql = """
    SELECT r.risk_id, r.title, r.overall_score,
           r.h_score, r.l_score, r.v_score,
           l.name AS location_name
    FROM risk r
    JOIN location l ON l.location_id = r.location_id
    ORDER BY r.risk_id;
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql)
        risks = cur.fetchall()

    if not risks:
        print("\nNo risk records found in the database.")
        return

    print("\n--- Displaying All Risk Records ---")
    for risk in risks:
        print(f"\n========== RISK ID: {risk['risk_id']} ==========")
        print(f"  Title: {risk['title']}")
        print(f"  Location Name: {risk['location_name']}")
        print(f"  H Score (Hazard): {risk['h_score']:.2f}")
        print(f"  L Score (Local Lore): {risk['l_score']:.2f}")
        print(f"  V Score (Vulnerability): {risk['v_score']:.2f}")
        print(f"  Overall Borromean Score: {risk['overall_score']:.3f}")
        print("===================================")

def display_risk_by_id(conn, risk_id: int):
    """Fetches and prints a single risk record by its ID."""
    sql = """
    SELECT r.risk_id, r.title, r.overall_score,
           r.h_score, r.l_score, r.v_score,
           l.name AS location_name
    FROM risk r
    JOIN location l ON l.location_id = r.location_id
    WHERE r.risk_id = %s;
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (risk_id,))
        risk = cur.fetchone()

    if not risk:
        print(f"\nCould not find details for risk ID: {risk_id}")
        return

    print("\n--- Displaying Newly Created Risk Record ---")
    print(f"\n========== RISK ID: {risk['risk_id']} ==========")
    print(f"  Title: {risk['title']}")
    print(f"  Location Name: {risk['location_name']}")
    print(f"  H Score (Hazard): {risk['h_score']:.2f}")
    print(f"  L Score (Local Lore): {risk['l_score']:.2f}")
    print(f"  V Score (Vulnerability): {risk['v_score']:.2f}")
    print(f"  Overall Borromean Score: {risk['overall_score']:.3f}")
    print("===================================")

def delete_risk(conn, risk_id: int) -> int:
    """Deletes a risk record by its ID and returns the number of rows deleted."""
    sql = "DELETE FROM risk WHERE risk_id = %s;"
    with conn.cursor() as cur:
        cur.execute(sql, (risk_id,))
        # Return the number of rows affected (should be 1 if successful, 0 if not found)
        return cur.rowcount

# --- Main Demo Function ---
def main():
    print("===============================================")
    print("=== Welcome to the GEORISKMOD Tool Demo ===")
    print("===============================================")

    try:
        with get_conn() as conn:
            # Step 1: Optionally insert new sample data
            if input("\n> Do you want to insert new sample data? (y/n): ").lower() == 'y':
                print("\nInserting sample data...")
                loc_id = insert_location(conn, "Steep Road Cut", 47.6, -122.3, "A known landslide-prone area")
                print(f"  -> Successfully inserted new location with ID: {loc_id}")

                event_id = insert_event(conn, loc_id, "Debris Flow", "2025-10-12")
                print(f"  -> Successfully inserted new event with ID: {event_id}")

                vuln_id = insert_vulnerability(conn, loc_id, "Arterial Road", 0)
                print(f"  -> Successfully inserted new vulnerability context with ID: {vuln_id}")

                lore_id = insert_local_lore(conn, loc_id, "Locals report a slide here every 20-30 years.", "Community Meeting Records")
                print(f"  -> Successfully inserted new local lore with ID: {lore_id}")
            
                
            display_all_risks(conn)
            if input("\n> Do you want to delete an existing risk record? (y/n): ").lower() == 'y':
                try:
                    # Get the ID from the user
                    risk_id_to_delete = int(input("  Please enter the risk_id you want to delete: "))
                    
                    # Call the new delete function
                    rows_deleted = delete_risk(conn, risk_id_to_delete)
                    
                    # Provide feedback to the user
                    if rows_deleted > 0:
                        print(f"  -> Successfully deleted risk record with ID: {risk_id_to_delete}")
                        # Display the updated list of risks
                        print("\nHere is the updated list of risks:")
                        display_all_risks(conn)
                    else:
                        print(f"  -> No risk record found with ID: {risk_id_to_delete}. No changes were made.")
                
                except ValueError:
                    print("  -> Invalid input. Please enter a valid number for the risk_id.")

            if input("\n> Do you want to calculate risk for the new data? (y/n): ").lower() == 'y':
                if 'loc_id' in locals():
                    print("\nCalculating new risk...")
                    
                    h_score = random.uniform(0.1, 0.9)
                    l_score = random.uniform(0.1, 0.9)
                    v_score = random.uniform(0.1, 0.9)
                    
                    risk_id = insert_risk(conn, loc_id, "Debris Flow Risk at Road Cut",
                                        "Risk assessment following heavy rain forecast.",
                                        h_score, l_score, v_score,
                                        event_id, vuln_id, lore_id)
                    print(f"   Successfully calculated and inserted new risk with ID: {risk_id}")
                    display_risk_by_id(conn, risk_id)
                else:
                    print("  No new risk from previous steps. Exit!")
            # Always display whatever is in the database at the end of the insertion step
                

            # Step 3: Display all records
            

            # Important: Commit all changes made during the session
            conn.commit()
            print("\nDemo finished. All changes have been saved to the database.")

    except psycopg2.Error as e:
        print(f"\n--- A database error occurred: {e} ---")
    except Exception as e:
        print(f"\n--- An unexpected error occurred: {e} ---")

if __name__ == "__main__":
    main()
=======
# Testing
>>>>>>> cb0a5f31d533cb4ed5b9033d17b4ce058b08f69e
