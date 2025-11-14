import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface RightSidebarProps {
  riskData?: {
    H_score?: number;
    L_score?: number;
    V_score?: number;
    R_score?: number;
    R_std?: number;
    R_p05?: number;         // 5th percentile confidence bound
    R_p95?: number;         // 95th percentile confidence bound
    H_sensitivity?: number; // Variance contribution from H
    L_sensitivity?: number; // Variance contribution from L
    V_sensitivity?: number; // Variance contribution from V
    risk_level?: string;
    gate_passed?: boolean;
  } | null;
}

export function RightSidebar({ riskData }: RightSidebarProps) {
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);

  // Risk scores for each component - use calculated values or default to 0
  const hScore = riskData?.H_score ?? 0;
  const lScore = riskData?.L_score ?? 0;
  const vScore = riskData?.V_score ?? 0;
  const overallRisk = riskData?.R_score ?? 0;
  const riskStd = riskData?.R_std ?? 0;

  // Function to determine risk color based on score (4-tier system)
  const getRiskColor = (score: number): string => {
    if (score >= 0.80) return '#D00000'; // Severe - Red
    if (score >= 0.60) return '#FF9F1C'; // High - Orange
    if (score >= 0.30) return '#FFD60A'; // Medium - Yellow
    return '#2D6A4F'; // Low - Green
  };

  // Determine which score is highest
  const maxScore = Math.max(hScore, lScore, vScore);
  const hBorderWidth = hScore === maxScore && hScore > 0 ? '8px' : '4px';
  const lBorderWidth = lScore === maxScore && lScore > 0 ? '8px' : '4px';
  const vBorderWidth = vScore === maxScore && vScore > 0 ? '8px' : '4px';

  return (
    <div className="w-64 bg-slate-900 text-white p-4 overflow-y-auto h-full">
      {/* Borromean Risk Assessment Header */}
      <h2 className="text-lg font-semibold bg-slate-800 px-4 py-2 rounded mb-6 text-center">
        Borromean Risk Assessment
      </h2>

      {/* Risk Assessment Section */}
      <div className="space-y-4">
        {/* Overall Risk Score */}
        <h3 className="font-semibold text-gray-200 text-center">
          Overall Risk Score
        </h3>

        {/* Circular Progress Indicator with centered number */}
        <div className="flex justify-center">
          <div
            className="relative w-28 h-28 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowFormulaDialog(true)}
            title="Click to see calculation formula"
          >
            <svg
              className="w-28 h-28 transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background circle - light grey for unfilled portion */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#D1D5DB"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle - only render if risk score > 0 to avoid artifact */}
              {overallRisk > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={getRiskColor(overallRisk)}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${overallRisk * 100 * 2.51} 251`}
                  strokeLinecap="round"
                />
              )}
            </svg>
            {/* Centered number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xl">{overallRisk.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Three Circle Diagram (Borromean Rings) - Overlapping Pattern */}
      <div className="flex justify-center" style={{ marginTop: '40px' }}>
          <div
            className="relative cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: '160px', height: '150px' }}
            onClick={() => setShowFormulaDialog(true)}
            title="Click to see calculation formula"
          >
            {/* Blue circle (H) - top position */}
            <div className="absolute" style={{ top: '0px', left: '48px' }}>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ borderWidth: hBorderWidth, borderColor: '#263ef7', backgroundColor: 'rgba(38, 62, 247, 0.1)' }}>
                <span className="text-white text-sm font-bold">{hScore.toFixed(2)}</span>
              </div>
              {/* H label outside circle - above with visible gap */}
              <div className="absolute" style={{ top: '-28px', left: '50%', transform: 'translateX(-50%)' }}>
                <span className="text-white text-base font-bold">H</span>
              </div>
            </div>

            {/* Teal circle (L) - bottom right, overlapping */}
            <div className="absolute" style={{ top: '40px', left: '72px' }}>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ borderWidth: lBorderWidth, borderColor: '#30a6ec', backgroundColor: 'rgba(48, 166, 236, 0.1)' }}>
                <span className="text-white text-sm font-bold">{lScore.toFixed(2)}</span>
              </div>
              {/* L label outside circle - right with minimal gap */}
              <div className="absolute" style={{ top: '50%', right: '-16px', transform: 'translateY(-50%)' }}>
                <span className="text-white text-base font-bold">L</span>
              </div>
            </div>

            {/* Purple circle (V) - bottom left, overlapping both */}
            <div className="absolute" style={{ top: '40px', left: '24px' }}>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ borderWidth: vBorderWidth, borderColor: '#9c2fee', backgroundColor: 'rgba(156, 47, 238, 0.1)' }}>
                <span className="text-white text-sm font-bold">{vScore.toFixed(2)}</span>
              </div>
              {/* V label outside circle - left with minimal gap */}
              <div className="absolute" style={{ top: '50%', left: '-18px', transform: 'translateY(-50%)' }}>
                <span className="text-white text-base font-bold">V</span>
              </div>
            </div>
          </div>
        </div>

      {/* Assessment Components Section */}
      <div className="space-y-4 border-t border-gray-700 pt-4 mt-6">
        <h3 className="font-semibold text-gray-200">
          Assessment Components
        </h3>

        <div className="space-y-4 text-xs text-gray-300">
          <div>
            <div className="font-semibold text-gray-200 mb-1">Event Drivers (H)</div>
            <p>A normalized score [0,1] representing the likelihood of a hazardous event based on physical conditions.</p>
          </div>

          <div>
            <div className="font-semibold text-gray-200 mb-1">Local Lore & History (L)</div>
            <p>A normalized score [0,1] representing the strength of place-based historical and anecdotal evidence for past events.</p>
          </div>

          <div>
            <div className="font-semibold text-gray-200 mb-1">Vulnerability (V)</div>
            <p>A normalized score [0,1] representing the potential consequences based on the exposure, fragility, and criticality of assets.</p>
          </div>
        </div>
      </div>

      {/* Risk Color Legend - 4-Tier System */}
      <div className="space-y-3 border-t border-gray-700 pt-4 mt-6">
        <h3 className="font-semibold text-gray-200">Risk Levels</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#D00000' }}></div>
            <span className="text-xs text-gray-300">Severe (0.80 - 1.00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#FF9F1C' }}></div>
            <span className="text-xs text-gray-300">High (0.60 - 0.80)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#FFD60A' }}></div>
            <span className="text-xs text-gray-300">Medium (0.30 - 0.60)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#2D6A4F' }}></div>
            <span className="text-xs text-gray-300">Low (0 - 0.30)</span>
          </div>
        </div>
      </div>

      {/* Mathematical Formula Dialog */}
      <Dialog open={showFormulaDialog} onOpenChange={setShowFormulaDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Risk Calculation Methodology
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Mathematical formulas and methodology used to calculate risk scores
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            {/* Borromean Risk Formula */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Borromean Risk Score Formula</h3>
              <div className="bg-black p-3 rounded font-mono text-green-400 mb-3 text-xs leading-relaxed">
                R = λ × (H × L × V) + (1 - λ) × (κ × min(H, L, V))
              </div>
              <p className="text-gray-300 mb-2">
                Where H, L, and V are normalized scores [0,1] representing:
              </p>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li><strong className="text-blue-400">H (Event Drivers)</strong> = {hScore.toFixed(2)}</li>
                <li><strong className="text-amber-700">L (Local Lore & History)</strong> = {lScore.toFixed(2)}</li>
                <li><strong className="text-purple-400">V (Vulnerability)</strong> = {vScore.toFixed(2)}</li>
              </ul>
              <p className="text-gray-400 mt-3 text-xs">
                Parameters: λ (mixing weight) = 0.7, κ (synergy strength) = 0.3
              </p>
            </div>

            {/* Threshold Gate */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Threshold Gate</h3>
              <p className="text-gray-300 mb-3">
                All three components must exceed minimum thresholds for risk to be non-zero:
              </p>
              <div className="bg-black p-3 rounded font-mono text-xs space-y-1">
                <div className={hScore > 0.35 ? "text-green-400" : "text-red-400"}>
                  H &gt; 0.35: {hScore.toFixed(3)} {hScore > 0.35 ? "✓ PASS" : "✗ FAIL"}
                </div>
                <div className={lScore > 0.25 ? "text-green-400" : "text-red-400"}>
                  L &gt; 0.25: {lScore.toFixed(3)} {lScore > 0.25 ? "✓ PASS" : "✗ FAIL"}
                </div>
                <div className={vScore > 0.30 ? "text-green-400" : "text-red-400"}>
                  V &gt; 0.30: {vScore.toFixed(3)} {vScore > 0.30 ? "✓ PASS" : "✗ FAIL"}
                </div>
                <div className="text-white mt-2 pt-2 border-t border-gray-700">
                  Gate Status: {(hScore > 0.35 && lScore > 0.25 && vScore > 0.30) ? "✓ PASSED" : "✗ FAILED (Risk = 0)"}
                </div>
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Current Calculation</h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="text-gray-300">Step 1: Calculate product term (noisy-AND)</div>
                <div className="text-gray-400 pl-4">
                  R₀ = H × L × V = {hScore.toFixed(3)} × {lScore.toFixed(3)} × {vScore.toFixed(3)} = {(hScore * lScore * vScore).toFixed(4)}
                </div>

                <div className="text-gray-300 mt-3">Step 2: Calculate synergy term (weakest link)</div>
                <div className="text-gray-400 pl-4">
                  S = κ × min(H, L, V) = 0.3 × {Math.min(hScore, lScore, vScore).toFixed(3)} = {(0.3 * Math.min(hScore, lScore, vScore)).toFixed(4)}
                </div>

                <div className="text-gray-300 mt-3">Step 3: Mix product and synergy terms</div>
                <div className="text-gray-400 pl-4">
                  R = λ × R₀ + (1 - λ) × S<br/>
                  R = 0.7 × {(hScore * lScore * vScore).toFixed(4)} + 0.3 × {(0.3 * Math.min(hScore, lScore, vScore)).toFixed(4)}<br/>
                  R = {(0.7 * hScore * lScore * vScore).toFixed(4)} + {(0.3 * 0.3 * Math.min(hScore, lScore, vScore)).toFixed(4)} = <strong style={{ color: getRiskColor(overallRisk) }}>{overallRisk.toFixed(4)}</strong>
                </div>

                {!(hScore > 0.35 && lScore > 0.25 && vScore > 0.30) && (
                  <div className="text-red-400 mt-3 p-2 bg-red-900/20 rounded">
                    ⚠ Threshold gate failed - Risk set to 0.00
                  </div>
                )}
              </div>
            </div>

            {/* Component Calculation Methods */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Component Calculation Methods</h3>
              <div className="space-y-3 text-gray-300 text-xs">
                <div>
                  <strong className="text-blue-400">Event Drivers (H):</strong> Weighted combination of slope (40%), curvature (15%), lithology erodibility (15%), and rainfall exceedance (30%). Uses logistic transformations for slope and curvature to model physical hazard thresholds.
                </div>
                <div>
                  <strong className="text-amber-700">Local Lore & History (L):</strong> Direct aggregated score from fuzzy logic pipeline integrating historical records, oral histories, and anecdotal evidence with temporal decay and confidence weighting.
                </div>
                <div>
                  <strong className="text-purple-400">Vulnerability (V):</strong> Weighted combination of exposure (70%) and fragility (30%), representing assets at risk and their susceptibility to damage from hazard events.
                </div>
              </div>
            </div>

            {/* Uncertainty Quantification */}
            {riskData && riskStd > 0 && (
              <div className="bg-slate-900 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-white">Uncertainty Analysis</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Standard Deviation:</span>
                    <span className="font-mono">±{riskStd.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>90% Confidence Interval:</span>
                    <span className="font-mono">[{riskData.R_p05?.toFixed(4)}, {riskData.R_p95?.toFixed(4)}]</span>
                  </div>
                  <div className="mt-3 text-gray-400">
                    <strong className="text-white">Sensitivity Analysis:</strong>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>H contribution to variance:</span>
                        <span className="font-mono">{((riskData.H_sensitivity ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>L contribution to variance:</span>
                        <span className="font-mono">{((riskData.L_sensitivity ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>V contribution to variance:</span>
                        <span className="font-mono">{((riskData.V_sensitivity ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-400 mt-2 italic">
                    Based on 300 Monte Carlo samples with input-specific uncertainties (σ_H=0.05, σ_L=0.08, σ_V=0.04)
                  </p>
                </div>
              </div>
            )}

            {/* Methodology Notes */}
            <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-2">Borromean Ring Methodology</h4>
              <ul className="list-disc pl-6 text-gray-300 space-y-1 text-xs">
                <li><strong>Product term (H × L × V):</strong> Implements fuzzy AND logic - high risk requires all three factors to be elevated</li>
                <li><strong>Synergy term (min):</strong> Models "weakest link" behavior - the lowest component limits overall risk</li>
                <li><strong>Threshold gate:</strong> Ensures physical meaningfulness - removes spurious low-level noise</li>
                <li><strong>Mixing parameter (λ=0.7):</strong> Balances multiplicative (70%) and synergistic (30%) risk interactions</li>
                <li>Named after Borromean rings topology where all three rings must be present for the structure to hold</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
