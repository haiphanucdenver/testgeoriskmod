from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import hashlib
from pathlib import Path
import numpy as np

load_dotenv()

app = FastAPI(title="GEORISKMOD API", version="1.0.0")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default
        "http://localhost:5174",  # Vite alternative
        "http://localhost:3005",  # Vite alternative port
        "http://127.0.0.1:5173",  # Localhost alternative
        "http://127.0.0.1:3005",  # Localhost alternative
        "http://100.26.170.156",  # LightSail Apache (port 80)
        "http://100.26.170.156:8001",  # LightSail API
        "*",  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection function
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
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# Pydantic models for request/response validation
class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    region: Optional[str] = None

class EventCreate(BaseModel):
    location_id: int
    hazard_type: str
    date_observed: str

class RiskCreate(BaseModel):
    location_id: int
    title: str
    description: str
    h_score: float
    l_score: float
    v_score: float
    event_id: int
    vulnerability_id: int
    lore_id: int

class HFactorSubmit(BaseModel):
    # Location data
    location_name: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    region: Optional[str] = None

    # Event data
    hazard_type: str = "landslide"
    date_observed: str

    # H Factor - Terrain data (for event table)
    slope_angle: Optional[float] = None
    curvature_number: Optional[float] = None
    lithology_type: Optional[str] = None
    lithology_level: Optional[int] = None

    # H Factor - Rainfall data (for dynamic_trigger table)
    rainfall_intensity_mm_hr: Optional[float] = None
    rainfall_duration_hrs: Optional[float] = None
    rainfall_exceedance: Optional[float] = None

class LFactorStorySubmit(BaseModel):
    # Location data
    location_name: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    region: Optional[str] = None

    # L Factor - Story data (for local_lore table)
    title: str  # Maps to source_title
    story: str  # Maps to lore_narrative
    location_place: str  # Maps to place_name
    years_ago: Optional[int] = None  # Recency in years ago (saved directly to years_ago column)
    credibility: str  # eyewitness, instrumented, oral-tradition, newspaper, expert → credibility_confidence
    spatial_accuracy: str  # exact, approximate, general-area → distance_to_report_location

class VFactorSubmit(BaseModel):
    # Location data
    location_name: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    region: Optional[str] = None

    # V Factor - Vulnerability data (for vulnerability table)
    exposure_score: float  # 0-1
    fragility_score: float  # 0-1
    criticality_score: Optional[float] = None  # 0-1
    population_density: Optional[float] = None  # people/km²

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "GEORISKMOD API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "locations": "/api/locations",
            "events": "/api/events",
            "risks": "/api/risks",
            "vulnerabilities": "/api/vulnerabilities",
            "local_lore": "/api/local-lore",
            "historical_events": "/api/historical-events",
            "data_sources": "/api/data-sources",
            "file_upload": "/api/upload",
            "statistics": "/api/statistics",
            "docs": "/docs"
        }
    }

# Health check endpoint
@app.get("/api/health")
def health_check():
    """Check API and database health"""
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT now() AS timestamp")
            result = cur.fetchone()
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": str(result[0]) if result else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# ===== LOCATION ENDPOINTS =====

@app.post("/api/locations")
def create_location(location: LocationCreate):
    """Create a new location"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO location (name, latitude, longitude, description, region) VALUES (%s, %s, %s, %s, %s) RETURNING location_id;",
                (location.name, location.latitude, location.longitude, location.description, location.region)
            )
            location_id = cur.fetchone()[0]
            conn.commit()
            return {
                "location_id": location_id,
                "message": "Location created successfully",
                "data": location.dict()
            }
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="A location with these coordinates already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/api/locations")
def get_all_locations():
    """Get all locations"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM location ORDER BY location_id DESC")
            locations = cur.fetchall()
            return {
                "count": len(locations),
                "locations": locations
            }
    finally:
        conn.close()

