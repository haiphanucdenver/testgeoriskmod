import json
from typing import List, Optional
from datetime import datetime
from openai import OpenAI
from models import (
    ResearchQuery, 
    ResearchResult, 
    LocalLoreExtraction,
    HazardType
)
from extraction_agent import DocumentExtractionAgent
from config import Config

class DeepResearchAgent:
    """
    AI Agent for conducting deep research about a location's mass movement history.
    
    This agent:
    1. Searches for historical information about the location
    2. Compiles multiple sources
    3. Extracts structured lore data
    4. Synthesizes findings into a comprehensive report
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key or Config.OPENAI_API_KEY)
        self.extraction_agent = DocumentExtractionAgent(api_key=api_key)
        self.research_model = Config.OPENAI_RESEARCH_MODEL
        
    def create_research_prompt(self, query: ResearchQuery) -> str:
        """Create a comprehensive research prompt"""
        
        hazard_focus = ""
        if query.hazard_type:
            hazard_focus = f"Focus specifically on {query.hazard_type.value.replace('_', ' ')} events."
        
        prompt = f"""You are an expert geoscientist conducting comprehensive historical research on mass movements and geological hazards.

RESEARCH MISSION:
Compile a detailed historical report about mass movement events (landslides, debris flows, rockfalls, mudflows, lava flows) in and around:

LOCATION: {query.location}

RESEARCH PARAMETERS:
- Time range: Past {query.time_range_years} years
- Maximum sources to include: {query.max_sources}
{hazard_focus}
{"- IMPORTANT: Include indigenous and local knowledge sources" if query.include_indigenous_knowledge else ""}

RESEARCH OBJECTIVES:
1. Identify ALL documented mass movement events in this location
2. Extract historical records, scientific papers, news reports, and official documents
3. Include oral traditions, indigenous knowledge, and community narratives (if available)
4. Note patterns, recurrence intervals, and triggering factors
5. Assess the quality and reliability of each source

FOR EACH EVENT FOUND, provide:
- Detailed narrative of what happened
- Specific location/place name
- Date (as precise as possible, with uncertainty noted)
- Type of event (landslide, debris flow, rockfall, etc.)
- Casualties and impacts (if known)
- Source information (title, author, type, URL if available)
- Your assessment of source credibility (0-1 scale)

RESEARCH STRATEGY:
1. Start with scientific and official sources (geological surveys, government reports)
2. Search historical archives and news records
3. Look for indigenous knowledge and oral histories
4. Cross-reference multiple sources for the same events
5. Note any gaps or uncertainties in the historical record

IMPORTANT CONSIDERATIONS:
- Distinguish between documented events and unverified reports
- Note if sources contradict each other
- Consider both recent well-documented events and older less certain records
- Include context about the geological setting if available

OUTPUT STRUCTURE:
Provide your research findings as a structured report with:

1. EXECUTIVE SUMMARY: Brief overview of findings

2. DOCUMENTED EVENTS: List of all events found, with full details for each

3. SOURCES QUALITY ASSESSMENT: Your evaluation of the overall source quality

4. HISTORICAL PATTERNS: Any patterns or insights about recurrence

5. KNOWLEDGE GAPS: What information is missing or uncertain

Format your output as valid JSON with this structure:
{{
  "summary": "executive summary text",
  "total_events_found": number,
  "time_span_covered": "description of time range",
  "sources_quality": "overall assessment",
  "events": [
    {{
      "event_narrative": "detailed description",
      "place_name": "specific location",
      "event_date": "YYYY-MM-DD or YYYY or approximate description",
      "event_type": "landslide|debris_flow|rockfall|lava_flow",
      "date_uncertainty_years": number,
      "source_type": "scientific|official|historical|newspaper|indigenous|oral_tradition|eyewitness",
      "source_title": "title of source",
      "source_author": "author if known",
      "source_url": "URL if available",
      "casualties": "description if known",
      "impacts": "description of damage/impacts",
      "credibility_assessment": 0.0 to 1.0,
      "notes": "additional relevant information"
    }}
  ],
  "patterns": "description of any patterns found",
  "knowledge_gaps": "description of missing information",
  "indigenous_knowledge_found": true/false,
  "research_confidence": 0.0 to 1.0
}}

