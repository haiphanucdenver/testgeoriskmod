
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