from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
import json

# AI Agents imports
from ai_agents.models import (
    ExtractionRequest,
    ResearchQuery,
    LocalLoreExtraction,
    ResearchResult,
    HazardType as AIHazardType
)
from ai_agents.extraction_agent import DocumentExtractionAgent
from ai_agents.research_agent import DeepResearchAgent
from ai_agents.file_processor import FileProcessor
from ai_agents.config import Config as AIConfig

load_dotenv()

app = FastAPI(
    title="GEORISKMOD API - Unified Server",
    description="Unified API for GEORISKMOD including AI-powered Local Lore extraction and risk assessment",
    version="2.0.0"
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
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

# Initialize AI agents
extraction_agent = DocumentExtractionAgent()
research_agent = DeepResearchAgent()
file_processor = FileProcessor()

# Create AI upload directory
os.makedirs(AIConfig.UPLOAD_DIR, exist_ok=True)

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
        "message": "GEORISKMOD API - Unified Server with AI Agents",
        "version": "2.0.0",
        "services": {
            "core": "GEORISKMOD Risk Assessment",
            "ai": "Local Lore AI Agents (Extraction & Research)"
        },
        "endpoints": {
            "health": "/api/health",
            "ai_health": "/ai/health",
            "locations": "/api/locations",
            "events": "/api/events",
            "risks": "/api/risks",
            "vulnerabilities": "/api/vulnerabilities",
            "local_lore": "/api/local-lore",
            "historical_events": "/api/historical-events",
            "data_sources": "/api/data-sources",
            "file_upload": "/api/upload",
            "statistics": "/api/statistics",
            "ai_extract_text": "/ai/extract/text",
            "ai_extract_file": "/ai/extract/file",
            "ai_research": "/ai/research",
            "ai_config": "/ai/config",
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

# ===== AI AGENTS ENDPOINTS =====

@app.get("/ai/health")
async def ai_health_check():
    """AI agents health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "openai_configured": bool(AIConfig.OPENAI_API_KEY),
        "models": {
            "extraction": AIConfig.OPENAI_MODEL,
            "research": AIConfig.OPENAI_RESEARCH_MODEL
        },
        "agents": {
            "extraction": "DocumentExtractionAgent",
            "research": "DeepResearchAgent",
            "file_processor": "FileProcessor"
        }
    }

@app.post("/ai/extract/text", response_model=List[LocalLoreExtraction])
async def ai_extract_from_text(request: ExtractionRequest):
    """
    Extract Local Lore data from raw text using AI.

    **Request Body:**
    - `text`: Text content to analyze
    - `location_context`: Optional location context
    - `current_date`: Optional current date for calculations

    **Returns:** List of extracted LocalLoreExtraction objects with calculated scores
    """
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="No text provided")

        results = await extraction_agent.extract_from_text(request)
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

@app.post("/ai/extract/file", response_model=List[LocalLoreExtraction])
async def ai_extract_from_file(
    file: UploadFile = File(...),
    location_context: Optional[str] = Form(None)
):
    """
    Extract Local Lore data from an uploaded document using AI.

    **Supported formats:** PDF, DOCX, TXT, MD

    **Form Data:**
    - `file`: Document file to process
    - `location_context`: Optional location context

    **Returns:** List of extracted LocalLoreExtraction objects with calculated scores
    """
    try:
        # Save uploaded file
        file_content = await file.read()
        file_path = os.path.join(AIConfig.UPLOAD_DIR, file.filename)

        with open(file_path, 'wb') as f:
            f.write(file_content)

        # Get file info
        file_info = file_processor.get_file_info(file_path)

        if not file_info["is_supported"]:
            os.remove(file_path)  # Clean up
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_info['extension']}. "
                       f"Supported: {', '.join(FileProcessor.SUPPORTED_EXTENSIONS)}"
            )

        # Check file size
        if file_info["size_bytes"] > AIConfig.MAX_FILE_SIZE:
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {AIConfig.MAX_FILE_SIZE / (1024*1024)}MB"
            )

        # Extract text
        text = file_processor.extract_text(file_path)

        # Create extraction request
        request = ExtractionRequest(
            text=text,
            location_context=location_context,
            current_date=datetime.now()
        )

        # Extract lore data
        results = await extraction_agent.extract_from_text(request)

        # Clean up file (optional - you might want to keep for audit)
        # os.remove(file_path)

        return results

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI file processing failed: {str(e)}")

@app.post("/ai/research", response_model=ResearchResult)
async def ai_conduct_research(query: ResearchQuery):
    """
    Conduct deep AI research about a location's mass movement history.

    **Request Body:**
    - `location`: Location to research (required)
    - `hazard_type`: Specific hazard type to focus on (optional)
    - `time_range_years`: Years of history to search (default: 50)
    - `include_indigenous_knowledge`: Include indigenous/local knowledge (default: true)
    - `max_sources`: Maximum number of sources to find (default: 10)

    **Returns:** ResearchResult with comprehensive AI-powered findings
    """
    try:
        if not query.location:
            raise HTTPException(status_code=400, detail="Location is required")

        result = await research_agent.conduct_research(query)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI research failed: {str(e)}")

@app.post("/ai/research/batch")
async def ai_batch_research(
    locations: List[str],
    hazard_type: Optional[AIHazardType] = None,
    time_range_years: int = 50
):
    """
    Conduct AI research on multiple locations.

    **Request Body:**
    - `locations`: List of location names
    - `hazard_type`: Optional hazard type focus
    - `time_range_years`: Years of history to search

    **Returns:** Dictionary mapping locations to AI research results
    """
    try:
        if not locations:
            raise HTTPException(status_code=400, detail="No locations provided")

        if len(locations) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 locations per batch")

        results = {}
        for location in locations:
            query = ResearchQuery(
                location=location,
                hazard_type=hazard_type,
                time_range_years=time_range_years
            )

            try:
                result = await research_agent.conduct_research(query)
                results[location] = result
            except Exception as e:
                results[location] = {"error": str(e)}

        return results

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI batch research failed: {str(e)}")

@app.get("/ai/supported-formats")
async def ai_get_supported_formats():
    """Get list of supported file formats for AI processing"""
    return {
        "supported_extensions": list(FileProcessor.SUPPORTED_EXTENSIONS),
        "max_file_size_mb": AIConfig.MAX_FILE_SIZE / (1024 * 1024)
    }

@app.get("/ai/config")
async def ai_get_config():
    """Get current AI configuration (non-sensitive)"""
    return {
        "lore_weights": AIConfig.LORE_WEIGHTS,
        "source_credibility": AIConfig.SOURCE_CREDIBILITY,
        "hazard_types": AIConfig.HAZARD_TYPES,
        "models": {
            "extraction": AIConfig.OPENAI_MODEL,
            "research": AIConfig.OPENAI_RESEARCH_MODEL
        },
        "recency_config": {
            "decay_rate": AIConfig.DECAY_RATE,
            "cultural_memory_enabled": AIConfig.CULTURAL_MEMORY_ENABLED,
            "cultural_memory_baseline": AIConfig.CULTURAL_MEMORY_BASELINE
        }
    }

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
# AI AGENT HELPER FUNCTIONS
# =============================================================================
# These functions integrate the real AI agents with the lore collection system
# =============================================================================

async def ai_agent_analyze_story(story_id: int, story_text: str, file_path: Optional[str] = None) -> dict:
    """
    AI agent analyzes user-provided story to extract:
    - Event date (recency)
    - Event type (what happened)
    - Spatial information (where)
    - Credibility score

    Uses the real DocumentExtractionAgent to analyze the story
    """
    try:
        # Create extraction request
        request = ExtractionRequest(
            text=story_text,
            location_context=None,
            current_date=datetime.now()
        )

        # Call the real extraction agent
        results = await extraction_agent.extract_from_text(request)

        if not results or len(results) == 0:
            return {
                "ai_event_date": None,
                "ai_event_type": "unknown",
                "ai_recency_score": 0.0,
                "ai_spatial_relevance": 0.0,
                "ai_credibility_score": 0.0,
                "ai_confidence": 0.0,
                "ai_summary": "No events extracted from the story",
                "ai_extracted_locations": []
            }

        # Take the first (most relevant) extraction
        extraction = results[0]

        # Convert to lore_stories format
        return {
            "ai_event_date": extraction.event_date.isoformat() if extraction.event_date else None,
            "ai_event_type": "landslide",  # Default to landslide
            "ai_recency_score": extraction.recent_score or 0.0,
            "ai_spatial_relevance": extraction.spatial_score or 0.0,
            "ai_credibility_score": extraction.credibility_score or 0.0,
            "ai_confidence": extraction.confidence_band or 0.0,
            "ai_summary": extraction.event_narrative,
            "ai_extracted_locations": [
                {
                    "name": extraction.place_name,
                    "latitude": None,  # Would need geocoding
                    "longitude": None,
                    "confidence": extraction.confidence_band or 0.0
                }
            ]
        }

    except Exception as e:
        # Return error result
        return {
            "ai_event_date": None,
            "ai_event_type": "unknown",
            "ai_recency_score": 0.0,
            "ai_spatial_relevance": 0.0,
            "ai_credibility_score": 0.0,
            "ai_confidence": 0.0,
            "ai_summary": f"AI analysis failed: {str(e)}",
            "ai_extracted_locations": []
        }

async def ai_agent_discover_lore(latitude: float, longitude: float, radius_m: float) -> dict:
    """
    AI agent searches for lore/historical information at a location using DeepResearchAgent
    - Searches historical databases
    - Searches news archives
    - Searches indigenous knowledge repositories
    - Searches scientific literature
    """
    try:
        # Create a location string for research (lat, lon)
        location_str = f"{latitude:.6f}, {longitude:.6f}"

        # Create research query
        query = ResearchQuery(
            location=location_str,
            hazard_type=None,  # Search all hazard types
            time_range_years=100,  # Look back 100 years
            include_indigenous_knowledge=True,
            max_sources=10
        )

        # Call the real research agent
        result = await research_agent.conduct_research(query)

        # Convert findings to lore_stories format
        found_stories = []
        for finding in result.findings:
            found_stories.append({
                "title": finding.source_title or "Historical Event",
                "story_text": finding.event_narrative,
                "ai_event_date": finding.event_date.isoformat() if finding.event_date else None,
                "ai_event_type": "landslide",  # Default
                "ai_recency_score": finding.recent_score or 0.0,
                "ai_spatial_relevance": finding.spatial_score or 0.0,
                "ai_credibility_score": finding.credibility_score or 0.0,
                "source": finding.source_title or "Unknown"
            })

        return {
            "found_stories": found_stories,
            "search_metadata": {
                "sources_searched": ["research_agent"],
                "total_matches": len(found_stories),
                "confidence": result.confidence,
                "summary": result.summary
            }
        }

    except Exception as e:
        # Return empty results on error
        return {
            "found_stories": [],
            "search_metadata": {
                "sources_searched": [],
                "total_matches": 0,
                "error": str(e)
            }
        }

async def ai_agent_search_observation(observation_sight: str, observation_sound: str, latitude: float, longitude: float) -> dict:
    """
    AI agent searches for information based on user observations using extraction agent
    - Analyzes sight description (e.g., "fresh scarp")
    - Analyzes sound description (e.g., "cracking sounds")
    - Searches for similar reports
    - Assesses urgency/risk
    """
    try:
        # Combine observations into text for extraction
        observation_text = f"Field observation at location {latitude}, {longitude}:\n"
        if observation_sight:
            observation_text += f"Visual observation: {observation_sight}\n"
        if observation_sound:
            observation_text += f"Audio observation: {observation_sound}\n"

        # Create extraction request
        request = ExtractionRequest(
            text=observation_text,
            location_context=f"{latitude}, {longitude}",
            current_date=datetime.now()
        )

        # Call extraction agent to analyze the observation
        results = await extraction_agent.extract_from_text(request)

        if results and len(results) > 0:
            extraction = results[0]

            return {
                "interpretation": extraction.event_narrative,
                "similar_cases": [],  # Would need separate research
                "ai_event_type": "field_observation",
                "ai_recency_score": 0.95,  # Very recent observation
                "ai_spatial_relevance": 1.0,  # Exact location
                "ai_credibility_score": extraction.credibility_score or 0.85,
                "ai_confidence": extraction.confidence_band or 0.8,
                "urgency_level": "medium",
                "recommended_action": "Monitor and document the observation"
            }
        else:
            return {
                "interpretation": observation_text,
                "similar_cases": [],
                "ai_event_type": "field_observation",
                "ai_recency_score": 0.95,
                "ai_spatial_relevance": 1.0,
                "ai_credibility_score": 0.85,
                "ai_confidence": 0.5,
                "urgency_level": "low",
                "recommended_action": "Observation recorded"
            }

    except Exception as e:
        return {
            "interpretation": f"Error analyzing observation: {str(e)}",
            "similar_cases": [],
            "ai_event_type": "unknown",
            "ai_recency_score": 0.0,
            "ai_spatial_relevance": 0.0,
            "ai_credibility_score": 0.0,
            "ai_confidence": 0.0,
            "urgency_level": "unknown",
            "recommended_action": "Error occurred during analysis"
        }

# =============================================================================
# LORE ENDPOINTS
# =============================================================================

@app.post("/api/lore/submit-story")
async def submit_lore_story(request: SubmitStoryRequest):
    """
    Scenario 1: User provides a story/lore with title and optional location
    The story text will be analyzed by extraction_agent AI to extract:
    - Recency (when did it happen?)  -> l1_recency_score
    - Credibility (source reliability) -> l2_credibility_score
    - Spatial information (where) -> l3_spatial_score
    - Overall L_Score calculated and saved to local_lore table
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Call extraction agent to analyze the story
            extraction_request = ExtractionRequest(
                text=request.story_text or "",
                location_context=request.location_description,
                current_date=datetime.now()
            )

            results = await extraction_agent.extract_from_text(extraction_request)

            if not results or len(results) == 0:
                raise HTTPException(status_code=400, detail="AI agent could not extract any lore data from the story")

            # Take the first (most relevant) extraction
            extraction = results[0]

            # Create or get location
            if request.latitude and request.longitude:
                location_name = request.location_description or extraction.place_name or "Unnamed Location"

                cur.execute("""
                    INSERT INTO location (name, latitude, longitude, description)
                    VALUES (%(name)s, %(latitude)s, %(longitude)s, %(description)s)
                    ON CONFLICT (name, latitude, longitude)
                    DO UPDATE SET description = %(description)s
                    RETURNING location_id
                """, {
                    'name': location_name,
                    'latitude': request.latitude,
                    'longitude': request.longitude,
                    'description': request.location_description or extraction.event_narrative[:200]
                })

                location_id = cur.fetchone()['location_id']
            else:
                # Create a default location if not provided
                cur.execute("""
                    INSERT INTO location (name, latitude, longitude, description)
                    VALUES (%(name)s, 0, 0, %(description)s)
                    RETURNING location_id
                """, {
                    'name': extraction.place_name or "Unknown Location",
                    'description': 'Location from AI extraction - coordinates need to be updated'
                })
                location_id = cur.fetchone()['location_id']

            # Convert source_type enum to string for database
            source_type_str = extraction.source_type.value if hasattr(extraction.source_type, 'value') else str(extraction.source_type)

            # Insert into local_lore table with all AI-extracted fields and scores
            cur.execute("""
                INSERT INTO local_lore (
                    location_id,
                    lore_narrative,
                    place_name,
                    event_location_name,
                    source_type,
                    source_title,
                    source_url,
                    source_author,
                    event_date,
                    event_date_uncertainty_year,
                    years_ago,
                    distance_to_report_location,
                    confidence_band,
                    spatial_confidence,
                    temporal_confidence,
                    credibility_confidence,
                    l1_recency_score,
                    l2_credibility_score,
                    l3_spatial_score,
                    l_score,
                    created_date
                )
                VALUES (
                    %(location_id)s,
                    %(lore_narrative)s,
                    %(place_name)s,
                    %(event_location_name)s,
                    %(source_type)s,
                    %(source_title)s,
                    %(source_url)s,
                    %(source_author)s,
                    %(event_date)s,
                    %(event_date_uncertainty_year)s,
                    %(years_ago)s,
                    %(distance_to_report_location)s,
                    %(confidence_band)s,
                    %(spatial_confidence)s,
                    %(temporal_confidence)s,
                    %(credibility_confidence)s,
                    %(l1_recency_score)s,
                    %(l2_credibility_score)s,
                    %(l3_spatial_score)s,
                    %(l_score)s,
                    CURRENT_TIMESTAMP
                )
                RETURNING lore_id
            """, {
                'location_id': location_id,
                'lore_narrative': extraction.event_narrative,
                'place_name': extraction.place_name,
                'event_location_name': extraction.place_name,
                'source_type': source_type_str,
                'source_title': request.title or extraction.source_title,
                'source_url': extraction.source_url,
                'source_author': extraction.source_author,
                'event_date': extraction.event_date,
                'event_date_uncertainty_year': extraction.event_date_uncertainty_years or 0,
                'years_ago': int(extraction.years_ago) if extraction.years_ago else None,
                'distance_to_report_location': extraction.distance_to_report,
                'confidence_band': 'high' if (extraction.confidence_band or 0) > 0.7 else 'medium' if (extraction.confidence_band or 0) > 0.4 else 'low',
                'spatial_confidence': extraction.spatial_score,
                'temporal_confidence': extraction.recent_score,
                'credibility_confidence': extraction.credibility_score,
                'l1_recency_score': extraction.recent_score,
                'l2_credibility_score': extraction.credibility_score,
                'l3_spatial_score': extraction.spatial_score,
                'l_score': extraction.l_score
            })

            lore_id = cur.fetchone()['lore_id']
            conn.commit()

            return {
                "lore_id": lore_id,
                "location_id": location_id,
                "message": "Story submitted and analyzed successfully",
                "ai_status": "completed",
                "l_score": extraction.l_score,
                "ai_results": {
                    "event_narrative": extraction.event_narrative,
                    "place_name": extraction.place_name,
                    "event_date": extraction.event_date.isoformat() if extraction.event_date else None,
                    "years_ago": extraction.years_ago,
                    "source_type": source_type_str,
                    "l1_recency_score": extraction.recent_score,
                    "l2_credibility_score": extraction.credibility_score,
                    "l3_spatial_score": extraction.spatial_score,
                    "l_score": extraction.l_score,
                    "confidence": extraction.confidence_band
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing story: {str(e)}")
    finally:
        conn.close()

@app.post("/api/lore/discover-at-location")
async def discover_lore_at_location(request: DiscoverLoreRequest):
    """
    Scenario 2: AI discovers lore at a given location using research_agent
    AI searches historical databases, news archives, indigenous knowledge, etc.
    Saves results to local_lore table with calculated L_Score
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Create a location string for research (lat, lon)
            location_str = f"{request.latitude:.6f}, {request.longitude:.6f}"

            # Create research query using research_agent
            query = ResearchQuery(
                location=location_str,
                hazard_type=None,  # Search all hazard types
                time_range_years=100,  # Look back 100 years
                include_indigenous_knowledge=True,
                max_sources=10
            )

            # Call the real research agent
            result = await research_agent.conduct_research(query)

            if not result.findings or len(result.findings) == 0:
                return {
                    "message": "No lore discovered at this location",
                    "lore_ids": [],
                    "location": {
                        "latitude": request.latitude,
                        "longitude": request.longitude,
                        "radius_m": request.location_radius_m
                    },
                    "ai_results": {
                        "summary": "No historical events or lore found for this location"
                    }
                }

            # Create or get location
            location_name = f"Location ({request.latitude:.4f}, {request.longitude:.4f})"

            cur.execute("""
                INSERT INTO location (name, latitude, longitude, description)
                VALUES (%(name)s, %(latitude)s, %(longitude)s, %(description)s)
                ON CONFLICT (name, latitude, longitude)
                DO UPDATE SET description = %(description)s
                RETURNING location_id
            """, {
                'name': location_name,
                'latitude': request.latitude,
                'longitude': request.longitude,
                'description': f'AI-discovered location within {request.location_radius_m}m radius'
            })

            location_id = cur.fetchone()['location_id']

            # Store each discovered lore finding in local_lore table
            lore_ids = []
            for finding in result.findings:
                # Convert source_type enum to string
                source_type_str = finding.source_type.value if hasattr(finding.source_type, 'value') else str(finding.source_type)

                cur.execute("""
                    INSERT INTO local_lore (
                        location_id,
                        lore_narrative,
                        place_name,
                        event_location_name,
                        source_type,
                        source_title,
                        source_url,
                        source_author,
                        event_date,
                        event_date_uncertainty_year,
                        years_ago,
                        distance_to_report_location,
                        confidence_band,
                        spatial_confidence,
                        temporal_confidence,
                        credibility_confidence,
                        l1_recency_score,
                        l2_credibility_score,
                        l3_spatial_score,
                        l_score,
                        created_date
                    )
                    VALUES (
                        %(location_id)s,
                        %(lore_narrative)s,
                        %(place_name)s,
                        %(event_location_name)s,
                        %(source_type)s,
                        %(source_title)s,
                        %(source_url)s,
                        %(source_author)s,
                        %(event_date)s,
                        %(event_date_uncertainty_year)s,
                        %(years_ago)s,
                        %(distance_to_report_location)s,
                        %(confidence_band)s,
                        %(spatial_confidence)s,
                        %(temporal_confidence)s,
                        %(credibility_confidence)s,
                        %(l1_recency_score)s,
                        %(l2_credibility_score)s,
                        %(l3_spatial_score)s,
                        %(l_score)s,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING lore_id
                """, {
                    'location_id': location_id,
                    'lore_narrative': finding.event_narrative,
                    'place_name': finding.place_name,
                    'event_location_name': finding.place_name,
                    'source_type': source_type_str,
                    'source_title': finding.source_title or "AI Discovered Event",
                    'source_url': finding.source_url,
                    'source_author': finding.source_author,
                    'event_date': finding.event_date,
                    'event_date_uncertainty_year': finding.event_date_uncertainty_years or 0,
                    'years_ago': int(finding.years_ago) if finding.years_ago else None,
                    'distance_to_report_location': finding.distance_to_report,
                    'confidence_band': 'high' if (finding.confidence_band or 0) > 0.7 else 'medium' if (finding.confidence_band or 0) > 0.4 else 'low',
                    'spatial_confidence': finding.spatial_score,
                    'temporal_confidence': finding.recent_score,
                    'credibility_confidence': finding.credibility_score,
                    'l1_recency_score': finding.recent_score,
                    'l2_credibility_score': finding.credibility_score,
                    'l3_spatial_score': finding.spatial_score,
                    'l_score': finding.l_score
                })

                lore_ids.append(cur.fetchone()['lore_id'])

            conn.commit()

            return {
                "message": f"Discovered {len(lore_ids)} lore stories at location",
                "lore_ids": lore_ids,
                "location_id": location_id,
                "location": {
                    "latitude": request.latitude,
                    "longitude": request.longitude,
                    "radius_m": request.location_radius_m
                },
                "ai_results": {
                    "summary": result.summary,
                    "confidence": result.confidence,
                    "sources_count": result.sources_count,
                    "findings_count": len(result.findings)
                }
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error discovering lore: {str(e)}")
    finally:
        conn.close()

@app.post("/api/lore/submit-observation")
async def submit_observation(request: SubmitObservationRequest):
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

            # Call AI agent to search based on observation (real implementation)
            try:
                # Update job status
                cur.execute("""
                    UPDATE lore_ai_jobs
                    SET status = 'running', started_at = CURRENT_TIMESTAMP
                    WHERE job_id = %(job_id)s
                """, {'job_id': job_id})
                conn.commit()

                # Call AI agent (real implementation)
                ai_results = await ai_agent_search_observation(
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
    print("=" * 80)
    print("🚀 Starting GEORISKMOD Unified API Server (v2.0.0)")
    print("=" * 80)
    print("📍 Main Server: http://localhost:8001")
    print("📚 API Documentation: http://localhost:8001/docs")
    print("🏥 Database Health: http://localhost:8001/api/health")
    print("🤖 AI Agents Health: http://localhost:8001/ai/health")
    print("")
    print("🔬 AI Capabilities:")
    print("   - Document Extraction: /ai/extract/text, /ai/extract/file")
    print("   - Deep Research: /ai/research")
    print("   - Lore Collection: /api/lore/*")
    print("")
    print("📊 GEORISKMOD Services:")
    print("   - Risk Assessment: /api/calculate-risk")
    print("   - H/L/V Factors: /api/h-factor, /api/l-factor-story, /api/v-factor")
    print("   - Data Management: /api/locations, /api/events, /api/data-sources")
    print("=" * 80)

    uvicorn.run(app, host="0.0.0.0", port=8001)

