import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ChevronDown, MapPin, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";

interface LeftSidebarProps {
  layers: {
    riskOverlay: boolean;
    infrastructure: boolean;
    populationDensity: boolean;
  };
  onLayerToggle: (layer: 'riskOverlay' | 'infrastructure' | 'populationDensity') => void;
  mapLocation: {
    lat: number;
    lng: number;
    zoom: number;
  };
  areaSelectionMode: 'none' | 'centerPoint' | 'fourVertices';
  onAreaSelectionModeChange: (mode: 'none' | 'centerPoint' | 'fourVertices') => void;
  selectedVertices?: Array<{ lat: number; lng: number }>;
}

export function LeftSidebar({ layers, onLayerToggle, mapLocation, areaSelectionMode, onAreaSelectionModeChange, selectedVertices = [] }: LeftSidebarProps) {
  const [rainfallValue, setRainfallValue] = useState([0]);
  const [temperatureValue, setTemperatureValue] = useState([22]);
  const [windSpeedValue, setWindSpeedValue] = useState([0]);
  const [soilDepthValue, setSoilDepthValue] = useState([0]);
  const [seismicMagnitudeValue, setSeismicMagnitudeValue] = useState([0]);
  const [seismicFrequencyValue, setSeismicFrequencyValue] = useState([0]);
  const [locationName, setLocationName] = useState<string>("Loading...");
  const [elevation, setElevation] = useState<number | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Fetch location name using reverse geocoding
  useEffect(() => {
    const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;
    if (!MAPBOX_API_KEY || MAPBOX_API_KEY === 'YOUR_MAPBOX_API_KEY_HERE') {
      setLocationName("Mount Hood Area, Oregon, USA");
      return;
    }

    // Debounce the geocoding requests to avoid too many API calls
    const timeoutId = setTimeout(() => {
      setIsLoadingLocation(true);
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapLocation.lng},${mapLocation.lat}.json?access_token=${MAPBOX_API_KEY}&types=place,locality,neighborhood,address`;

      fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
          if (data.features && data.features.length > 0) {
            // Get the most relevant place name
            const feature = data.features[0];
            setLocationName(feature.place_name || "Unknown Location");
          } else {
            setLocationName("Unknown Location");
          }
          setIsLoadingLocation(false);
        })
        .catch(error => {
          console.error('Reverse geocoding error:', error);
          setLocationName("Location unavailable");
          setIsLoadingLocation(false);
        });
    }, 1000); // Wait 1 second after user stops moving the map

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]);

  // Fetch elevation data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${mapLocation.lat},${mapLocation.lng}`;

      fetch(elevationUrl)
        .then(response => response.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            setElevation(Math.round(data.results[0].elevation));
          } else {
            setElevation(null);
          }
        })
        .catch(error => {
          console.error('Elevation fetch error:', error);
          setElevation(null);
        });
    }, 1000); // Wait 1 second after user stops moving the map

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]);

  // Helper function to format coordinates
  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    const latDeg = Math.floor(Math.abs(lat));
    const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
    const lngDeg = Math.floor(Math.abs(lng));
    const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
    return `${latDeg}°${latMin}'${latDir}, ${lngDeg}°${lngMin}'${lngDir}`;
  };

  return (
    <div className="w-64 bg-slate-900 text-white p-4 space-y-6 overflow-y-auto h-full">
      {/* Location Information */}
      <div className="p-3 bg-slate-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">Current Location</span>
          {isLoadingLocation && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 ml-auto"></div>
          )}
        </div>
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-start gap-1">
            <span className="text-gray-500">Address:</span>
            <span className="flex-1">{locationName}</span>
          </div>
          <div>
            <span className="text-gray-500">Coordinates:</span> {formatCoordinates(mapLocation.lat, mapLocation.lng)}
          </div>
          <div>
            <span className="text-gray-500">Elevation:</span> {elevation !== null ? `${elevation}m` : 'Loading...'}
          </div>
          <div>
            <span className="text-gray-500">Zoom Level:</span> {mapLocation.zoom.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Area Selection Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold bg-slate-800 px-4 py-2 rounded text-center">
          Area Selection
        </h2>

        <RadioGroup
          value={areaSelectionMode}
          onValueChange={(value) => onAreaSelectionModeChange(value as 'none' | 'centerPoint' | 'fourVertices')}
          className="space-y-3"
        >
          <div
            className="flex items-center space-x-3 py-2 px-3 rounded cursor-pointer transition-colors"
            style={{
              border: `3px solid ${areaSelectionMode === 'centerPoint' ? '#3b82f6' : '#d1d5db'}`
            }}
            onClick={() => onAreaSelectionModeChange('centerPoint')}
          >
            <RadioGroupItem value="centerPoint" id="centerPoint" />
            <label
              htmlFor="centerPoint"
              className="text-sm text-gray-200 cursor-pointer flex-1 font-medium"
            >
              Select Center Point
            </label>
          </div>
          <div
            className="flex items-center space-x-3 py-2 px-3 rounded cursor-pointer transition-colors"
            style={{
              border: `3px solid ${areaSelectionMode === 'fourVertices' ? '#3b82f6' : '#d1d5db'}`
            }}
            onClick={() => onAreaSelectionModeChange('fourVertices')}
          >
            <RadioGroupItem value="fourVertices" id="fourVertices" />
            <label
              htmlFor="fourVertices"
              className="text-sm text-gray-200 cursor-pointer flex-1 font-medium"
            >
              Select 4 Vertices
            </label>
          </div>
        </RadioGroup>

        {areaSelectionMode === 'centerPoint' && (
          <div className="text-xs text-blue-400 bg-blue-900/30 p-2 rounded border border-blue-500/30">
            Click on the map to select a center point. A 2km radius circle will be displayed.
          </div>
        )}

        {areaSelectionMode === 'fourVertices' && (
          <div className="text-xs text-blue-400 bg-blue-900/30 p-2 rounded border border-blue-500/30">
            Click on the map to select 4 vertices ({selectedVertices.length}/4 selected).
            {selectedVertices.length < 4 && <> Click {4 - selectedVertices.length} more point{4 - selectedVertices.length !== 1 ? 's' : ''}.</>}
            {selectedVertices.length === 4 && <> All vertices selected. Polygon complete!</>}
          </div>
        )}
      </div>

      {/* Controls & Scenarios Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold bg-slate-800 px-4 py-2 rounded text-center">
          Controls & Scenarios
        </h2>

        {/* Layers */}
        <h3 className="font-semibold text-gray-200">
          Layers
        </h3>

        {/* Risk Overlay */}
        <div className="flex items-center justify-between pl-6">
          <span className="text-sm">Risk Overlay</span>
          <Checkbox
            id="risk-overlay"
            checked={layers.riskOverlay}
            onCheckedChange={() => onLayerToggle('riskOverlay')}
          />
        </div>

        {/* Infrastructure */}
        <div className="flex items-center justify-between pl-6">
          <span className="text-sm">Infrastructure</span>
          <Checkbox
            id="infrastructure"
            checked={layers.infrastructure}
            onCheckedChange={() => onLayerToggle('infrastructure')}
          />
        </div>

        {/* Population Density */}
        <div className="flex items-center justify-between pl-6">
          <span className="text-sm">Population Density</span>
          <Checkbox
            id="population-density"
            checked={layers.populationDensity}
            onCheckedChange={() => onLayerToggle('populationDensity')}
          />
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
              Adjust Rainfall
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Temperature
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {temperatureValue[0] > 0 ? `+${temperatureValue[0]}` : temperatureValue[0]}°C
            </span>
          </div>
          <div className="relative">
            <Slider
              value={temperatureValue}
              onValueChange={setTemperatureValue}
              max={50}
              min={-50}
              step={1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>-50</span>
            <span>50</span>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Wind Speed
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {windSpeedValue[0]} km/h
            </span>
          </div>
          <div className="relative">
            <Slider
              value={windSpeedValue}
              onValueChange={setWindSpeedValue}
              max={252}
              min={0}
              step={1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>252</span>
          </div>
        </div>

        {/* Soil Depth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Soil Depth
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {soilDepthValue[0]} cm
            </span>
          </div>
          <div className="relative">
            <Slider
              value={soilDepthValue}
              onValueChange={setSoilDepthValue}
              max={500}
              min={0}
              step={1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>500</span>
          </div>
        </div>

        {/* Seismic Magnitude */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Seismic Magnitude
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {seismicMagnitudeValue[0].toFixed(1)}
            </span>
          </div>
          <div className="relative">
            <Slider
              value={seismicMagnitudeValue}
              onValueChange={setSeismicMagnitudeValue}
              max={10}
              min={0}
              step={0.1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        {/* Seismic Frequency */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">
              Adjust Seismic Frequency
            </label>
            <span className="text-sm font-medium text-white bg-slate-700 px-2 py-1 rounded">
              {seismicFrequencyValue[0]}/week
            </span>
          </div>
          <div className="relative">
            <Slider
              value={seismicFrequencyValue}
              onValueChange={setSeismicFrequencyValue}
              max={50}
              min={0}
              step={1}
              className="w-full [&>span[data-slot=slider-track]]:bg-black [&>span[data-slot=slider-range]]:bg-white [&>span[data-slot=slider-thumb]]:bg-white [&>span[data-slot=slider-thumb]]:border-black [&>span[data-slot=slider-thumb]]:border-2"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>50</span>
          </div>
        </div>

        {/* Add Retaining Wall */}
        {/* <div className="flex items-center justify-between pt-2">
          <label className="text-sm text-gray-300">
            Add Retaining Wall
          </label>
          <Checkbox id="retaining-wall" />
        </div> */}
      </div>

      {/* Bottom Button */}
      <div className="pt-8">
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Recalculate Risk
        </Button>
      </div>
    </div>
  );
}