@app.get("/api/locations/{location_id}")
def get_location(location_id: int):
    """Get a specific location by ID"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM location WHERE location_id = %s", (location_id,))
            location = cur.fetchone()
            if not location:
                raise HTTPException(status_code=404, detail="Location not found")
            return location
    finally:
        conn.close()

@app.delete("/api/locations/{location_id}")
def delete_location(location_id: int):
    """Delete a location (cascade deletes related records)"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM location WHERE location_id = %s", (location_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Location not found")
            conn.commit()
            return {"message": "Location deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# ===== EVENT ENDPOINTS =====

@app.post("/api/events")
def create_event(event: EventCreate):
    """Create a new event"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO event (location_id, date_observed, hazard_type) VALUES (%s, %s, %s) RETURNING event_id;",
                (event.location_id, event.date_observed, event.hazard_type)
            )
            event_id = cur.fetchone()[0]
            conn.commit()
            return {
                "event_id": event_id,
                "message": "Event created successfully"
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/api/events")
def get_all_events():
    """Get all events"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT e.*, l.name as location_name, l.latitude, l.longitude
                FROM event e
                JOIN location l ON e.location_id = l.location_id
                ORDER BY e.date_observed DESC
            """)
            events = cur.fetchall()
            return {
                "count": len(events),
                "events": events
            }
    finally:
        conn.close()

@app.post("/api/h-factor")
def submit_h_factor_data(data: HFactorSubmit):
    """
    Submit H Factor data to the database

    This endpoint:
    1. Creates/updates a location record
    2. Creates an event record with terrain data (slope, curvature, lithology)
    3. Creates a dynamic_trigger record with rainfall data
    4. Returns the created IDs for reference
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Create or get location
            cur.execute("""
                INSERT INTO location (name, latitude, longitude, description, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name, latitude, longitude)
                DO UPDATE SET description = EXCLUDED.description, region = EXCLUDED.region
                RETURNING location_id
            """, (
                data.location_name,
                data.latitude,
                data.longitude,
                data.location_description,
                data.region
            ))
            location_id = cur.fetchone()['location_id']

            # Step 2: Create event record with H factor terrain data
            cur.execute("""
                INSERT INTO event (
                    location_id, date_observed, hazard_type,
                    slope_angle, curvature_number,
                    lithology_type, lithology_level
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING event_id
            """, (
                location_id,
                data.date_observed,
                data.hazard_type,
                data.slope_angle,
                data.curvature_number,
                data.lithology_type,
                data.lithology_level
            ))
            event_id = cur.fetchone()['event_id']

            # Step 3: Create dynamic_trigger record with rainfall data
            trigger_id = None
            if any([data.rainfall_intensity_mm_hr, data.rainfall_duration_hrs, data.rainfall_exceedance]):
                cur.execute("""
                    INSERT INTO dynamic_trigger (
                        event_id,
                        rainfall_intensity_mm_hr,
                        rainfall_duration_hrs,
                        rainfall_exceedance
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING trigger_id
                """, (
                    event_id,
                    data.rainfall_intensity_mm_hr,
                    data.rainfall_duration_hrs,
                    data.rainfall_exceedance
                ))
                trigger_id = cur.fetchone()['trigger_id']

            conn.commit()

            return {
                "success": True,
                "message": "H Factor data saved successfully",
                "location_id": location_id,
                "event_id": event_id,
                "trigger_id": trigger_id
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to save H Factor data: {str(e)}")
    finally:
        conn.close()

@app.post("/api/l-factor-story")
def submit_l_factor_story(data: LFactorStorySubmit):
    """
    Submit L Factor story data to the database

    This endpoint:
    1. Creates/updates a location record
    2. Creates a local_lore record with story data
    3. Converts credibility to confidence score (0-1)
    4. Converts spatial accuracy to estimated distance
    5. Uses years_ago directly from user input
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Create or get location
            cur.execute("""
                INSERT INTO location (name, latitude, longitude, description, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name, latitude, longitude)
                DO UPDATE SET description = EXCLUDED.description, region = EXCLUDED.region
                RETURNING location_id
            """, (
                data.location_name,
                data.latitude,
                data.longitude,
                data.location_description,
                data.region
            ))
            location_id = cur.fetchone()['location_id']

            # Step 2: Convert credibility to confidence score (0-1)
            credibility_map = {
                'instrumented': 0.95,  # High confidence - measured data
                'eyewitness': 0.85,    # High confidence - direct observation
                'expert': 0.75,         # Good confidence - expert analysis
                'newspaper': 0.60,      # Medium confidence - media report
                'oral-tradition': 0.45  # Lower confidence - passed down stories
            }
            credibility_confidence = credibility_map.get(data.credibility, 0.50)

            # Step 3: Convert spatial accuracy to estimated distance (km)
            spatial_distance_map = {
                'exact': 0.1,        # Within 100m
                'approximate': 5.0,  # Within 5km
                'general-area': 20.0 # Within 20km
            }
            distance_to_report_location = spatial_distance_map.get(data.spatial_accuracy, 10.0)

            # Step 4: Use years_ago directly from user input
            years_ago = data.years_ago

            # Step 5: Create local_lore record with mapped fields
            cur.execute("""
                INSERT INTO local_lore (
                    location_id,
                    source_title,
                    lore_narrative,
                    place_name,
                    years_ago,
                    credibility_confidence,
                    distance_to_report_location
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING lore_id
            """, (
                location_id,
                data.title,
                data.story,
                data.location_place,
                years_ago,
                credibility_confidence,
                distance_to_report_location
            ))
            lore_id = cur.fetchone()['lore_id']

            conn.commit()

            return {
                "success": True,
                "message": "L Factor story saved successfully",
                "location_id": location_id,
                "lore_id": lore_id,
                "years_ago": years_ago,
                "credibility_confidence": credibility_confidence,
                "distance_to_report_location": distance_to_report_location
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to save L Factor story: {str(e)}")
    finally:
        conn.close()

@app.get("/api/l-factor-stories")
def get_all_l_factor_stories():
    """
    Get all L Factor stories from local_lore table

    Returns stories with proper column mapping for frontend display
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    ll.lore_id,
                    ll.location_id,
                    ll.source_title as title,
                    ll.lore_narrative as story,
                    ll.place_name as location_place,
                    ll.years_ago,
                    ll.credibility_confidence,
                    ll.distance_to_report_location,
                    ll.created_at,
                    l.name as location_name,
                    l.latitude,
                    l.longitude
                FROM local_lore ll
                JOIN location l ON ll.location_id = l.location_id
                ORDER BY ll.created_at DESC
            """)
            stories = cur.fetchall()

            # Convert to format expected by frontend
            formatted_stories = []
            for story in stories:
                # Reverse map credibility_confidence to credibility string
                credibility = 'newspaper'  # default
                conf = story['credibility_confidence']
                if conf and conf >= 0.90:
                    credibility = 'instrumented'
                elif conf and conf >= 0.80:
                    credibility = 'eyewitness'
                elif conf and conf >= 0.70:
                    credibility = 'expert'
                elif conf and conf >= 0.50:
                    credibility = 'newspaper'
                else:
                    credibility = 'oral-tradition'

                # Reverse map distance to spatial accuracy
                spatial_accuracy = 'approximate'  # default
                dist = story['distance_to_report_location']
                if dist and dist <= 0.5:
                    spatial_accuracy = 'exact'
                elif dist and dist <= 10:
                    spatial_accuracy = 'approximate'
                else:
                    spatial_accuracy = 'general-area'

                formatted_stories.append({
                    'id': str(story['lore_id']),
                    'eventType': story['title'] or 'Historical Event',
                    'recency': story['years_ago'] or 0,  # Return years_ago directly
                    'location': story['location_place'] or '',
                    'description': story['story'] or '',
                    'source': '',  # Not stored in local_lore
                    'credibility': credibility,
                    'spatialAccuracy': spatial_accuracy,
                    'created_at': story['created_at'].isoformat() if story['created_at'] else None
                })

            return {
                "count": len(formatted_stories),
                "events": formatted_stories
            }
    finally:
        conn.close()

@app.delete("/api/l-factor-stories/{lore_id}")
def delete_l_factor_story(lore_id: int):
    """
    Delete a L Factor story from local_lore table
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM local_lore WHERE lore_id = %s", (lore_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="L Factor story not found")
            conn.commit()
            return {"message": "L Factor story deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete L Factor story: {str(e)}")
    finally:
        conn.close()

@app.put("/api/l-factor-stories/{lore_id}")
def update_l_factor_story(lore_id: int, data: LFactorStorySubmit):
    """
    Update a L Factor story in local_lore table

    Updates location and all story fields with proper column mapping
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Create or get location
            cur.execute("""
                INSERT INTO location (name, latitude, longitude, description, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name, latitude, longitude)
                DO UPDATE SET description = EXCLUDED.description, region = EXCLUDED.region
                RETURNING location_id
            """, (
                data.location_name,
                data.latitude,
                data.longitude,
                data.location_description,
                data.region
            ))
            location_id = cur.fetchone()['location_id']

            # Step 2: Convert credibility to confidence score (0-1)
            credibility_map = {
                'instrumented': 0.95,
                'eyewitness': 0.85,
                'expert': 0.75,
                'newspaper': 0.60,
                'oral-tradition': 0.45
            }
            credibility_confidence = credibility_map.get(data.credibility, 0.50)

            # Step 3: Convert spatial accuracy to estimated distance (km)
            spatial_distance_map = {
                'exact': 0.1,
                'approximate': 5.0,
                'general-area': 20.0
            }
            distance_to_report_location = spatial_distance_map.get(data.spatial_accuracy, 10.0)

            # Step 4: Use years_ago directly from user input
            years_ago = data.years_ago

            # Step 5: Update local_lore record
            cur.execute("""
                UPDATE local_lore
                SET location_id = %s,
                    source_title = %s,
                    lore_narrative = %s,
                    place_name = %s,
                    years_ago = %s,
                    credibility_confidence = %s,
                    distance_to_report_location = %s
                WHERE lore_id = %s
            """, (
                location_id,
                data.title,
                data.story,
                data.location_place,
                years_ago,
                credibility_confidence,
                distance_to_report_location,
                lore_id
            ))

            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="L Factor story not found")

            conn.commit()

            return {
                "success": True,
                "message": "L Factor story updated successfully",
                "lore_id": lore_id,
                "location_id": location_id
            }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update L Factor story: {str(e)}")
    finally:
        conn.close()

@app.post("/api/v-factor")
def submit_v_factor_data(data: VFactorSubmit):
    """
    Submit V Factor data to the database

    This endpoint:
    1. Creates/updates a location record
    2. Creates a vulnerability record with V factor data
    3. Returns the created IDs for reference
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Create or get location
            cur.execute("""
                INSERT INTO location (name, latitude, longitude, description, region)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name, latitude, longitude)
                DO UPDATE SET description = EXCLUDED.description, region = EXCLUDED.region
                RETURNING location_id
            """, (
                data.location_name,
                data.latitude,
                data.longitude,
                data.location_description,
                data.region
            ))
            location_id = cur.fetchone()['location_id']

            # Step 2: Create vulnerability record with V factor data
            cur.execute("""
                INSERT INTO vulnerability (
                    location_id,
                    exposure_score,
                    fragility_score,
                    criticality_score,
                    population_density
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING vulnerability_id
            """, (
                location_id,
                data.exposure_score,
                data.fragility_score,
                data.criticality_score,
                data.population_density
            ))
            vulnerability_id = cur.fetchone()['vulnerability_id']

            conn.commit()

            return {
                "success": True,
                "message": "V Factor data saved successfully",
                "location_id": location_id,
                "vulnerability_id": vulnerability_id
            }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to save V Factor data: {str(e)}")
    finally:
        conn.close()

# ===== RISK ENDPOINTS =====

@app.post("/api/risks")
def create_risk(risk: RiskCreate):
    """Create a new risk assessment"""
    conn = get_conn()
    try:
        # Calculate overall score as average of H, L, V scores
        scores = [s for s in (risk.h_score, risk.l_score, risk.v_score) if s is not None]
        overall = round(sum(scores) / len(scores), 2) if scores else None

        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO risk (location_id, event_id, vulnerability_id, lore_id, title, description, 
                   h_score, l_score, v_score, overall_score) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING risk_id;""",
                (risk.location_id, risk.event_id, risk.vulnerability_id, risk.lore_id, 
                 risk.title, risk.description, risk.h_score, risk.l_score, risk.v_score, overall)
            )
            risk_id = cur.fetchone()[0]
            conn.commit()
            return {
                "risk_id": risk_id,
                "overall_score": overall,
                "message": "Risk assessment created successfully"
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/api/risks")
def get_all_risks():
    """Get all risk assessments"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT r.risk_id, r.title, r.description, r.overall_score, r.h_score, r.l_score, r.v_score, 
                       l.name AS location_name, l.latitude, l.longitude, r.created_at
                FROM risk r 
                JOIN location l ON l.location_id = r.location_id 
                ORDER BY r.created_at DESC
            """)
            risks = cur.fetchall()
            return {
                "count": len(risks),
                "risks": risks
            }
    finally:
        conn.close()

@app.get("/api/risks/{risk_id}")
def get_risk(risk_id: int):
    """Get a specific risk assessment by ID"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, l.name AS location_name, l.latitude, l.longitude 
                FROM risk r 
                JOIN location l ON l.location_id = r.location_id 
                WHERE r.risk_id = %s
            """, (risk_id,))
            risk = cur.fetchone()
            if not risk:
                raise HTTPException(status_code=404, detail="Risk assessment not found")
            return risk
    finally:
        conn.close()

@app.delete("/api/risks/{risk_id}")
def delete_risk(risk_id: int):
    """Delete a risk assessment"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM risk WHERE risk_id = %s", (risk_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Risk assessment not found")
            conn.commit()
            return {"message": "Risk assessment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

# ===== DATA SOURCES ENDPOINTS =====

class DataSourceUpdate(BaseModel):
    status: Optional[str] = None
    current_version: Optional[int] = None
    last_updated: Optional[str] = None
    file_path: Optional[str] = None
    uploaded_by: Optional[str] = None

class DataSourceVersionCreate(BaseModel):
    source_id: int
    version_number: int
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    file_path: Optional[str] = None
    changes_description: Optional[str] = None
    uploaded_by: Optional[str] = None

@app.get("/api/data-sources")
def get_data_sources():
    """Get all data sources"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    source_id,
                    item_id,
                    source_name,
                    description,
                    source_type,
                    factor_category,
                    status,
                    file_format,
                    file_type,
                    file_path,
                    api_endpoint,
                    api_service,
                    current_version,
                    last_updated,
                    uploaded_by,
                    created_at,
                    updated_at
                FROM data_sources
                ORDER BY factor_category, item_id
            """)
            sources = cur.fetchall()
            return {"count": len(sources), "data_sources": sources}
    finally:
        conn.close()

@app.get("/api/data-sources/{item_id}")
def get_data_source(item_id: str):
    """Get a specific data source by item_id"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM data_sources WHERE item_id = %s", (item_id,))
            source = cur.fetchone()
            if not source:
                raise HTTPException(status_code=404, detail=f"Data source '{item_id}' not found")
            return source
    finally:
        conn.close()

@app.put("/api/data-sources/{item_id}")
def update_data_source(item_id: str, data: DataSourceUpdate):
    """Update a data source"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build dynamic UPDATE query
            update_fields = []
            values = []

            if data.status is not None:
                update_fields.append("status = %s")
                values.append(data.status)

            if data.current_version is not None:
                update_fields.append("current_version = %s")
                values.append(data.current_version)

            if data.last_updated is not None:
                update_fields.append("last_updated = %s")
                values.append(data.last_updated)

            if data.file_path is not None:
                update_fields.append("file_path = %s")
                values.append(data.file_path)

            if data.uploaded_by is not None:
                update_fields.append("uploaded_by = %s")
                values.append(data.uploaded_by)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            values.append(item_id)
            query = f"UPDATE data_sources SET {', '.join(update_fields)} WHERE item_id = %s RETURNING *"

            cur.execute(query, values)
            updated_source = cur.fetchone()

            if not updated_source:
                raise HTTPException(status_code=404, detail=f"Data source '{item_id}' not found")

            conn.commit()
            return {
                "message": f"Data source '{item_id}' updated successfully",
                "data": updated_source
            }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/data-sources/{item_id}/versions")
def get_data_source_versions(item_id: str):
    """Get all versions for a specific data source"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # First get the source_id
            cur.execute("SELECT source_id FROM data_sources WHERE item_id = %s", (item_id,))
            source = cur.fetchone()
            if not source:
                raise HTTPException(status_code=404, detail=f"Data source '{item_id}' not found")

            # Get all versions
            cur.execute("""
                SELECT * FROM data_source_versions
                WHERE source_id = %s
                ORDER BY version_number DESC
            """, (source['source_id'],))
            versions = cur.fetchall()
            return {"count": len(versions), "versions": versions}
    finally:
        conn.close()

@app.post("/api/data-source-versions")
def create_data_source_version(version: DataSourceVersionCreate):
    """Create a new version for a data source"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO data_source_versions
                (source_id, version_number, file_name, file_size_bytes, checksum,
                 file_path, changes_description, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    version.source_id,
                    version.version_number,
                    version.file_name,
                    version.file_size_bytes,
                    version.checksum,
                    version.file_path,
                    version.changes_description,
                    version.uploaded_by,
                ),
            )
            new_version = cur.fetchone()
            conn.commit()
            return {
                "version_id": new_version['version_id'],
                "message": "Version created successfully",
                "data": new_version
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ===== FILE UPLOAD ENDPOINT =====

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), item_id: str = None, uploaded_by: str = "system"):
    """
    Upload a file for a data source
    Stores the file in the 'uploads' directory and updates the database
    """
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)

        # Generate a safe filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = upload_dir / safe_filename

        # Read file content
        content = await file.read()
        file_size = len(content)

        # Calculate checksum
        checksum = hashlib.sha256(content).hexdigest()

        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(content)

        # If item_id is provided, update the database
        if item_id:
            conn = get_conn()
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get the source_id and current version
                    cur.execute(
                        "SELECT source_id, current_version FROM data_sources WHERE item_id = %s",
                        (item_id,)
                    )
                    source = cur.fetchone()

                    if not source:
                        raise HTTPException(status_code=404, detail=f"Data source '{item_id}' not found")

                    source_id = source['source_id']
                    new_version = (source['current_version'] or 0) + 1

                    # Create a new version record
                    cur.execute(
                        """
                        INSERT INTO data_source_versions
                        (source_id, version_number, file_name, file_size_bytes, checksum,
                         file_path, changes_description, uploaded_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING version_id
                        """,
                        (
                            source_id,
                            new_version,
                            file.filename,
                            file_size,
                            checksum,
                            str(file_path),
                            f"Uploaded file: {file.filename}",
                            uploaded_by,
                        ),
                    )
                    version_id = cur.fetchone()['version_id']

                    # Update the data source
                    cur.execute(
                        """
                        UPDATE data_sources
                        SET status = 'uploaded', current_version = %s,
                            last_updated = CURRENT_TIMESTAMP, file_path = %s,
                            uploaded_by = %s
                        WHERE source_id = %s
                        """,
                        (new_version, str(file_path), uploaded_by, source_id),
                    )

                    conn.commit()

                    return {
                        "message": "File uploaded successfully",
                        "filename": safe_filename,
                        "file_size": file_size,
                        "checksum": checksum,
                        "file_path": str(file_path),
                        "item_id": item_id,
                        "version": new_version,
                        "version_id": version_id
                    }
            finally:
                conn.close()
        else:
            # Just return file info without database update
            return {
                "message": "File uploaded successfully",
                "filename": safe_filename,
                "file_size": file_size,
                "checksum": checksum,
                "file_path": str(file_path)
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# ===== DEM PROCESSING ENDPOINT =====

class ProcessDEMRequest(BaseModel):
    center_lat: float
    center_lon: float
    extent_km: Optional[float] = 10.0
    rows: Optional[int] = 80
    cols: Optional[int] = 80

@app.post("/api/process-dem/{item_id}")
async def process_dem(item_id: str, request: ProcessDEMRequest):
    """
    Process an uploaded DEM file and extract terrain values to database

    This endpoint:
    1. Loads the DEM file from the data source
    2. Generates a grid of cells over the study area
    3. Extracts elevation, slope, aspect, curvature at each cell
    4. Stores values in h_static_data table

    Args:
        item_id: The data source item_id (e.g., 'dem')
        request: Processing parameters (center point, grid size)

    Returns:
        Processing status and statistics
    """
    try:
        from dem_processor import process_dem_for_grid
        from grid_generator import create_grid_cells

        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get the data source
                cur.execute(
                    "SELECT source_id, file_path, source_name FROM data_sources WHERE item_id = %s",
                    (item_id,)
                )
                source = cur.fetchone()

                if not source:
                    raise HTTPException(status_code=404, detail=f"Data source '{item_id}' not found")

                if not source['file_path']:
                    raise HTTPException(status_code=400, detail=f"No file uploaded for '{item_id}'")

                file_path = source['file_path']
                if not os.path.exists(file_path):
                    raise HTTPException(status_code=404, detail=f"DEM file not found: {file_path}")

                # Generate grid cells
                print(f"Generating {request.rows}x{request.cols} grid...")
                grid_cells = create_grid_cells(
                    center_lat=request.center_lat,
                    center_lon=request.center_lon,
                    extent_km=request.extent_km,
                    rows=request.rows,
                    cols=request.cols
                )

                print(f"Processing DEM: {file_path}")
                print(f"Extracting values for {len(grid_cells)} grid cells...")

                # Process DEM and extract values
                terrain_data = process_dem_for_grid(
                    dem_path=file_path,
                    grid_cells=grid_cells,
                    source_id=source['source_id']
                )

                # Check if h_static_data table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'h_static_data'
                    );
                """)
                table_exists = cur.fetchone()['exists']

                if not table_exists:
                    # Create simplified h_static_data table
                    print("Creating h_static_data table...")
                    cur.execute("""
                        CREATE TABLE h_static_data (
                            static_id SERIAL PRIMARY KEY,
                            cell_id INTEGER NOT NULL,
                            source_id INTEGER,

                            -- Terrain morphology
                            slope_degrees DOUBLE PRECISION,
                            slope_aspect_degrees DOUBLE PRECISION,
                            curvature_profile DOUBLE PRECISION,
                            curvature_plan DOUBLE PRECISION,
                            elevation_m DOUBLE PRECISION,
                            relief_local_m DOUBLE PRECISION,

                            -- Metadata
                            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                            UNIQUE(cell_id, source_id)
                        );

                        CREATE INDEX idx_h_static_cell ON h_static_data(cell_id);
                    """)

                # Delete existing data for this source (if any)
                cur.execute(
                    "DELETE FROM h_static_data WHERE source_id = %s",
                    (source['source_id'],)
                )

                # Insert terrain values
                print(f"Storing {len(terrain_data)} terrain value records...")
                inserted_count = 0
                valid_count = 0

                for data in terrain_data:
                    # Only insert if we have valid elevation
                    if data['elevation_m'] is not None and not np.isnan(data['elevation_m']):
                        cur.execute(
                            """
                            INSERT INTO h_static_data
                            (cell_id, source_id, elevation_m, slope_degrees, slope_aspect_degrees,
                             curvature_profile, curvature_plan, relief_local_m)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                data['cell_id'],
                                data['source_id'],
                                data['elevation_m'],
                                data['slope_degrees'],
                                data['slope_aspect_degrees'],
                                data['curvature_profile'],
                                data['curvature_plan'],
                                data['relief_local_m']
                            )
                        )
                        inserted_count += 1
                        valid_count += 1

                conn.commit()

                # Calculate statistics
                cur.execute("""
                    SELECT
                        COUNT(*) as count,
                        MIN(elevation_m) as min_elevation,
                        MAX(elevation_m) as max_elevation,
                        AVG(elevation_m) as mean_elevation,
                        AVG(slope_degrees) as mean_slope,
                        AVG(relief_local_m) as mean_relief
                    FROM h_static_data
                    WHERE source_id = %s
                """, (source['source_id'],))
                stats = cur.fetchone()

                return {
                    "message": "DEM processed successfully",
                    "source_name": source['source_name'],
                    "grid_cells": len(grid_cells),
                    "values_inserted": inserted_count,
                    "valid_cells": valid_count,
                    "statistics": {
                        "min_elevation_m": round(float(stats['min_elevation']), 2),
                        "max_elevation_m": round(float(stats['max_elevation']), 2),
                        "mean_elevation_m": round(float(stats['mean_elevation']), 2),
                        "mean_slope_degrees": round(float(stats['mean_slope']), 2),
                        "mean_relief_m": round(float(stats['mean_relief'] or 0), 2),
                    }
                }

        finally:
            conn.close()

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"GDAL/geospatial libraries not installed: {str(e)}. Install with: pip install gdal rasterio scipy"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"DEM processing failed: {str(e)}")

