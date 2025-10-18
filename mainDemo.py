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
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            sslmode=os.getenv("DB_SSLMODE", "require"),
            connect_timeout=10,
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"--- DATABASE CONNECTION FAILED ---")
        print(f"Error: {e}")
        print("Please check your .env file and network connection.")
        return None

# --- Core Data Functions ---
def insert_location(conn, name: str, lat: float, lon: float, description: str = None, region: str = None) -> int:
    """
    --- CHANGED ---
    Updated SQL to insert into 'latitude' and 'longitude' columns,
    matching your provided CREATE TABLE script.
    """
    sql = "INSERT INTO location (name, latitude, longitude, description, region) VALUES (%s, %s, %s, %s, %s) RETURNING location_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (name, lat, lon, description, region))
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

def insert_local_lore(conn, location_id: int, lore_narrative: str) -> int:
    """
    --- CHANGED ---
    Removed 'source_title' as it is not a column in the 'local_lore' table.
    """
    sql = "INSERT INTO local_lore (location_id, lore_narrative) VALUES (%s, %s) RETURNING lore_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (location_id, lore_narrative))
        return cur.fetchone()[0]

def insert_risk(conn, location_id: int, title: str, description: str,
                h_score: float, l_score: float, v_score: float,
                event_id: int, vulnerability_id: int, lore_id: int) -> int:
    """
    Computes overall_score as an AVERAGE of the H, L, V scores.
    This matches your 'hybrid' risk table model.
    """
    scores = [s for s in (h_score, l_score, v_score) if s is not None]
    overall = round(sum(scores) / len(scores), 2) if scores else None

    sql = "INSERT INTO risk (location_id, event_id, vulnerability_id, lore_id, title, description, h_score, l_score, v_score, overall_score) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING risk_id;"
    with conn.cursor() as cur:
        cur.execute(sql, (location_id, event_id, vulnerability_id, lore_id, title, description, h_score, l_score, v_score, overall))
        return cur.fetchone()[0]

def delete_risk_by_id(conn, risk_id: int) -> int:
    sql = "DELETE FROM risk WHERE risk_id = %s;"
    with conn.cursor() as cur:
        cur.execute(sql, (risk_id,))
        return cur.rowcount

def delete_all_data(conn):
    """
    --- CHANGED ---
    Deletes all data from all tables, including new ones.
    """
    sql = "TRUNCATE TABLE location, event, dynamic_trigger, vulnerability, local_lore, source, processing, risk RESTART IDENTITY CASCADE;"
    with conn.cursor() as cur:
        cur.execute(sql)
    print("\n--- All data has been deleted. ---")

# --- Display Functions ---
def display_all_risks(conn):
    sql = "SELECT r.risk_id, r.title, r.overall_score, r.h_score, r.l_score, r.v_score, l.name AS location_name FROM risk r JOIN location l ON l.location_id = r.location_id ORDER BY r.risk_id;"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql)
        risks = cur.fetchall()

    if not risks:
        print("\n--- No risk records found in the database. ---")
        return False

    print("\n--- Displaying All Risk Records ---")
    for risk in risks:
        print(f"\n========== RISK ID: {risk['risk_id']} ==========")
        print(f"  Title: {risk['title']}")
        print(f"  Location Name: {risk['location_name']}")
        print(f"  H Score (Hazard): {risk['h_score']:.2f}" if risk['h_score'] is not None else "  H Score (Hazard): N/A")
        print(f"  L Score (Local Lore): {risk['l_score']:.2f}" if risk['l_score'] is not None else "  L Score (Local Lore): N/A")
        print(f"  V Score (Vulnerability): {risk['v_score']:.2f}" if risk['v_score'] is not None else "  V Score (Vulnerability): N/A")
        print(f"  Overall Risk Score (Average): {risk['overall_score']:.3f}" if risk['overall_score'] is not None else "  Overall Risk Score (Average): N/A")
        print("===================================")
    return True

def display_risk_by_id(conn, risk_id: int):
    sql = "SELECT r.risk_id, r.title, r.overall_score, r.h_score, r.l_score, r.v_score, l.name AS location_name FROM risk r JOIN location l ON l.location_id = r.location_id WHERE r.risk_id = %s;"
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
    print(f"  H Score (Hazard): {risk['h_score']:.2f}" if risk['h_score'] is not None else "  H Score (Hazard): N/A")
    print(f"  L Score (Local Lore): {risk['l_score']:.2f}" if risk['l_score'] is not None else "  L Score (Local Lore): N/A")
    print(f"  V Score (Vulnerability): {risk['v_score']:.2f}" if risk['v_score'] is not None else "  V Score (Vulnerability): N/A")
    print(f"  Overall Risk Score (Average): {risk['overall_score']:.3f}" if risk['overall_score'] is not None else "  Overall Risk Score (Average): N/A")
    print("===================================")

