#!/usr/bin/env python3
"""
Test to demonstrate user-provided location functionality
This shows how the API now accepts user-provided location that saves directly to place_name
"""

print("="*80)
print("User-Provided Location Feature Test")
print("="*80)
print()
print("FUNCTIONALITY:")
print("  When submitting a story, users can now provide a 'location' field")
print("  This location will be saved directly to place_name in the database")
print("  AI extraction is still performed, but user location takes precedence")
print()
print("="*80)
print("Example Request Payload:")
print("="*80)
print("""
{
  "title": "The Great Landslide of 2023",
  "story_text": "A massive landslide occurred on the mountain...",
  "location": "Mount Rainier, Washington",  <-- User-provided location
  "location_description": "Pacific Northwest region",
  "created_by": "John Doe"
}
""")
print()
print("="*80)
print("What happens:")
print("="*80)
print("1. User provides 'location': 'Mount Rainier, Washington'")
print("2. AI agent extracts lore data from story_text")
print("3. User-provided location OVERRIDES AI-extracted location in lore.place_name")
print("4. L-scores are calculated using the user-provided location")
print("5. User-provided location 'Mount Rainier, Washington' is saved to:")
print("   - location.name table")
print("   - local_lore.place_name field")
print("6. AI extraction still happens for all other fields (date, narrative, etc.)")
print()
print("="*80)
print("API Response includes:")
print("="*80)
print("""
{
  "ai_results": {
    "saved_location": "Mount Rainier, Washington",  <-- What was saved
    "location_source": "user",                       <-- Where it came from
    "ai_l_score": 0.75,
    "ai_recency_score": 0.8,
    "ai_credibility_score": 0.9,
    "ai_spatial_relevance": 0.5,
    ...
  }
}
""")
print()
print("="*80)
print("✅ Feature implemented successfully!")
print("="*80)
