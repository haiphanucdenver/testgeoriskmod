#!/usr/bin/env python3
"""
Quick test to verify LoreScoreCalculator is working correctly
"""
from datetime import datetime
from ai_agents.lore_calculator import LoreScoreCalculator
from ai_agents.models import LocalLoreExtraction, SourceType

def test_lore_score_calculation():
    """Test that scores are calculated correctly"""
    calculator = LoreScoreCalculator()

    # Create test lore data
    test_lore = LocalLoreExtraction(
        event_narrative="Major landslide destroyed village after heavy rains",
        place_name="Test Location",
        event_date=datetime(2000, 1, 1),
        years_ago=25,
        event_date_uncertainty_years=1,
        source_type=SourceType.HISTORICAL,
        source_title="Historical Records",
        source_author="Test Author",
        source_url="https://example.com/test",
        distance_to_report=5.0  # 5 km distance
    )

    # Calculate scores
    updated_lore = calculator.update_lore_with_scores(test_lore)

    # Verify scores are calculated
    print("="*80)
    print("Lore Score Calculation Test")
    print("="*80)
    print(f"Event: {updated_lore.event_narrative[:50]}...")
    print(f"Place: {updated_lore.place_name}")
    print(f"Years ago: {updated_lore.years_ago}")
    print(f"Source type: {updated_lore.source_type.value}")
    print(f"Distance: {updated_lore.distance_to_report} km")
    print()
    print("CALCULATED SCORES:")
    print(f"  L1 (Recency Score):     {updated_lore.recent_score:.4f}")
    print(f"  L2 (Credibility Score): {updated_lore.credibility_score:.4f}")
    print(f"  L3 (Spatial Score):     {updated_lore.spatial_score:.4f}")
    print(f"  L (Overall Score):      {updated_lore.l_score:.4f}")
    print("="*80)

    # Verify scores are within valid range
    assert 0 <= updated_lore.recent_score <= 1, "Recency score out of range"
    assert 0 <= updated_lore.credibility_score <= 1, "Credibility score out of range"
    assert 0 <= updated_lore.spatial_score <= 1, "Spatial score out of range"
    assert 0 <= updated_lore.l_score <= 1, "L score out of range"

    # Verify scores are not None
    assert updated_lore.recent_score is not None, "Recency score is None"
    assert updated_lore.credibility_score is not None, "Credibility score is None"
    assert updated_lore.spatial_score is not None, "Spatial score is None"
    assert updated_lore.l_score is not None, "L score is None"

    print("✅ All tests passed!")
    print()
    return True

if __name__ == "__main__":
    test_lore_score_calculation()