# ===== AI-DRIVEN LORE COLLECTION ENDPOINTS =====

# Pydantic models for lore requests
class SubmitStoryRequest(BaseModel):
    area_id: Optional[int] = None
    title: str
    story_text: Optional[str] = None
    file_path: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_description: Optional[str] = None
    created_by: str = "user"

class SubmitObservationRequest(BaseModel):
    area_id: Optional[int] = None
    title: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    observation_sight: Optional[str] = None
    observation_sound: Optional[str] = None
    observation_datetime: Optional[str] = None
    created_by: str = "user"

class DiscoverLoreRequest(BaseModel):
    area_id: Optional[int] = None
    latitude: float
    longitude: float
    location_radius_m: float = 10000  # Default 10km radius
    created_by: str = "system"

# =============================================================================
# AI AGENT PLACEHOLDER FUNCTIONS
# =============================================================================
# These functions are placeholders that will be replaced with actual AI agent
# implementations later. They simulate AI processing for now.
# =============================================================================

def ai_agent_analyze_story(story_id: int, story_text: str, file_path: Optional[str] = None) -> dict:
    """
    PLACEHOLDER: AI agent analyzes user-provided story to extract:
    - Event date (recency)
    - Event type (what happened)
    - Spatial information (where)
    - Credibility score

    TODO: Replace with actual AI agent call
    """
    import time
    import random

    # Simulate AI processing time
    time.sleep(0.5)

    # Return simulated AI analysis
    return {
        "ai_event_date": "1952-03-15",  # Extracted from story text
        "ai_event_type": "landslide",
        "ai_recency_score": 0.4,  # 1952 is moderately old
        "ai_spatial_relevance": 0.8,  # Specific location mentioned
        "ai_credibility_score": 0.7,  # Oral tradition, second-hand account
        "ai_confidence": 0.75,
        "ai_summary": "Historical landslide event near Eagle Creek in 1952, triggered by prolonged rainfall. Oral tradition account from family member.",
        "ai_extracted_locations": [
            {"name": "Eagle Creek", "latitude": 45.3725, "longitude": -121.7055, "confidence": 0.8}
        ]
    }

