# basicIO.py
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        sslmode=os.getenv("DB_SSLMODE", "require"),
        connect_timeout=10,
    )

def ensure_postgis():
    sql = "CREATE EXTENSION IF NOT EXISTS postgis;"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)

def insert_location(name: str, lat: float, lon: float,
                    description: str = None, region: str = None) -> int:
    """
    coordinates GEOGRAPHY(POINT,4326) expects lon,lat order.
    We'll use ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography.
    """
    sql = """
    INSERT INTO location (name, coordinates, description, region)
    VALUES (
      %s,
      ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
      %s,
      %s
    )
    RETURNING location_id;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (name, lon, lat, description, region))
        return cur.fetchone()[0]

def insert_event(location_id: int, hazard_type: str, date_observed: str,
                 h_score: float = None, rainfall_intensity_mm_hr=None):
    """
    Provide any subset of event fields you need; rest can be NULL.
    date_observed as 'YYYY-MM-DD'. h_score must be 0..1 or NULL.
    """
    sql = """
    INSERT INTO event (
        location_id, date_observed, hazard_type, h_score, rainfall_intensity_mm_hr
    ) VALUES (%s, %s, %s, %s, %s)
    RETURNING event_id;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (location_id, date_observed, hazard_type, h_score, rainfall_intensity_mm_hr))
        return cur.fetchone()[0]

def insert_vulnerability(location_id: int, v_score: float = None,
                         asset_type: str = None, num_buildings: int = None):
    sql = """
    INSERT INTO vulnerability (location_id, v_score, asset_type, num_buildings)
    VALUES (%s, %s, %s, %s)
    RETURNING vulnerability_id;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (location_id, v_score, asset_type, num_buildings))
        return cur.fetchone()[0]

def insert_local_lore(location_id: int, lore_narrative: str,
                      l_score: float = None, source_title: str = None, source_url: str = None):
    sql = """
    INSERT INTO local_lore (location_id, lore_narrative, l_score, source_title, source_url)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING lore_id;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (location_id, lore_narrative, l_score, source_title, source_url))
        return cur.fetchone()[0]

def insert_risk(location_id: int, title: str, description: str,
                h_score: float = None, l_score: float = None, v_score: float = None,
                event_id: int = None, vulnerability_id: int = None, lore_id: int = None) -> int:
    """
    Computes overall_score = average of non-NULL scores (H,L,V) that you pass.
    DB enforces 0..1 via CHECK constraints.
    """
    scores = [s for s in (h_score, l_score, v_score) if s is not None]
    overall = round(sum(scores) / len(scores), 2) if scores else None

    sql = """
    INSERT INTO risk (
      location_id, event_id, vulnerability_id, lore_id,
      title, description,
      h_score, l_score, v_score, overall_score
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING risk_id;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (
            location_id, event_id, vulnerability_id, lore_id,
            title, description, h_score, l_score, v_score, overall
        ))
        return cur.fetchone()[0]

def list_risks():
    sql = """
    SELECT r.risk_id, r.title, r.overall_score,
           r.h_score, r.l_score, r.v_score,
           l.name AS location_name
    FROM risk r
    JOIN location l ON l.location_id = r.location_id
    ORDER BY r.risk_id;
    """
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql)
        return cur.fetchall()

def main():
    print("=== Match-DB I/O Demo ===")
    ensure_postgis()

    # 1) Insert a location (Denver example lat/lon)
    loc_id = insert_location(
        name="Sample Site A",
        lat=39.7392, lon=-104.9903,
        description="Downtown area", region="CO-FrontRange"
    )
    print(f"Location inserted: {loc_id}")

    # 2) Optional: insert one event, vulnerability, lore for that location
    ev_id = insert_event(loc_id, hazard_type="landslide", date_observed="2025-10-12", h_score=0.72)
    vu_id = insert_vulnerability(loc_id, v_score=0.65, asset_type="residential", num_buildings=120)
    lo_id = insert_local_lore(loc_id, lore_narrative="Old reports of slope failures after heavy rain.",
                              l_score=0.58, source_title="Neighborhood history", source_url="https://example.org/lore")

    # 3) Insert a risk row that references the three ring records (optional but recommended)
    risk_id = insert_risk(
        location_id=loc_id,
        title="Slope Failure near Sample Site A",
        description="Combined H/L/V suggests elevated risk during prolonged rainfall.",
        h_score=0.72, l_score=0.58, v_score=0.65,
        event_id=ev_id, vulnerability_id=vu_id, lore_id=lo_id
    )
    print(f"Risk inserted: {risk_id}")

    # 4) Read back risks
    for row in list_risks():
        print({k: (round(v, 2) if isinstance(v, float) else v) for k, v in row.items()})

if __name__ == "__main__":
    main()