# --- Menu Function (Updated) ---
def display_menu():
    print("\n==============================================")
    print("      ===  Welcome to GEORISKMOD  ===")
    print("      ===        DEMO MENU        ===")
    print("==============================================")
    print("1 - Add a new location and its data")
    print("2 - Calculate a new risk for the added location")
    print("3 - Show all risk data")
    print("4 - Delete one risk by ID")
    print("5 - Delete ALL data ")
    print("6 - Exit")
    print("==============================================")

# --- Main Demo Loop (Updated) ---
def main():
    conn = get_conn()
    if not conn:
        return  # Exit if connection fails

    # This dictionary holds the IDs of the data created in step 1
    # so they can be used in step 2.
    temp_data = {}

    while True:
        display_menu()
        choice = input("> Please enter your choice: ").upper()  # Use upper() for D choices

        if choice == '1':
            print("\n--- 1. Adding New Location and Data ---")
            
            # --- CHANGED: Get user input instead of hard-coding ---
            try:
                loc_name = input("> Enter Location Name (e.g., Boulder Creek): ")
                if not loc_name:
                    print("\n-> Name cannot be empty. Operation cancelled.")
                    continue

                lat = float(input("> Enter Latitude (e.g., 40.0150): "))
                lon = float(input("> Enter Longitude (e.g., -105.2705): "))
                desc = input("> Enter Description (optional): ")

                # --- Insert the new, unique data ---
                loc_id = insert_location(conn, loc_name, lat, lon, desc)
                
                # Now add sample related data for this new location
                event_id = insert_event(conn, loc_id, "Debris Flow", "2025-10-17")
                vuln_id = insert_vulnerability(conn, loc_id, "Transportation Corridor", 2) # e.g., 2 roads
                lore_id = insert_local_lore(conn, loc_id, "Locals report this creek floods every 10 years.")
                
                # Store the IDs for step 2
                temp_data = {'loc_id': loc_id, 'event_id': event_id, 'vuln_id': vuln_id, 'lore_id': lore_id}
                print(f"\n-> Successfully inserted new location (ID: {loc_id}) and related data.")
                print("-> You can now proceed to step 2 to calculate the risk.")
            
            except psycopg2.errors.UniqueViolation:
                print(f"\n-> ERROR: A location with that name, latitude, and longitude already exists.")
                print("-> Please try again with a unique combination.")
                conn.rollback() # Rollback the failed transaction
            except ValueError:
                print("\n-> ERROR: Invalid input. Latitude and longitude must be numbers (e.g., 40.0150).")
                conn.rollback()
            except Exception as e:
                print(f"\n-> An unexpected error occurred: {e}")
                conn.rollback()
            # --- End of Change ---

        elif choice == '2':
            print("\n--- 2. Calculating New Risk ---")
            if 'loc_id' in temp_data:
                h_score = round(random.uniform(0.1, 0.9), 2)
                l_score = round(random.uniform(0.1, 0.9), 2)
                v_score = round(random.uniform(0.1, 0.9), 2)

                risk_id = insert_risk(conn, temp_data['loc_id'], f"Risk Assessment for {temp_data['loc_id']}",
                                    "Probabilistic assessment based on user-added data.",
                                    h_score, l_score, v_score,
                                    temp_data['event_id'], temp_data['vuln_id'], temp_data['lore_id'])
                
                display_risk_by_id(conn, risk_id)
                temp_data = {}  # Clear temp data after it has been used
            else:
                print("\n-> Please use option 1 to add a location first before calculating a risk.")

        elif choice == '3':
            print("\n--- 3. Showing All Risk Data ---")
            display_all_risks(conn)

        elif choice == '4':
            print("\n--- 4. Deleting One Risk by ID ---")
            if display_all_risks(conn):  # Show risks first so user can choose
                try:
                    risk_id_to_delete = int(input("\n> Please enter the risk_id you want to delete: "))
                    rows_deleted = delete_risk_by_id(conn, risk_id_to_delete)
                    if rows_deleted > 0:
                        print(f"\n-> Successfully deleted risk record with ID: {risk_id_to_delete}")
                    else:
                        print(f"\n-> No risk record found with ID: {risk_id_to_delete}.")
                except ValueError:
                    print("\n-> Invalid input. Please enter a valid number.")

        elif choice == '5':
            print("\n--- 5. Deleting ALL Data ---")
            if input("> Are you sure you want to delete ALL data? This cannot be undone. (y/n): ").lower() == 'y':
                delete_all_data(conn)
            else:
                print("\n-> Deletion cancelled.")

        elif choice == '6':
            print("\nExiting demo. Goodbye!")
            break
        
        else:
            print("\nInvalid choice. Please enter a number between 1 and 6.")
        
        # Commit changes after each successful operation that modifies data
        if choice in ['1', '2', '4', '5']:
            conn.commit()

    # Close the connection when the loop exits
    if conn:
        conn.close()

if __name__ == "__main__":
    main()