def ai_agent_discover_lore(latitude: float, longitude: float, radius_m: float) -> dict:
    """
    PLACEHOLDER: AI agent searches for lore/historical information at a location
    - Searches historical databases
    - Searches news archives
    - Searches indigenous knowledge repositories
    - Searches scientific literature

    TODO: Replace with actual AI agent call
    """
    import time

    # Simulate AI search time
    time.sleep(1.0)

    # Return simulated discovered lore
    return {
        "found_stories": [
            {
                "title": "USGS landslide inventory entry",
                "story_text": "Debris flow documented in 1996 USGS landslide inventory, triggered by intense rainfall event.",
                "ai_event_date": "1996-02-09",
                "ai_event_type": "debris_flow",
                "ai_recency_score": 0.65,
                "ai_spatial_relevance": 0.95,
                "ai_credibility_score": 0.95,  # USGS = high credibility
                "source": "USGS Landslide Inventory"
            }
        ],
        "search_metadata": {
            "sources_searched": ["USGS", "local_newspapers", "tribal_archives"],
            "total_matches": 1,
            "search_duration_ms": 1000
        }
    }

def ai_agent_search_observation(observation_sight: str, observation_sound: str, latitude: float, longitude: float) -> dict:
    """
    PLACEHOLDER: AI agent searches for information based on user observations
    - Analyzes sight description (e.g., "fresh scarp")
    - Analyzes sound description (e.g., "cracking sounds")
    - Searches for similar reports
    - Assesses urgency/risk

    TODO: Replace with actual AI agent call
    """
    import time

    # Simulate AI search time
    time.sleep(0.8)

    # Return simulated search results
    return {
        "interpretation": "Observations consistent with active slope deformation. Fresh scarp and cracking sounds indicate recent movement.",
        "similar_cases": [
            {
                "title": "Similar scarp reported 2km north in 2023",
                "description": "Fresh scarp with cracking sounds preceded slope failure by 3 days",
                "relevance": 0.9
            }
        ],
        "ai_event_type": "slope_deformation",
        "ai_recency_score": 0.95,  # Very recent observation
        "ai_spatial_relevance": 1.0,  # Exact location
        "ai_credibility_score": 0.85,  # Direct observation
        "ai_confidence": 0.8,
        "urgency_level": "high",  # Active deformation = high urgency
        "recommended_action": "Field investigation recommended within 24 hours"
    }

