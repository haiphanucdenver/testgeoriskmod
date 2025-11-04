import json
from typing import List, Optional
from datetime import datetime
from openai import OpenAI
from models import LocalLoreExtraction, SourceType, ExtractionRequest
from lore_calculator import LoreScoreCalculator
from config import Config
import os

class DocumentExtractionAgent:
    """
    AI Agent for extracting Local Lore data from documents.
    Uses OpenAI's reasoning models (o1-preview) for intelligent extraction.
    """
    
    # def __init__(self, api_key: Optional[str] = None):
    #     self.client = OpenAI(api_key=api_key or Config.OPENAI_API_KEY)
    #     self.calculator = LoreScoreCalculator()
    #     self.model = Config.OPENAI_MODEL
    def __init__(self, api_key: Optional[str] = None):
        # If a proxy is configured in Config, export it as environment variables
        # so underlying HTTP libraries use it instead of passing a 'proxies' kw.
        proxy = getattr(Config, "OPENAI_PROXY", None)
        if proxy:
            os.environ.setdefault("HTTP_PROXY", proxy)
            os.environ.setdefault("HTTPS_PROXY", proxy)

        # Create client without passing 'proxies' (some SDKs don't accept that kw)
        try:
            self.client = OpenAI(api_key=api_key or Config.OPENAI_API_KEY)
        except TypeError as e:
            # Clear, short message to help debugging if SDK mismatch persists
            raise TypeError(
                "Failed to initialize OpenAI client. Ensure openai package version is compatible "
                "with this code and that Config does not pass unsupported kwargs (e.g., 'proxies')."
            ) from e

        self.calculator = LoreScoreCalculator()
        self.model = Config.OPENAI_MODEL
        
    def create_extraction_prompt(self, text: str, location_context: Optional[str] = None) -> str:
        """Create a detailed prompt for extracting local lore from text"""
        
        prompt = f"""You are an expert geoscientist and historian analyzing historical records of mass movements and geological hazards.

TASK: Extract structured information about historical mass movement events from the following text.

TEXT TO ANALYZE:
{text}

{f"LOCATION CONTEXT: {location_context}" if location_context else ""}

EXTRACTION REQUIREMENTS:
Extract ALL mentions of historical mass movement events (landslides, debris flows, rockfalls, lava flows, mudflows, etc.) and structure the data as follows:

For EACH event mentioned, extract:

1. EVENT NARRATIVE: Detailed description of what happened
2. PLACE NAME: Specific location where the event occurred
3. EVENT DATE: When it occurred (be as specific as possible)
   - If exact date: provide in YYYY-MM-DD format
   - If only year: provide year
   - If approximate: provide best estimate and uncertainty
4. DATE UNCERTAINTY: How uncertain is the date? (in years)
5. SOURCE TYPE: Classify as one of:
   - scientific (peer-reviewed papers, geological surveys)
   - official (government reports, civil protection documents)
   - historical (historical records, archives)
   - newspaper (news articles, journalism)
   - field_notes (field observations, technical notes)
   - indigenous (indigenous knowledge, traditional stories)
   - oral_tradition (oral histories, community narratives)
   - eyewitness (direct eyewitness accounts)
6. SOURCE DETAILS: Title, author, URL if mentioned
7. SPATIAL INFORMATION: Any distance or location details relative to other places
8. CASUALTIES/IMPACTS: If mentioned, note severity
9. EVIDENCE QUALITY: Your assessment of how reliable this information is (0-1)

OUTPUT FORMAT: Return ONLY valid JSON array of events. Each event object should have these fields:
{{
  "event_narrative": "detailed description",
  "place_name": "location name",
  "event_date": "YYYY-MM-DD or null if unknown",
  "years_ago": number or null,
  "event_date_uncertainty_years": number,
  "source_type": "one of the types above",
  "source_title": "title or null",
  "source_author": "author or null",
  "source_url": "url or null",
  "distance_to_report": null or number in km,
  "confidence_band": 0.0 to 1.0
}}

IMPORTANT:
- Extract ALL events mentioned, even if details are sparse
- Be conservative with dates - if unsure, increase uncertainty
- Classify source type accurately
- Provide confidence_band based on information quality
- Return ONLY the JSON array, no additional text

JSON OUTPUT:"""

        return prompt
    
    def parse_years_ago(self, event_date: Optional[datetime], current_date: datetime) -> Optional[float]:
        """Calculate years ago from event date"""
        if not event_date:
            return None
        
        delta = current_date - event_date
        return delta.days / 365.25
    
    async def extract_from_text(self, request: ExtractionRequest) -> List[LocalLoreExtraction]:
        """
        Extract local lore data from text using OpenAI.
        
        Args:
            request: ExtractionRequest with text and context
            
        Returns:
            List of LocalLoreExtraction objects with calculated scores
        """
        
        if not request.text:
            raise ValueError("No text provided for extraction")
        
        # Create extraction prompt
        prompt = self.create_extraction_prompt(request.text, request.location_context)
        
        try:
            # Call OpenAI with reasoning model
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=Config.TEMPERATURE,
                max_tokens=Config.MAX_TOKENS
            )
            
            # Extract response content
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            # Handle potential markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            content = content.strip()
            
            # Parse JSON
            extracted_data = json.loads(content)
            
            # Convert to LocalLoreExtraction objects
            lore_list = []
            for item in extracted_data:
                # Parse date
                event_date = None
                if item.get("event_date"):
                    try:
                        event_date = datetime.fromisoformat(item["event_date"])
                    except:
                        pass
                
                # Calculate years_ago if not provided
                years_ago = item.get("years_ago")
                if years_ago is None and event_date:
                    years_ago = self.parse_years_ago(event_date, request.current_date)
                
                # Create lore object
                lore = LocalLoreExtraction(
                    event_narrative=item.get("event_narrative", ""),
                    place_name=item.get("place_name", "Unknown"),
                    event_date=event_date,
                    years_ago=years_ago,
                    event_date_uncertainty_years=item.get("event_date_uncertainty_years", 0),
                    source_type=SourceType(item.get("source_type", "unknown")),
                    source_title=item.get("source_title"),
                    source_author=item.get("source_author"),
                    source_url=item.get("source_url"),
                    distance_to_report=item.get("distance_to_report"),
                    confidence_band=item.get("confidence_band", 0.5)
                )
                
                # Calculate scores
                lore = self.calculator.update_lore_with_scores(lore)
                
                lore_list.append(lore)
            
            return lore_list
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Response content: {content}")
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        
        except Exception as e:
            print(f"Extraction error: {e}")
            raise
    
    def extract_from_text_sync(self, request: ExtractionRequest) -> List[LocalLoreExtraction]:
        """Synchronous version of extract_from_text"""
        import asyncio
        return asyncio.run(self.extract_from_text(request))

