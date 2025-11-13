"""
Borromean Risk Calculator Module
Implements risk calculation from borromean_risk_starter.ipynb using real data
"""

import numpy as np
from typing import Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class RiskConfig:
    """Configuration for Borromean risk calculation"""
    hazard_type: str = "landslide"
    tau_H: float = 0.35  # H threshold
    tau_L: float = 0.25  # L threshold
    tau_V: float = 0.30  # V threshold
    lambda_mix: float = 0.7  # Mixing weight
    kappa_synergy: float = 0.3  # Synergy strength
    alpha: float = 1.0  # H exponent
    beta: float = 1.0  # L exponent
    gamma: float = 1.0  # V exponent


def logistic(x: float, k: float = 1.0, x0: float = 0.0) -> float:
    """
    Logistic transformation function

    Args:
        x: Input value
        k: Steepness parameter
        x0: Midpoint parameter

    Returns:
        Transformed value in [0, 1]
    """
    return 1.0 / (1.0 + np.exp(-k * (x - x0)))


def compute_H(
    slope_deg: float,
    curvature: float,
    lith_erod: float,
    rain_exceed: float,
    hazard_type: str = "landslide"
) -> float:
    """
    Compute H factor (Event Drivers) from terrain and trigger data

    Args:
        slope_deg: Slope in degrees (0-60)
        curvature: Terrain curvature in 1/m (-2 to +2)
        lith_erod: Lithology erodibility (0-1, from class 1-5)
        rain_exceed: Rainfall exceedance probability (0-1)
        hazard_type: Type of hazard event

    Returns:
        H score in [0, 1]
    """
    # Transform slope: steeper slopes = higher risk
    slope_term = logistic(slope_deg, k=0.15, x0=20)

    # Transform curvature: concave (negative) = higher risk
    curv_term = logistic(-curvature, k=0.8, x0=0)

    # Lithology erodibility: already [0,1]
    lith_term = lith_erod

    # Rainfall trigger: already [0,1]
    rain_term = rain_exceed

    # Weighted combination
    # Weights: slope=0.4, curvature=0.15, lithology=0.15, rainfall=0.3
    weights = np.array([0.4, 0.15, 0.15, 0.3])
    H = weights[0] * slope_term + weights[1] * curv_term + weights[2] * lith_term + weights[3] * rain_term

    return float(np.clip(H, 0, 1))


def compute_L(lore_signal: float) -> float:
    """
    Compute L factor (Local Lore & History)

    Args:
        lore_signal: Aggregated lore score from fuzzy logic pipeline (0-1)

    Returns:
        L score in [0, 1]
    """
    return float(np.clip(lore_signal, 0, 1))


def compute_V(
    exposure: float,
    fragility: float,
    criticality_weight: float = 0.3
) -> float:
    """
    Compute V factor (Vulnerability) from exposure and fragility

    Args:
        exposure: Exposure score (0-1) - assets at risk
        fragility: Fragility score (0-1) - susceptibility to damage
        criticality_weight: Weight for criticality (default 0.3)

    Returns:
        V score in [0, 1]
    """
    # Weighted combination: exposure=0.7, fragility=0.3
    V = 0.7 * exposure + 0.3 * fragility

    return float(np.clip(V, 0, 1))


def borromean_score(
    H: float,
    L: float,
    V: float,
    config: RiskConfig
) -> Tuple[float, bool]:
    """
    Compute Borromean risk score with noisy-AND gate

    Args:
        H: Event driver score (0-1)
        L: Local lore score (0-1)
        V: Vulnerability score (0-1)
        config: Risk configuration with thresholds and weights

    Returns:
        Tuple of (risk_score, gate_passed)
        - risk_score: Final risk value in [0, 1]
        - gate_passed: Boolean indicating if all thresholds were met
    """
    # Threshold gate: require all rings above their tau_* thresholds
    gate = (H > config.tau_H) and (L > config.tau_L) and (V > config.tau_V)

    # Product t-norm (noisy-AND style)
    R0 = (H ** config.alpha) * (L ** config.beta) * (V ** config.gamma)

    # Synergy: weakest ring limits the triad
    S = config.kappa_synergy * min(H, L, V)

    # Mix product and synergy terms
    R = config.lambda_mix * R0 + (1 - config.lambda_mix) * S

    # Apply gate: if any ring is below threshold, risk is 0
    if not gate:
        R = 0.0

    return float(np.clip(R, 0, 1)), bool(gate)