# =============================================================================
# LORE ENDPOINTS
# =============================================================================

@app.post("/api/lore/submit-story")
def submit_lore_story(request: SubmitStoryRequest):
    """
    Scenario 1: User provides a story/lore with title and optional location
    The story text or file will be analyzed by AI agent to extract:
    - Recency (when did it happen?)
    - Spatial information (where did it happen?)
    - Credibility score
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Insert story into database
            cur.execute("""
                INSERT INTO lore_stories (
                    area_id, title, story_text, file_path,
                    latitude, longitude, location_description,
                    scenario_type, ai_status, created_by, created_at
                )
                VALUES (%(area_id)s, %(title)s, %(story_text)s, %(file_path)s,
                        %(latitude)s, %(longitude)s, %(location_description)s,
                        'user_story', 'pending', %(created_by)s, CURRENT_TIMESTAMP)
                RETURNING story_id
            """, {
                'area_id': request.area_id,
                'title': request.title,
                'story_text': request.story_text,
                'file_path': request.file_path,
                'latitude': request.latitude,
                'longitude': request.longitude,
                'location_description': request.location_description,
                'created_by': request.created_by
            })

            story_id = cur.fetchone()['story_id']

            # Create AI job for story analysis
            cur.execute("""
                INSERT INTO lore_ai_jobs (
                    story_id, job_type, status, input_params, queued_at
                )
                VALUES (%(story_id)s, 'analyze_story', 'queued',
                        %(input_params)s::jsonb, CURRENT_TIMESTAMP)
                RETURNING job_id
            """, {
                'story_id': story_id,
                'input_params': json.dumps({
                    'story_text': request.story_text,
                    'file_path': request.file_path,
                    'title': request.title
                })
            })

            job_id = cur.fetchone()['job_id']
            conn.commit()

            # PLACEHOLDER: Call AI agent to analyze story
            # In production, this would be an async task/queue
            try:
                # Update job status to running
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'running', started_at = CURRENT_TIMESTAMP
                    WHERE job_id = %(job_id)s
                """, {'job_id': job_id})
                conn.commit()

                # Call AI agent (placeholder)
                ai_results = ai_agent_analyze_story(
                    story_id,
                    request.story_text or "",
                    request.file_path
                )

                # Update story with AI results
                cur.execute("""
                    UPDATE lore_stories
                    SET ai_status = 'completed',
                        ai_processed_at = CURRENT_TIMESTAMP,
                        ai_event_date = %(ai_event_date)s,
                        ai_event_type = %(ai_event_type)s,
                        ai_recency_score = %(ai_recency_score)s,
                        ai_spatial_relevance = %(ai_spatial_relevance)s,
                        ai_credibility_score = %(ai_credibility_score)s,
                        ai_confidence = %(ai_confidence)s,
                        ai_summary = %(ai_summary)s,
                        ai_extracted_locations = %(ai_extracted_locations)s::jsonb,
                        last_modified = CURRENT_TIMESTAMP
                    WHERE story_id = %(story_id)s
                """, {
                    'story_id': story_id,
                    **ai_results
                })

                # Update job status to completed
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'completed',
                        completed_at = CURRENT_TIMESTAMP,
                        output_results = %(output_results)s::jsonb
                    WHERE job_id = %(job_id)s
                """, {
                    'job_id': job_id,
                    'output_results': json.dumps(ai_results)
                })

                conn.commit()

            except Exception as ai_error:
                # Mark job as failed
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'failed', error_message = %(error)s
                    WHERE job_id = %(job_id)s
                """, {'job_id': job_id, 'error': str(ai_error)})

                cur.execute("""
                    UPDATE lore_stories
                    SET ai_status = 'failed', ai_error_message = %(error)s
                    WHERE story_id = %(story_id)s
                """, {'story_id': story_id, 'error': str(ai_error)})

                conn.commit()

                return {
                    "story_id": story_id,
                    "job_id": job_id,
                    "message": "Story submitted but AI analysis failed",
                    "ai_status": "failed",
                    "error": str(ai_error)
                }

            return {
                "story_id": story_id,
                "job_id": job_id,
                "message": "Story submitted and analyzed successfully",
                "ai_status": "completed",
                "ai_results": ai_results
            }

    finally:
        conn.close()