# Example usage
if __name__ == "__main__":
    # Test document
    test_text = """
    Historical Record: Armero Tragedy, Colombia
    
    On November 13, 1985, the town of Armero was destroyed by a massive lahar 
    (volcanic mudflow) from the Nevado del Ruiz volcano. The eruption melted the 
    volcano's ice cap, creating flows that traveled over 100 km. Approximately 
    23,000 people died, making it one of the deadliest volcanic disasters in history.
    
    Previous events in the area:
    - In 1845, a similar but smaller lahar affected the region
    - Local oral traditions spoke of "angry mountain" events every few generations
    - In 1595, indigenous records mention devastating flows from the volcano
    """
    
    agent = DocumentExtractionAgent()
    
    request = ExtractionRequest(
        text=test_text,
        location_context="Armero, Colombia - Nevado del Ruiz volcano region"
    )
    
    try:
        results = agent.extract_from_text_sync(request)
        print(f"\nExtracted {len(results)} events:\n")
        
        for i, lore in enumerate(results, 1):
            print(f"Event {i}:")
            print(f"  Location: {lore.place_name}")
            print(f"  Date: {lore.event_date}")
            print(f"  Years ago: {lore.years_ago}")
            print(f"  Source: {lore.source_type.value}")
            print(f"  L Score: {lore.l_score:.3f}")
            print(f"    - Recent: {lore.recent_score:.3f}")
            print(f"    - Credibility: {lore.credibility_score:.3f}")
            print(f"    - Spatial: {lore.spatial_score:.3f}")
            print()
    
    except Exception as e:
        print(f"Error: {e}")
