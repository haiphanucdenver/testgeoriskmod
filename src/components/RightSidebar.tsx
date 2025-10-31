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
  return (
    <div className="w-64 bg-slate-900 text-white p-4 flex flex-col h-full">
      {/* Risk Assessment Header */}
      <div className="bg-slate-800 px-4 py-2 rounded">
        <h2 className="font-semibold">
          Borromean Risk Assessment
        </h2>
      </div>

      {/* Overall Risk Score - Centered */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <h3 className="font-semibold text-gray-200 text-center">
          Overall Risk Score
        </h3>

        {/* Circular Progress Indicator with centered number */}
        <div className="flex justify-center">
          <div 
            className="relative w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowFormulaDialog(true)}
            title="Click to see calculation formula"
          >
            <svg
              className="w-24 h-24 transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#374151"
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
              <span className="text-white font-bold text-lg">0.68</span>
            </div>
          </div>
        </div>

        {/* Three Circle Diagram with individual numbers and labels */}
        <div className="flex justify-center">
          <div 
            className="relative w-28 h-26 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowFormulaDialog(true)}
            title="Click to see calculation formula"
          >
            {/* Blue circle - top left, H label at top-left corner */}
            <div className="absolute top-0 left-2">
              <div className="relative w-12 h-12 border-4 border-blue-500 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">0.72</span>
                {/* H label at top-left corner */}
                <div className="absolute -top-2 -left-2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">H</span>
                </div>
              </div>
            </div>
            
            {/* Green circle - top right, L label at top-right corner */}
            <div className="absolute top-0 right-2">
              <div className="relative w-12 h-12 border-4 border-green-500 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">0.65</span>
                {/* L label at top-right corner */}
                <div className="absolute -top-2 -right-2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">L</span>
                </div>
              </div>
            </div>
            
            {/* Orange circle - bottom center, V label at bottom corner */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="relative w-12 h-12 border-4 border-orange-500 rounded-full bg-orange-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">0.67</span>
                {/* V label at bottom corner */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">V</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-300"></div>
      </div>

      {/* Assessment Components Section */}
      <div className="space-y-4 border-t border-gray-700 pt-4">
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
                <li><strong className="text-blue-400">H (Event Drivers)</strong> = 0.72</li>
                <li><strong className="text-green-400">L (Local Lore & History)</strong> = 0.65</li>
                <li><strong className="text-orange-400">V (Vulnerability)</strong> = 0.67</li>
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
                  <strong className="text-green-400">Local Lore & History (L):</strong> Integrates historical records, oral histories, and community knowledge using temporal weighting and confidence scoring.
                </div>
                <div>
                  <strong className="text-orange-400">Vulnerability (V):</strong> Assesses population density, infrastructure fragility, and economic exposure using multi-criteria analysis and asset valuation.
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