def mc_uncertainty(
    H: float,
    L: float,
    V: float,
    config: RiskConfig,
    n_samples: int = 60,
    sigma: float = 0.04
) -> Tuple[float, float]:
    """
    Estimate uncertainty using Monte Carlo sampling

    Args:
        H: Event driver score (0-1)
        L: Local lore score (0-1)
        V: Vulnerability score (0-1)
        config: Risk configuration
        n_samples: Number of Monte Carlo samples
        sigma: Standard deviation of noise to inject

    Returns:
        Tuple of (R_mean, R_std)
        - R_mean: Mean risk score
        - R_std: Standard deviation of risk score
    """
    samples = []

    for _ in range(n_samples):
        # Add Gaussian noise to each factor
        H_sample = np.clip(H + np.random.normal(0, sigma), 0, 1)
        L_sample = np.clip(L + np.random.normal(0, sigma), 0, 1)
        V_sample = np.clip(V + np.random.normal(0, sigma), 0, 1)

        # Compute risk for this sample
        R_sample, _ = borromean_score(H_sample, L_sample, V_sample, config)
        samples.append(R_sample)

    R_mean = float(np.mean(samples))
    R_std = float(np.std(samples))

    return R_mean, R_std


def calculate_risk(
    # H factor inputs
    slope_deg: float,
    curvature: float,
    lith_class: int,  # 1-5 scale
    rain_exceed: float,

    # L factor inputs
    lore_signal: float,

    # V factor inputs
    exposure: float,
    fragility: float,

    # Configuration
    hazard_type: str = "landslide",
    config: Optional[RiskConfig] = None,
    compute_uncertainty: bool = True
) -> Dict:
    """
    Main function to calculate Borromean risk from input data

    Args:
        slope_deg: Slope in degrees
        curvature: Terrain curvature
        lith_class: Lithology class (1=hardest, 5=most erodible)
        rain_exceed: Rainfall exceedance probability
        lore_signal: Aggregated lore score
        exposure: Exposure score
        fragility: Fragility score
        hazard_type: Type of hazard
        config: Optional risk configuration (uses defaults if None)
        compute_uncertainty: Whether to compute uncertainty estimates

    Returns:
        Dictionary with risk calculation results
    """
    if config is None:
        config = RiskConfig(hazard_type=hazard_type)

    # Convert lithology class (1-5) to erodibility (0-1)
    lith_erod = (lith_class - 1) / 4.0

    # Compute individual factors
    H = compute_H(slope_deg, curvature, lith_erod, rain_exceed, hazard_type)
    L = compute_L(lore_signal)
    V = compute_V(exposure, fragility)

    # Compute risk score
    R, gate_passed = borromean_score(H, L, V, config)

    # Compute uncertainty if requested
    R_std = 0.0
    if compute_uncertainty:
        R_mean, R_std = mc_uncertainty(H, L, V, config, n_samples=60, sigma=0.04)
        # Use uncertainty-adjusted mean
        R = R_mean

    # Determine risk level
    if R >= 0.7:
        risk_level = "very-high"
    elif R >= 0.5:
        risk_level = "high"
    elif R >= 0.3:
        risk_level = "medium"
    elif R >= 0.1:
        risk_level = "low"
    else:
        risk_level = "very-low"

    return {
        "H_score": round(H, 4),
        "L_score": round(L, 4),
        "V_score": round(V, 4),
        "R_score": round(R, 4),
        "R_std": round(R_std, 4),
        "risk_level": risk_level,
        "gate_passed": gate_passed,
        "config": {
            "hazard_type": config.hazard_type,
            "tau_H": config.tau_H,
            "tau_L": config.tau_L,
            "tau_V": config.tau_V,
            "lambda_mix": config.lambda_mix,
            "kappa_synergy": config.kappa_synergy
        }
    }


# Example usage
if __name__ == "__main__":
    # Test with example data
    result = calculate_risk(
        slope_deg=35.0,
        curvature=-0.5,
        lith_class=3,
        rain_exceed=0.8,
        lore_signal=0.6,
        exposure=0.75,
        fragility=0.60,
        hazard_type="landslide"
    )

    print("Risk Calculation Results:")
    print(f"  H (Event Drivers): {result['H_score']}")
    print(f"  L (Local Lore): {result['L_score']}")
    print(f"  V (Vulnerability): {result['V_score']}")
    print(f"  R (Risk): {result['R_score']} ± {result['R_std']}")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Gate Passed: {result['gate_passed']}")
