import math
from datetime import datetime
from typing import Optional
from models import LocalLoreExtraction, LoreScore, SourceType
from config import Config

class LoreScoreCalculator:
    """
    Implements the Local Lore scoring formula:
    L = w1*L1 + w2*L2 + w3*L3
    where:
    - L1 = Recent score (how recent the event was)
    - L2 = Credibility score (source reliability)
    - L3 = Spatial score (distance relevance)
    - Default weights: w1=0.35, w2=0.40, w3=0.25
    """
    
    def __init__(self, weights: Optional[dict] = None):
        self.weights = weights or Config.LORE_WEIGHTS
        
    # def calculate_recent_score(self, years_ago: float, uncertainty_years: float = 0) -> float:
    #     """
    #     Calculate recency score: more recent events get higher scores.
    #     Uses exponential decay: L1 = exp(-years_ago / decay_rate)
        
    #     Args:
    #         years_ago: Number of years since the event
    #         uncertainty_years: Uncertainty in the dating (reduces score)
        
    #     Returns:
    #         Score between 0 and 1
    #     """
    #     if years_ago is None or years_ago < 0:
    #         return 0.0
        
    #     # Decay rate: events from 50 years ago get ~0.3 score
    #     decay_rate = 50.0
        
    #     # Base recency score with exponential decay
    #     base_score = math.exp(-years_ago / decay_rate)
        
    #     # Penalize for uncertainty (more uncertainty = lower score)
    #     if uncertainty_years > 0:
    #         uncertainty_penalty = 1.0 / (1.0 + uncertainty_years / 10.0)
    #         base_score *= uncertainty_penalty
        
    #     return min(max(base_score, 0.0), 1.0)
    
    def calculate_recent_score(self, years_ago: float, 
                          uncertainty_years: float = 0,
                          source_type: Optional[SourceType] = None) -> float:
        
        # Mininum score for very old events
        min_recent_score = 0.2

        # Standard decay rate: 50 years ago
        decay_rate = 50.0

        if years_ago is None or years_ago < 0:
            return min_recent_score
        
        # Base recency score with exponential decay
        base_score = math.exp(-years_ago / decay_rate)
        

        # ========== CULTURAL MEMORY HANDLING (NEW) ==========
        # Oral traditions and indigenous knowledge preserve multi-generational
        # patterns that remain relevant even when ancient
        if (hasattr(Config, 'CULTURAL_MEMORY_ENABLED') and 
            Config.CULTURAL_MEMORY_ENABLED and
            source_type in Config.CULTURAL_SOURCES):
            
            # Cultural memory formula:
            # baseline (floor) + boost * exponential decay
            cultural_memory = (
                Config.CULTURAL_MEMORY_BASELINE + 
                Config.CULTURAL_MEMORY_BOOST * 
                math.exp(-years_ago / Config.CULTURAL_MEMORY_DECAY)
            )
            # Use whichever is higher: standard decay or cultural memory
            base_score = max(base_score, cultural_memory)
        
        # Penalize for uncertainty (more uncertainty = lower score)
        if uncertainty_years > 0:
            uncertainty_penalty = 1.0 / (1.0 + uncertainty_years / 10.0)
            base_score *= uncertainty_penalty
        
        # Apply any configured minimum floor
        final_score = max(base_score, min_recent_score)
        
        return min(max(final_score, 0.1), 1.0)




    def calculate_credibility_score(self, source_type: SourceType, 
                                   has_author: bool = False,
                                   has_url: bool = False,
                                   num_corroborating_sources: int = 0) -> float:
        """
        Calculate credibility score based on source type and verification.
            source_type: Type of source (scientific, historical, oral_tradition, etc.)
            has_author: Whether an author is identified
            has_url: Whether a URL/reference exists
            num_corroborating_sources: Number of other sources that mention same event
        """
        # Base credibility from source type
        base_credibility = Config.SOURCE_CREDIBILITY.get(source_type.value, 0.3)
        
        # Bonuses for verification elements
        verification_bonus = 0.0
        if has_author:
            verification_bonus += 0.05
        if has_url:
            verification_bonus += 0.05
        
        # Bonus for multiple corroborating sources (diminishing returns)
        if num_corroborating_sources > 0:
            corroboration_bonus = 0.1 * (1 - math.exp(-num_corroborating_sources / 3.0))
            verification_bonus += corroboration_bonus
        
        final_score = base_credibility + verification_bonus
        return min(max(final_score, 0.0), 1.0)




    def calculate_spatial_score(self, distance_km: Optional[float]) -> float:
        """
        Calculate spatial relevance score: closer events are more relevant.
            distance_km: Distance from event to assessment location (km)
            max_relevant_distance: Distance at which score approaches 0

        """
        if distance_km is None or distance_km < 0:
            return 0.5  # Default if distance unknown
        
        if distance_km == 0:
            return 1.0  # Perfect match at same location
        
        # # Gaussian-like decay: L3 = exp(-(distance/scale)^2)
        # scale = max_relevant_distance / 2.0
        # spatial_score = math.exp(-((distance_km / scale) ** 2))
    
        # Sigma_d (decay scale) from the formula
        # 500 meters = 0.5 kilometers
        sigma_d = 0.5 
        spatial_score = math.exp(-distance_km / sigma_d)
        
        return min(max(spatial_score, 0.0), 1.0)
    


    def calculate_l_score(self, lore: LocalLoreExtraction) -> LoreScore:
        """
        The formula:
        L = w1*L1 + w2*L2 + w3*L3
        """
        # Calculate component scores
        recent_score = self.calculate_recent_score(
            lore.years_ago or 0, 
            lore.event_date_uncertainty_years or 0
        )
        
        credibility_score = self.calculate_credibility_score(
            lore.source_type,
            has_author=bool(lore.source_author),
            has_url=bool(lore.source_url),
            num_corroborating_sources=0  # Can be enhanced with database lookup
        )
        
        spatial_score = self.calculate_spatial_score(
            lore.distance_to_report
        )
        
        # Calculate weighted final score
        w1, w2, w3 = self.weights["recent"], self.weights["credibility"], self.weights["spatial"]
        l_score = w1 * recent_score + w2 * credibility_score + w3 * spatial_score
        
        return LoreScore(
            recent_score=recent_score,
            credibility_score=credibility_score,
            spatial_score=spatial_score,
            l_score=l_score,
            weights_used={"w1": w1, "w2": w2, "w3": w3}
        )
    
    def update_lore_with_scores(self, lore: LocalLoreExtraction) -> LocalLoreExtraction:
        """
        Calculate and update all scores in a LocalLoreExtraction object.
        
        Args:
            lore: LocalLoreExtraction object to update
        
        Returns:
            Updated LocalLoreExtraction object with scores filled in
        """
        scores = self.calculate_l_score(lore)
        
        lore.recent_score = scores.recent_score
        lore.credibility_score = scores.credibility_score
        lore.spatial_score = scores.spatial_score
        lore.l_score = scores.l_score
        
        return lore

# Example usage
if __name__ == "__main__":
    # Test the calculator
    calculator = LoreScoreCalculator()
    
    # Create test lore data
    test_lore = LocalLoreExtraction(
        event_narrative="Major landslide destroyed village",
        place_name="Armero, Colombia",
        event_date=datetime(1985, 11, 13),
        years_ago=39,
        event_date_uncertainty_years=0,
        source_type=SourceType.HISTORICAL,
        source_title="Armero Tragedy Records",
        source_author="Colombian Geological Survey",
        source_url="https://example.com/armero",
        distance_to_report=15.0
    )
    
    # Calculate scores
    updated_lore = calculator.update_lore_with_scores(test_lore)
    
    print(f"Recent Score (L1): {updated_lore.recent_score:.3f}")
    print(f"Credibility Score (L2): {updated_lore.credibility_score:.3f}")
    print(f"Spatial Score (L3): {updated_lore.spatial_score:.3f}")
    print(f"Final L Score: {updated_lore.l_score:.3f}")