@app.post("/api/lore/discover-at-location")
def discover_lore_at_location(request: DiscoverLoreRequest):
    """
    Scenario 2: AI finds lore at a given location
    AI searches historical databases, news archives, indigenous knowledge, etc.
    """
    conn = get_conn()
    try:
        # PLACEHOLDER: Call AI agent to discover lore
        ai_results = ai_agent_discover_lore(
            request.latitude,
            request.longitude,
            request.location_radius_m
        )

        # Store discovered stories
        story_ids = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for found_story in ai_results.get('found_stories', []):
                # Insert discovered story
                cur.execute("""
                    INSERT INTO lore_stories (
                        area_id, title, story_text,
                        latitude, longitude, location_radius_m,
                        scenario_type, ai_status,
                        ai_event_date, ai_event_type,
                        ai_recency_score, ai_spatial_relevance, ai_credibility_score,
                        ai_processed_at, created_by, created_at
                    )
                    VALUES (%(area_id)s, %(title)s, %(story_text)s,
                            %(latitude)s, %(longitude)s, %(location_radius_m)s,
                            'ai_discovered', 'completed',
                            %(ai_event_date)s, %(ai_event_type)s,
                            %(ai_recency_score)s, %(ai_spatial_relevance)s, %(ai_credibility_score)s,
                            CURRENT_TIMESTAMP, %(created_by)s, CURRENT_TIMESTAMP)
                    RETURNING story_id
                """, {
                    'area_id': request.area_id,
                    'title': found_story['title'],
                    'story_text': found_story.get('story_text', ''),
                    'latitude': request.latitude,
                    'longitude': request.longitude,
                    'location_radius_m': request.location_radius_m,
                    'ai_event_date': found_story.get('ai_event_date'),
                    'ai_event_type': found_story.get('ai_event_type'),
                    'ai_recency_score': found_story.get('ai_recency_score'),
                    'ai_spatial_relevance': found_story.get('ai_spatial_relevance'),
                    'ai_credibility_score': found_story.get('ai_credibility_score'),
                    'created_by': request.created_by
                })

                story_ids.append(cur.fetchone()['story_id'])

            conn.commit()

        return {
            "message": f"Discovered {len(story_ids)} lore stories at location",
            "story_ids": story_ids,
            "location": {
                "latitude": request.latitude,
                "longitude": request.longitude,
                "radius_m": request.location_radius_m
            },
            "ai_results": ai_results
        }

    finally:
        conn.close()

