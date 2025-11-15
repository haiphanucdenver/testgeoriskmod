# from fastapi import FastAPI, UploadFile, File, HTTPException, Form
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from typing import List, Optional
# import os
# from datetime import datetime

# from models import (
#     ExtractionRequest,
#     ResearchQuery,
#     LocalLoreExtraction,
#     ResearchResult,
#     HazardType
# )
# from extraction_agent import DocumentExtractionAgent
# from research_agent import DeepResearchAgent
# from file_processor import FileProcessor
# from config import Config
  
# # Initialize FastAPI app
# app = FastAPI(
#     title="Borromean Risk - Local Lore AI Agents",
#     description="AI-powered extraction and research agents for Local Lore data",
#     version="1.0.0"
# )

# # Configure CORS for frontend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Initialize agents
# extraction_agent = DocumentExtractionAgent()
# research_agent = DeepResearchAgent()
# file_processor = FileProcessor()

# # Create upload directory
# os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

# @app.get("/")
# async def root():
#     """Health check endpoint"""
#     return {
#         "status": "online",
#         "service": "Borromean Risk - Local Lore AI Agents",
#         "version": "1.0.0",
#         "endpoints": {
#             "extract_text": "/api/extract/text",
#             "extract_file": "/api/extract/file",
#             "research": "/api/research",
#             "health": "/health"
#         }
#     }

# @app.get("/health")
# async def health_check():
#     """Detailed health check"""
#     return {
#         "status": "healthy",
#         "timestamp": datetime.now().isoformat(),
#         "openai_configured": bool(Config.OPENAI_API_KEY),
#         "models": {
#             "extraction": Config.OPENAI_MODEL,
#             "research": Config.OPENAI_RESEARCH_MODEL
#         }
#     }

# @app.post("/api/extract/text", response_model=List[LocalLoreExtraction])
# async def extract_from_text(request: ExtractionRequest):
#     """
#     Extract Local Lore data from raw text.
    
#     **Request Body:**
#     - `text`: Text content to analyze
#     - `location_context`: Optional location context
#     - `current_date`: Optional current date for calculations
    
#     **Returns:** List of extracted LocalLoreExtraction objects with calculated scores
#     """
#     try:
#         if not request.text:
#             raise HTTPException(status_code=400, detail="No text provided")
        
#         results = await extraction_agent.extract_from_text(request)
#         return results
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

# @app.post("/api/extract/file", response_model=List[LocalLoreExtraction])
# async def extract_from_file(
#     file: UploadFile = File(...),
#     location_context: Optional[str] = Form(None)
# ):
#     """
#     Extract Local Lore data from an uploaded document.
    
#     **Supported formats:** PDF, DOCX, TXT, MD
    
#     **Form Data:**
#     - `file`: Document file to process
#     - `location_context`: Optional location context
    
#     **Returns:** List of extracted LocalLoreExtraction objects with calculated scores
#     """
#     try:
#         # Save uploaded file
#         file_content = await file.read()
#         file_path = os.path.join(Config.UPLOAD_DIR, file.filename)
        
#         with open(file_path, 'wb') as f:
#             f.write(file_content)
        
#         # Get file info
#         file_info = file_processor.get_file_info(file_path)
        
#         if not file_info["is_supported"]:
#             os.remove(file_path)  # Clean up
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Unsupported file type: {file_info['extension']}. "
#                        f"Supported: {', '.join(FileProcessor.SUPPORTED_EXTENSIONS)}"
#             )
        
#         # Check file size
#         if file_info["size_bytes"] > Config.MAX_FILE_SIZE:
#             os.remove(file_path)
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"File too large. Max size: {Config.MAX_FILE_SIZE / (1024*1024)}MB"
#             )
        
#         # Extract text
#         text = file_processor.extract_text(file_path)
        
#         # Create extraction request
#         request = ExtractionRequest(
#             text=text,
#             location_context=location_context,
#             current_date=datetime.now()
#         )
        
