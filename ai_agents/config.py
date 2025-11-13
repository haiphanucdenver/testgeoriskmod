import os
from dotenv import load_dotenv
from enum import Enum
from models import SourceType
load_dotenv()


class Config:
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = "gpt-5"  
    #OPENAI_RESEARCH_MODEL = "gpt-4-turbo-preview"  # For deep research
    OPENAI_RESEARCH_MODEL = "gpt-4o"  # check model 
    #OPENAI_RESEARCH_MODEL = "o3-deep-research"  # For deep research
    
    # Agent Configuration
    MAX_TOKENS = 4000 # Should be 4000
    TEMPERATURE = 0.2  # Lower for more deterministic extraction
    
    # Local Lore Scoring Weights
    LORE_WEIGHTS = {
        "recent": 0.35,      # w1 - Recency weight
        "credibility": 0.40,  # w2 - Credibility weight
        "spatial": 0.25       # w3 - Spatial relevance weight
    }
    
    # Source Type Credibility Mapping
    SOURCE_CREDIBILITY = {
        "scientific": 0.9,
        "official": 0.9,
        "historical": 0.8,
        "newspaper": 0.7,
        "field_notes": 0.7,
        "eyewitness": 0.65,
        "indigenous": 0.6,
        "oral_tradition": 0.4,
        "unknown": 0.2
    }
    
    # Hazard Types
    HAZARD_TYPES = {
        "debris_flow": 0.9,
        "landslide": 0.8,
        "rockfall": 0.6,
        "lava_flow": 0.5
    }
    


    # ========== RECENCY CALCULATION ==========
    DECAY_RATE = 50.0            # Standard exponential decay rate (years)
    MIN_RECENT_SCORE = 0.0       # No universal floor
    
    # ========== CULTURAL MEMORY (NEW) ==========
    # Special treatment for oral traditions and indigenous knowledge
    CULTURAL_MEMORY_ENABLED = True
    CULTURAL_MEMORY_BASELINE = 0.20   # Floor for oral traditions
    CULTURAL_MEMORY_BOOST = 0.18      # Additional boost for relatively recent
    CULTURAL_MEMORY_DECAY = 200.0     # Slower decay rate (years)
    CULTURAL_SOURCES = [SourceType.ORAL_TRADITION, SourceType.INDIGENOUS]
    
    # ========== SPATIAL CALCULATION ==========
    SPATIAL_SIGMA_D = 0.5        # 500m decay scale in km
    SPATIAL_DEFAULT = 0.5        # Default when distance unknown

    # API Configuration
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    # Database (for future use)
    DB_PATH = "./lore_database.sqlite"
    
    # File Upload
    UPLOAD_DIR = "./uploads"
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