@app.post("/api/lore/submit-observation")
def submit_observation(request: SubmitObservationRequest):
    """
    Scenario 3: User observes something (sight/sound) at a location
    AI searches for information based on the observation
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Insert observation
            cur.execute("""
                INSERT INTO lore_stories (
                    area_id, title,
                    latitude, longitude, location_description,
                    observation_sight, observation_sound, observation_datetime,
                    scenario_type, ai_status, created_by, created_at
                )
                VALUES (%(area_id)s, %(title)s,
                        %(latitude)s, %(longitude)s, %(location_description)s,
                        %(observation_sight)s, %(observation_sound)s, %(observation_datetime)s,
                        'observation_based', 'pending', %(created_by)s, CURRENT_TIMESTAMP)
                RETURNING story_id
            """, {
                'area_id': request.area_id,
                'title': request.title,
                'latitude': request.latitude,
                'longitude': request.longitude,
                'location_description': request.location_description,
                'observation_sight': request.observation_sight,
                'observation_sound': request.observation_sound,
                'observation_datetime': request.observation_datetime,
                'created_by': request.created_by
            })

            story_id = cur.fetchone()['story_id']

            # Create AI job
            cur.execute("""
                INSERT INTO lore_ai_jobs (
                    story_id, job_type, status, input_params, queued_at
                )
                VALUES (%(story_id)s, 'search_observation', 'queued',
                        %(input_params)s::jsonb, CURRENT_TIMESTAMP)
                RETURNING job_id
            """, {
                'story_id': story_id,
                'input_params': json.dumps({
                    'sight': request.observation_sight,
                    'sound': request.observation_sound,
                    'latitude': request.latitude,
                    'longitude': request.longitude
                })
            })

            job_id = cur.fetchone()['job_id']
            conn.commit()

            # PLACEHOLDER: Call AI agent to search based on observation
            try:
                # Update job status
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'running', started_at = CURRENT_TIMESTAMP
                    WHERE job_id = %(job_id)s
                """, {'job_id': job_id})
                conn.commit()

                # Call AI agent (placeholder)
                ai_results = ai_agent_search_observation(
                    request.observation_sight or "",
                    request.observation_sound or "",
                    request.latitude,
                    request.longitude
                )

                # Update story with AI results
                cur.execute("""
                    UPDATE lore_stories
                    SET ai_status = 'completed',
                        ai_processed_at = CURRENT_TIMESTAMP,
                        ai_event_type = %(ai_event_type)s,
                        ai_recency_score = %(ai_recency_score)s,
                        ai_spatial_relevance = %(ai_spatial_relevance)s,
                        ai_credibility_score = %(ai_credibility_score)s,
                        ai_confidence = %(ai_confidence)s,
                        ai_summary = %(interpretation)s,
                        last_modified = CURRENT_TIMESTAMP
                    WHERE story_id = %(story_id)s
                """, {
                    'story_id': story_id,
                    'ai_event_type': ai_results.get('ai_event_type'),
                    'ai_recency_score': ai_results.get('ai_recency_score'),
                    'ai_spatial_relevance': ai_results.get('ai_spatial_relevance'),
                    'ai_credibility_score': ai_results.get('ai_credibility_score'),
                    'ai_confidence': ai_results.get('ai_confidence'),
                    'interpretation': ai_results.get('interpretation')
                })

                # Update job status
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'completed',
                        completed_at = CURRENT_TIMESTAMP,
                        output_results = %(output_results)s::jsonb
                    WHERE job_id = %(job_id)s
                """, {
                    'job_id': job_id,
                    'output_results': json.dumps(ai_results)
                })

                conn.commit()

            except Exception as ai_error:
                # Mark job as failed
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'failed', error_message = %(error)s
                    WHERE job_id = %(job_id)s
                """, {'job_id': job_id, 'error': str(ai_error)})

                cur.execute("""
                    UPDATE lore_stories
                    SET ai_status = 'failed', ai_error_message = %(error)s
                    WHERE story_id = %(story_id)s
                """, {'story_id': story_id, 'error': str(ai_error)})

                conn.commit()

                return {
                    "story_id": story_id,
                    "job_id": job_id,
                    "message": "Observation submitted but AI search failed",
                    "ai_status": "failed",
                    "error": str(ai_error)
                }

            return {
                "story_id": story_id,
                "job_id": job_id,
                "message": "Observation submitted and analyzed successfully",
                "ai_status": "completed",
                "ai_results": ai_results
            }

    finally:
        conn.close()