#         # Extract lore data
#         results = await extraction_agent.extract_from_text(request)
        
#         # Clean up file (optional - you might want to keep for audit)
#         # os.remove(file_path)
        
#         return results
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

# @app.post("/api/research", response_model=ResearchResult)
# async def conduct_research(query: ResearchQuery):
#     """
#     Conduct deep research about a location's mass movement history.
    
#     **Request Body:**
#     - `location`: Location to research (required)
#     - `hazard_type`: Specific hazard type to focus on (optional)
#     - `time_range_years`: Years of history to search (default: 50)
#     - `include_indigenous_knowledge`: Include indigenous/local knowledge (default: true)
#     - `max_sources`: Maximum number of sources to find (default: 10)
    
#     **Returns:** ResearchResult with comprehensive findings
#     """
#     try:
#         if not query.location:
#             raise HTTPException(status_code=400, detail="Location is required")
        
#         result = await research_agent.conduct_research(query)
#         return result
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")

# @app.post("/api/research/batch")
# async def batch_research(
#     locations: List[str],
#     hazard_type: Optional[HazardType] = None,
#     time_range_years: int = 50
# ):
#     """
#     Conduct research on multiple locations.
    
#     **Request Body:**
#     - `locations`: List of location names
#     - `hazard_type`: Optional hazard type focus
#     - `time_range_years`: Years of history to search
    
#     **Returns:** Dictionary mapping locations to results
#     """
#     try:
#         if not locations:
#             raise HTTPException(status_code=400, detail="No locations provided")
        
#         if len(locations) > 10:
#             raise HTTPException(status_code=400, detail="Maximum 10 locations per batch")
        
#         results = {}
#         for location in locations:
#             query = ResearchQuery(
#                 location=location,
#                 hazard_type=hazard_type,
#                 time_range_years=time_range_years
#             )
            
#             try:
#                 result = await research_agent.conduct_research(query)
#                 results[location] = result
#             except Exception as e:
#                 results[location] = {"error": str(e)}
        
#         return results
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Batch research failed: {str(e)}")

# @app.get("/api/supported-formats")
# async def get_supported_formats():
#     """Get list of supported file formats"""
#     return {
#         "supported_extensions": list(FileProcessor.SUPPORTED_EXTENSIONS),
#         "max_file_size_mb": Config.MAX_FILE_SIZE / (1024 * 1024)
#     }

# @app.get("/api/config")
# async def get_config():
#     """Get current configuration (non-sensitive)"""
#     return {
#         "lore_weights": Config.LORE_WEIGHTS,
#         "source_credibility": Config.SOURCE_CREDIBILITY,
#         "hazard_types": Config.HAZARD_TYPES,
#         "models": {
#             "extraction": Config.OPENAI_MODEL,
#             "research": Config.OPENAI_RESEARCH_MODEL
#         }
#     }

# @app.exception_handler(Exception)
# async def global_exception_handler(request, exc):
#     """Global exception handler"""
#     return JSONResponse(
#         status_code=500,
#         content={
#             "error": "Internal server error",
#             "detail": str(exc),
#             "type": type(exc).__name__
#         }
#     )

# if __name__ == "__main__":
#     import uvicorn
    
#     print("="*80)
#     print("🚀 Starting Borromean Risk - Local Lore AI Agents API")
#     print("="*80)
#     print(f"📍 Server: http://{Config.API_HOST}:{Config.API_PORT}")
#     print(f"📚 Docs: http://{Config.API_HOST}:{Config.API_PORT}/docs")
#     print(f"🤖 Models:")
#     print(f"   - Extraction: {Config.OPENAI_MODEL}")
#     print(f"   - Research: {Config.OPENAI_RESEARCH_MODEL}")
#     print("="*80)
    
#     uvicorn.run(
#         "api:app",
#         host=Config.API_HOST,
#         port=Config.API_PORT,
#         reload=True
#     )
