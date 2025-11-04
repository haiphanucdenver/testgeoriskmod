from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class SourceType(str, Enum):
    HISTORICAL = "historical"
    INDIGENOUS = "indigenous"
    NEWSPAPER = "newspaper"
    FIELD_NOTES = "field_notes"
    ORAL_TRADITION = "oral_tradition"
    EYEWITNESS = "eyewitness"
    SCIENTIFIC = "scientific"
    OFFICIAL = "official"
    UNKNOWN = "unknown"

class HazardType(str, Enum):
    DEBRIS_FLOW = "debris_flow"
    LANDSLIDE = "landslide"
    ROCKFALL = "rockfall"
    LAVA_FLOW = "lava_flow"

class LocalLoreExtraction(BaseModel):
    """Extracted local lore data from documents"""
    
    # Event Information
    event_narrative: str = Field(..., description="Description of the historical event")
    place_name: str = Field(..., description="Location where the event occurred")
    event_date: Optional[datetime] = Field(None, description="When the event occurred")
    years_ago: Optional[float] = Field(None, description="Years from event to now")
    event_date_uncertainty_years: Optional[float] = Field(0, description="Uncertainty in event dating")
    
    # Source Information
    source_type: SourceType = Field(..., description="Type of information source")
    source_title: Optional[str] = Field(None, description="Title of the source document")
    source_url: Optional[str] = Field(None, description="URL if available")
    source_author: Optional[str] = Field(None, description="Author of the source")
    
    # Spatial Information
    distance_to_report: Optional[float] = Field(None, description="Distance from event to current assessment location (km)")
    geotagged_photos: Optional[List[str]] = Field(default_factory=list, description="URLs or paths to geotagged photos")
    
    # Scoring Components (computed)
    recent_score: Optional[float] = Field(None, ge=0, le=1, description="Recency score [0-1]")
    credibility_score: Optional[float] = Field(None, ge=0, le=1, description="Credibility score [0-1]")
    spatial_score: Optional[float] = Field(None, ge=0, le=1, description="Spatial relevance score [0-1]")
    l_score: Optional[float] = Field(None, ge=0, le=1, description="Overall L score")
    
    # Metadata
    confidence_band: Optional[float] = Field(None, ge=0, le=1, description="Extraction confidence")
    extraction_timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_schema_extra = {
            "example": {
                "event_narrative": "Major landslide destroyed village after heavy rains",
                "place_name": "Armero, Colombia",
                "event_date": "1985-11-13T00:00:00",
                "years_ago": 39,
                "event_date_uncertainty_years": 0,
                "source_type": "historical",
                "source_title": "Armero Tragedy Historical Records",
                "credibility_score": 0.9,
                "recent_score": 0.4,
                "spatial_score": 0.8
            }
        }

class ResearchQuery(BaseModel):
    """Query for deep research about a location"""
    location: str = Field(..., description="Location to research")
    hazard_type: Optional[HazardType] = Field(None, description="Specific hazard type to focus on")
    time_range_years: Optional[int] = Field(50, description="How many years back to search")
    include_indigenous_knowledge: bool = Field(True, description="Include indigenous/local knowledge")
    max_sources: int = Field(10, description="Maximum number of sources to research")

class ResearchResult(BaseModel):
    """Result from deep research agent"""
    location: str
    hazard_type: Optional[HazardType]
    findings: List[LocalLoreExtraction]
    summary: str = Field(..., description="Summary of all findings")
    confidence: float = Field(..., ge=0, le=1, description="Overall confidence in findings")
    sources_count: int = Field(..., description="Number of sources found")
    research_timestamp: datetime = Field(default_factory=datetime.now)

class ExtractionRequest(BaseModel):
    """Request to extract lore from a document"""
    text: Optional[str] = Field(None, description="Text content to extract from")
    file_path: Optional[str] = Field(None, description="Path to file to process")
    location_context: Optional[str] = Field(None, description="Location context for the extraction")
    current_date: datetime = Field(default_factory=datetime.now, description="Current date for calculating years_ago")

class LoreScore(BaseModel):
    """Computed L score following the formula L = w1*L1 + w2*L2 + w3*L3"""
    recent_score: float = Field(..., ge=0, le=1, description="L1: Recent score")
    credibility_score: float = Field(..., ge=0, le=1, description="L2: Credibility score")
    spatial_score: float = Field(..., ge=0, le=1, description="L3: Spatial score")
    l_score: float = Field(..., ge=0, le=1, description="Final L = 0.35*L1 + 0.40*L2 + 0.25*L3")
    weights_used: dict = Field(default={"w1": 0.35, "w2": 0.40, "w3": 0.25})