@app.get("/api/lore/stories")
def get_lore_stories(
    area_id: Optional[int] = None,
    scenario_type: Optional[str] = None,
    ai_status: Optional[str] = None
):
    """Get all lore stories with optional filters"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM lore_stories WHERE 1=1"
            params = {}

            if area_id is not None:
                query += " AND area_id = %(area_id)s"
                params['area_id'] = area_id

            if scenario_type:
                query += " AND scenario_type = %(scenario_type)s"
                params['scenario_type'] = scenario_type

            if ai_status:
                query += " AND ai_status = %(ai_status)s"
                params['ai_status'] = ai_status

            query += " ORDER BY created_at DESC"

            cur.execute(query, params)
            stories = cur.fetchall()

            return {
                "count": len(stories),
                "stories": stories
            }
    finally:
        conn.close()

@app.get("/api/lore/ai-jobs")
def get_ai_jobs(status: Optional[str] = None):
    """Get AI job queue status"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if status:
                cur.execute("""
                    SELECT * FROM v_ai_job_queue
                    WHERE status = %(status)s
                    ORDER BY queued_at DESC
                """, {'status': status})
            else:
                cur.execute("SELECT * FROM v_ai_job_queue ORDER BY queued_at DESC")

            jobs = cur.fetchall()

            return {
                "count": len(jobs),
                "jobs": jobs
            }
    finally:
        conn.close()

# ===== RISK CALCULATION ENDPOINT =====

class RiskCalculationRequest(BaseModel):
    # H Factor inputs
    slope_deg: Optional[float] = None
    curvature: Optional[float] = None
    lith_class: Optional[int] = None  # 1-5 scale
    rain_exceed: Optional[float] = None

    # L Factor inputs
    lore_signal: Optional[float] = 0.0  # Default to 0 if no lore data

    # V Factor inputs
    exposure: Optional[float] = None
    fragility: Optional[float] = None
    criticality_weight: Optional[float] = 0.3

    # Configuration
    hazard_type: str = "landslide"
    event_type: Optional[str] = None  # For compatibility
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    date_observed: Optional[str] = None

@app.post("/api/calculate-risk")
def calculate_risk_endpoint(request: RiskCalculationRequest):
    """
    Calculate Borromean risk score from H, L, V factor inputs

    This endpoint implements the risk calculation from borromean_risk_starter.ipynb
    using real data from the frontend forms.
    """
    try:
        from risk_calculator import calculate_risk, RiskConfig

        # Validate required H factor inputs
        if request.slope_deg is None:
            raise HTTPException(status_code=400, detail="slope_deg is required for H factor")
        if request.curvature is None:
            raise HTTPException(status_code=400, detail="curvature is required for H factor")
        if request.lith_class is None:
            raise HTTPException(status_code=400, detail="lith_class is required for H factor")
        if request.rain_exceed is None:
            raise HTTPException(status_code=400, detail="rain_exceed is required for H factor")

        # Validate required V factor inputs
        if request.exposure is None:
            raise HTTPException(status_code=400, detail="exposure is required for V factor")
        if request.fragility is None:
            raise HTTPException(status_code=400, detail="fragility is required for V factor")

        # Validate ranges
        if not (0 <= request.slope_deg <= 90):
            raise HTTPException(status_code=400, detail="slope_deg must be between 0 and 90 degrees")
        if not (1 <= request.lith_class <= 5):
            raise HTTPException(status_code=400, detail="lith_class must be between 1 and 5")
        if not (0 <= request.rain_exceed <= 1):
            raise HTTPException(status_code=400, detail="rain_exceed must be between 0 and 1")
        if not (0 <= request.exposure <= 1):
            raise HTTPException(status_code=400, detail="exposure must be between 0 and 1")
        if not (0 <= request.fragility <= 1):
            raise HTTPException(status_code=400, detail="fragility must be between 0 and 1")
        if not (0 <= request.lore_signal <= 1):
            raise HTTPException(status_code=400, detail="lore_signal must be between 0 and 1")

        # Use event_type if provided, otherwise use hazard_type
        hazard_type = request.event_type or request.hazard_type

        # Calculate risk
        result = calculate_risk(
            slope_deg=request.slope_deg,
            curvature=request.curvature,
            lith_class=request.lith_class,
            rain_exceed=request.rain_exceed,
            lore_signal=request.lore_signal,
            exposure=request.exposure,
            fragility=request.fragility,
            hazard_type=hazard_type,
            compute_uncertainty=True
        )

        # Add location data to response
        result['location'] = {
            'latitude': request.location_lat,
            'longitude': request.location_lng
        }
        result['date_observed'] = request.date_observed
        result['event_type'] = hazard_type

        return {
            "success": True,
            "message": "Risk calculated successfully",
            "data": result
        }

    except HTTPException:
        raise
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risk calculator module not found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risk calculation failed: {str(e)}"
        )

# ===== STATISTICS ENDPOINT =====

@app.get("/api/statistics")
def get_statistics():
    """Get overall system statistics"""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get counts
            cur.execute("SELECT COUNT(*) as count FROM location")
            locations_count = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM event")
            events_count = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM risk")
            risks_count = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM local_lore")
            lore_count = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM vulnerability")
            vulnerability_count = cur.fetchone()['count']
            
            # Get average risk score
            cur.execute("SELECT AVG(overall_score) as avg_risk FROM risk WHERE overall_score IS NOT NULL")
            avg_risk_result = cur.fetchone()
            avg_risk = round(float(avg_risk_result['avg_risk']), 2) if avg_risk_result['avg_risk'] else 0
            
            return {
                "locations": locations_count,
                "events": events_count,
                "risks": risks_count,
                "historical_events": lore_count,
                "vulnerabilities": vulnerability_count,
                "average_risk_score": avg_risk
            }
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting GEORISKMOD API Server...")
    print("📚 API Documentation: http://localhost:8001/docs")
    print("🏥 Health Check: http://localhost:8001/api/health")
    print("⚠️  Note: Using port 8001 (port 8000 is used by AI agents backend)")
    uvicorn.run(app, host="0.0.0.0", port=8001)

