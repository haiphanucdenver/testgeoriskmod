import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { ChevronDown, MapPin, Plus, Minus } from "lucide-react";
import { useState } from "react";

export function LeftSidebar() {
  const [rainfallValue, setRainfallValue] = useState([50]);
  const [temperatureValue, setTemperatureValue] = useState(0);

  return (
    <div className="w-64 bg-slate-900 text-white p-4 space-y-6 overflow-y-auto h-full">
      {/* Controls & Scenarios Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold bg-slate-800 px-4 py-2 rounded">
          Controls & Scenarios
        </h2>

        {/* Layers */}
        <h3 className="font-semibold text-gray-200">
          Layers
        </h3>

        {/* Risk Overlay */}
        <div className="flex items-center justify-between pl-6">
          <span className="text-sm">Risk Overlay</span>
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
        </div>

        {/* Infrastructure */}
        <div className="pl-6 text-gray-300 text-sm">Infrastructure</div>

        {/* Population Density */}
        <div className="pl-6 text-gray-300 text-sm">
          Population Density
        </div>
      </div>

      {/* Scenario Modeling */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-200">
          Scenario Modeling
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Rainfall in mm
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {rainfallValue[0]}mm
            </span>
          </div>
          <div className="relative">
            <Slider
              value={rainfallValue}
              onValueChange={setRainfallValue}
              max={200}
              min={0}
              step={1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>200</span>
          </div>
        </div>

        {/* Adjust Temperature */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-sm text-gray-300">
            Adjust Temperature
          </label>
          <div className="flex items-center">
            <Button
              size="sm"
              variant="outline"
              className="h-5 w-5 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600 rounded-r-none"
              onClick={() => setTemperatureValue(prev => prev - 1)}
            >
              <Minus className="h-2 w-2" />
            </Button>
            <span className="text-sm font-medium text-white px-2 py-0.5 min-w-[2.5rem] text-center">
              {temperatureValue > 0 ? `+${temperatureValue}` : temperatureValue}°C
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 w-5 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600 rounded-l-none"
              onClick={() => setTemperatureValue(prev => prev + 1)}
            >
              <Plus className="h-2 w-2" />
            </Button>
          </div>
        </div>

        {/* Add Windstorms */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-sm text-gray-300">
            Add Windstorms
          </label>
          <Checkbox id="windstorms" />
        </div>

        {/* Add Retraining Wall */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-sm text-gray-300">
            Add Retraining Wall
          </label>
          <Checkbox id="retraining-wall" />
        </div>
      </div>

      {/* Bottom Button */}
      <div className="pt-8">
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Recalculate Risk
        </Button>
        
        {/* Location Information */}
        <div className="mt-4 p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-200">Current Location</span>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Address: Mountain Ridge, British Columbia, Canada</div>
            <div>Coordinates: 45°18'N, 122°42'W</div>
            <div>Elevation: 1,250m</div>
            <div>Area: 15.2 km²</div>
          </div>
        </div>
      </div>
    </div>
  );
}