Begin your research now. Be thorough and systematic."""

        return prompt
    
    async def conduct_research(self, query: ResearchQuery) -> ResearchResult:
        """
        Conduct deep research about a location.
        
        Args:
            query: ResearchQuery with location and parameters
            
        Returns:
            ResearchResult with all findings
        """
        
        # Create research prompt
        prompt = self.create_research_prompt(query)
        
        try:
            # Call OpenAI for research (using GPT-4 for better reasoning)
            print(f"🔍 Researching mass movement history for: {query.location}")
            print(f"   Time range: {query.time_range_years} years")
            print(f"   Hazard focus: {query.hazard_type.value if query.hazard_type else 'All types'}")
            
            response = self.client.chat.completions.create(
                model=self.research_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert geoscientist and historian with deep knowledge of mass movements, volcanic hazards, and historical research methods."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Slightly higher for more creative research
                max_tokens=1000 # Should be 4000
            )
            
            # Extract and parse response
            content = response.choices[0].message.content.strip()
            
            # Clean up markdown code blocks if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            # Parse JSON
            research_data = json.loads(content)
            
            # Convert events to LocalLoreExtraction objects
            findings: List[LocalLoreExtraction] = []
            
            for event in research_data.get("events", []):
                # Parse date
                event_date = None
                years_ago = None
                date_str = event.get("event_date", "")
                
                try:
                    if len(date_str) == 10:  # YYYY-MM-DD
                        event_date = datetime.fromisoformat(date_str)
                    elif len(date_str) == 4:  # YYYY
                        event_date = datetime(int(date_str), 1, 1)
                    
                    if event_date:
                        years_ago = (datetime.now() - event_date).days / 365.25
                except:
                    pass
                
                # Create LocalLoreExtraction
                from models import SourceType
                
                source_type_str = event.get("source_type", "unknown")
                try:
                    source_type = SourceType(source_type_str)
                except:
                    source_type = SourceType.UNKNOWN
                
                lore = LocalLoreExtraction(
                    event_narrative=event.get("event_narrative", ""),
                    place_name=event.get("place_name", query.location),
                    event_date=event_date,
                    years_ago=years_ago,
                    event_date_uncertainty_years=event.get("date_uncertainty_years", 5),
                    source_type=source_type,
                    source_title=event.get("source_title"),
                    source_author=event.get("source_author"),
                    source_url=event.get("source_url"),
                    distance_to_report=0.0,  # Will need geocoding to calculate
                    confidence_band=event.get("credibility_assessment", 0.5)
                )
                
                # Calculate scores
                lore = self.extraction_agent.calculator.update_lore_with_scores(lore)
                findings.append(lore)
            
            # Create research result
            result = ResearchResult(
                location=query.location,
                hazard_type=query.hazard_type,
                findings=findings,
                summary=research_data.get("summary", ""),
                confidence=research_data.get("research_confidence", 0.7),
                sources_count=len(findings)
            )
            
            print(f"✅ Research complete! Found {len(findings)} events")
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse research results: {e}")
            print(f"Response: {content[:500]}...")
            raise ValueError(f"Failed to parse AI research results: {e}")
        
        except Exception as e:
            print(f"Research error: {e}")
            raise
    
    def conduct_research_sync(self, query: ResearchQuery) -> ResearchResult:
        """Synchronous version of conduct_research"""
        import asyncio
        return asyncio.run(self.conduct_research(query))
    
    async def multi_location_research(self, locations: List[str], 
                                     hazard_type: Optional[HazardType] = None) -> dict:
        """
        Conduct research on multiple locations in parallel.
        
        Args:
            locations: List of location names to research
            hazard_type: Optional hazard type to focus on
            
        Returns:
            Dictionary mapping location to ResearchResult
        """
        results = {}
        
        for location in locations:
            query = ResearchQuery(
                location=location,
                hazard_type=hazard_type,
                time_range_years=100,
                include_indigenous_knowledge=True,
                max_sources=10
            )
            
            try:
                result = await self.conduct_research(query)
                results[location] = result
            except Exception as e:
                print(f"Failed to research {location}: {e}")
                results[location] = None
        
        return results

# Example usage
if __name__ == "__main__":
    agent = DeepResearchAgent()
    
    # Test query
    query = ResearchQuery(
        location="Armero, Colombia",
        hazard_type=HazardType.DEBRIS_FLOW,
        time_range_years=200,
        include_indigenous_knowledge=True,
        max_sources=15
    )
    
    try:
        print("Starting deep research...\n")
        result = agent.conduct_research_sync(query)
        
        print(f"\n{'='*80}")
        print(f"RESEARCH RESULTS: {result.location}")
        print(f"{'='*80}\n")
        print(f"Summary: {result.summary}\n")
        print(f"Total events found: {result.sources_count}")
        print(f"Research confidence: {result.confidence:.2%}\n")
        
        print(f"\nTop Events (by L-score):")
        print(f"{'-'*80}")
        
        # Sort by L-score
        sorted_findings = sorted(result.findings, key=lambda x: x.l_score or 0, reverse=True)
        
        for i, lore in enumerate(sorted_findings[:5], 1):
            print(f"\n{i}. {lore.place_name} - {lore.event_date or 'Date unknown'}")
            print(f"   Narrative: {lore.event_narrative[:100]}...")
            print(f"   Source: {lore.source_type.value} - {lore.source_title or 'Untitled'}")
            print(f"   L-Score: {lore.l_score:.3f} (Recent: {lore.recent_score:.2f}, "
                  f"Credibility: {lore.credibility_score:.2f}, Spatial: {lore.spatial_score:.2f})")
    
    except Exception as e:
        print(f"Error: {e}")
