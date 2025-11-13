import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function RightSidebar() {
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);

  // Risk scores for each component
  const hScore = 0.72;
  const lScore = 0.65;
  const vScore = 0.67;

  // Determine which score is highest
  const maxScore = Math.max(hScore, lScore, vScore);
  const hBorderWidth = hScore === maxScore ? '8px' : '4px';
  const lBorderWidth = lScore === maxScore ? '8px' : '4px';
  const vBorderWidth = vScore === maxScore ? '8px' : '4px';

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
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#EF4444"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${68 * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            {/* Centered number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xl">0.68</span>
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
                <span className="text-white text-sm font-bold">{hScore}</span>
              </div>
              {/* H label outside circle - above with visible gap */}
              <div className="absolute" style={{ top: '-28px', left: '50%', transform: 'translateX(-50%)' }}>
                <span className="text-white text-base font-bold">H</span>
              </div>
            </div>

            {/* Teal circle (L) - bottom right, overlapping */}
            <div className="absolute" style={{ top: '40px', left: '72px' }}>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ borderWidth: lBorderWidth, borderColor: '#30a6ec', backgroundColor: 'rgba(48, 166, 236, 0.1)' }}>
                <span className="text-white text-sm font-bold">{lScore}</span>
              </div>
              {/* L label outside circle - right with minimal gap */}
              <div className="absolute" style={{ top: '50%', right: '-16px', transform: 'translateY(-50%)' }}>
                <span className="text-white text-base font-bold">L</span>
              </div>
            </div>

            {/* Purple circle (V) - bottom left, overlapping both */}
            <div className="absolute" style={{ top: '40px', left: '24px' }}>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ borderWidth: vBorderWidth, borderColor: '#9c2fee', backgroundColor: 'rgba(156, 47, 238, 0.1)' }}>
                <span className="text-white text-sm font-bold">{vScore}</span>
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

      {/* Risk Color Legend */}
      <div className="space-y-3 border-t border-gray-700 pt-4 mt-6">
        <h3 className="font-semibold text-gray-200">Risk Levels</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#ef4444' }}></div>
            <span className="text-xs text-gray-300">High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#f59e0b' }}></div>
            <span className="text-xs text-gray-300">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#22c55e' }}></div>
            <span className="text-xs text-gray-300">Low Risk</span>
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
            {/* Overall Risk Formula */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Overall Risk Score Formula</h3>
              <div className="bg-black p-3 rounded font-mono text-green-400 mb-3">
                Risk = √(H² + L² + V²) / √3
              </div>
              <p className="text-gray-300 mb-2">
                Where H, L, and V are normalized scores between 0 and 1, representing:
              </p>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li><strong className="text-blue-400">H (Event Drivers)</strong> = {hScore}</li>
                <li><strong className="text-amber-700">L (Local Lore & History)</strong> = {lScore}</li>
                <li><strong className="text-purple-400">V (Vulnerability)</strong> = {vScore}</li>
              </ul>
            </div>

            {/* Calculation Steps */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Current Calculation</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="text-gray-300">Step 1: Square each component</div>
                <div className="text-gray-400 pl-4">
                  H² = 0.72² = 0.518<br/>
                  L² = 0.65² = 0.423<br/>
                  V² = 0.67² = 0.449
                </div>

                <div className="text-gray-300 mt-3">Step 2: Sum the squares</div>
                <div className="text-gray-400 pl-4">
                  H² + L² + V² = 0.518 + 0.423 + 0.449 = 1.390
                </div>

                <div className="text-gray-300 mt-3">Step 3: Take square root and normalize</div>
                <div className="text-gray-400 pl-4">
                  √(1.390) / √3 = 1.179 / 1.732 = <strong className="text-red-400">0.68</strong>
                </div>
              </div>
            </div>

            {/* Component Explanations */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-white">Component Calculation Methods</h3>
              <div className="space-y-3 text-gray-300">
                <div>
                  <strong className="text-blue-400">Event Drivers (H):</strong> Combines topographical data, rainfall intensity, seismic activity, and regional hazard patterns using weighted averaging and normalization.
                </div>
                <div>
                  <strong className="text-amber-700">Local Lore & History (L):</strong> Integrates historical records, oral histories, and community knowledge using temporal weighting and confidence scoring.
                </div>
                <div>
                  <strong className="text-purple-400">Vulnerability (V):</strong> Assesses population density, infrastructure fragility, and economic exposure using multi-criteria analysis and asset valuation.
                </div>
              </div>
            </div>

            {/* Methodology Notes */}
            <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-2">Methodology Notes</h4>
              <ul className="list-disc pl-6 text-gray-300 space-y-1 text-xs">
                <li>The Euclidean distance formula ensures balanced consideration of all three components</li>
                <li>Normalization by √3 keeps the final score within [0,1] range</li>
                <li>This approach prevents any single component from dominating the overall risk assessment</li>
                <li>All input data is validated and quality-checked before inclusion in calculations</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
