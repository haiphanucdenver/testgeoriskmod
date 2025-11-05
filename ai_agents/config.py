import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    #OPENAI_MODEL = "o1-preview"  # Reasoning model
    OPENAI_MODEL = "gpt-5"  # check model
    #OPENAI_RESEARCH_MODEL = "gpt-4-turbo-preview"  # For deep research
    OPENAI_RESEARCH_MODEL = "gpt-4o"  # check model or (gpt-5-mini-browsing)   "gpt-5-browsing" 
    
    # Agent Configuration
    MAX_TOKENS = 1000 # Should be 4000
    TEMPERATURE = 0.2  # Lower for more deterministic extraction
    
    # Local Lore Scoring Weights
    LORE_WEIGHTS = {
        "recent": 0.35,      # w1 - Recency weight
        "credibility": 0.40,  # w2 - Credibility weight
        "spatial": 0.25       # w3 - Spatial relevance weight
    }
    
    # Source Type Credibility Mapping
    SOURCE_CREDIBILITY = {
        "scientific": 1.0,
        "official": 0.9,
        "historical": 0.8,
        "newspaper": 0.7,
        "field_notes": 0.7,
        "indigenous": 0.6,
        "oral_tradition": 0.5,
        "eyewitness": 0.6,
        "unknown": 0.3
    }
    
    # Hazard Types
    HAZARD_TYPES = {
        "debris_flow": 1.0,
        "landslide": 0.8,
        "rockfall": 0.6,
        "lava_flow": 0.4
    }
    
    # API Configuration
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    # Database (for future use)
    DB_PATH = "./lore_database.sqlite"
    
    # File Upload
    UPLOAD_DIR = "./uploads"
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
