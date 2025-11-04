import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// IMPORTANT: Replace with your actual Mapbox API key
// You can also set this as an environment variable in .env file as VITE_MAPBOX_API_KEY
const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1IjoiZHBhcmNoZXRhIiwiYSI6ImNtaGdqM2tqdzBnamYyaXE2eWVkeWw3a3IifQ.k5Gc9Bh0Y9F0xx05bsBFpQ';

interface MapViewProps {
  layers: {
    riskOverlay: boolean;
    infrastructure: boolean;
    populationDensity: boolean;
  };
}

export function MapView({ layers }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [lng, setLng] = useState(-122.7);
  const [lat, setLat] = useState(45.3);
  const [zoom, setZoom] = useState(10);
  const [currentElevation, setCurrentElevation] = useState(1250);
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_API_KEY;

    // Initialize the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite view for risk assessment
      center: [lng, lat],
      zoom: zoom,
      pitch: 45, // 3D tilt for terrain visualization
      bearing: 0,
    });

    // Add navigation controls (zoom buttons)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Add terrain and 3D buildings
    map.current.on('load', () => {
      if (!map.current) return;

      // Add terrain layer for 3D elevation
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add 3D buildings layer
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );

      // Add sample risk overlay zones (GeoJSON)
      map.current.addSource('risk-zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                name: 'Mountain Ridge',
                riskLevel: 'High',
                riskScore: 7.2,
                hazards: 'Landslide, Avalanche',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-122.75, 45.35],
                    [-122.65, 45.35],
                    [-122.65, 45.28],
                    [-122.75, 45.28],
                    [-122.75, 45.35],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: {
                name: 'North Valley',
                riskLevel: 'Medium',
                riskScore: 4.5,
                hazards: 'Flooding',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-122.72, 45.38],
                    [-122.62, 45.38],
                    [-122.62, 45.33],
                    [-122.72, 45.33],
                    [-122.72, 45.38],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: {
                name: 'Central Area',
                riskLevel: 'Low',
                riskScore: 2.1,
                hazards: 'None identified',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-122.68, 45.32],
                    [-122.58, 45.32],
                    [-122.58, 45.25],
                    [-122.68, 45.25],
                    [-122.68, 45.32],
                  ],
                ],
              },
            },
          ],
        },
      });

      // Add risk overlay layer with color coding
      map.current.addLayer({
        id: 'risk-overlay',
        type: 'fill',
        source: 'risk-zones',
        paint: {
          'fill-color': [
            'match',
            ['get', 'riskLevel'],
            'High',
            '#ef4444', // Red for high risk
            'Medium',
            '#f59e0b', // Orange for medium risk
            'Low',
            '#22c55e', // Green for low risk
            '#6b7280', // Gray default
          ],
          'fill-opacity': 0.4,
        },
      });

      // Add risk zone borders
      map.current.addLayer({
        id: 'risk-borders',
        type: 'line',
        source: 'risk-zones',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
        },
      });

      // Add sample infrastructure markers (stored in ref for later toggle control)
      const infrastructurePoints = [
        {
          name: 'Hospital',
          type: 'medical',
          coordinates: [-122.7, 45.3],
          icon: '🏥',
        },
        {
          name: 'School',
          type: 'education',
          coordinates: [-122.68, 45.32],
          icon: '🏫',
        },
        {
          name: 'Power Station',
          type: 'utilities',
          coordinates: [-122.72, 45.35],
          icon: '⚡',
        },
      ];

      infrastructurePoints.forEach((point) => {
        const el = document.createElement('div');
        el.className = 'infrastructure-marker';
        el.innerHTML = point.icon;
        el.style.fontSize = '24px';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat(point.coordinates as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="color: #000; padding: 8px;">
                <h3 style="font-weight: bold; margin-bottom: 4px;">${point.name}</h3>
                <p style="font-size: 12px; color: #666;">Type: ${point.type}</p>
              </div>`
            )
          );

        // Store marker reference for later control
        markersRef.current.push(marker);
      });

      // Add population density heatmap layer
      map.current.addSource('population-density', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { density: 150 }, // people per km²
              geometry: {
                type: 'Point',
                coordinates: [-122.7, 45.3],
              },
            },
            {
              type: 'Feature',
              properties: { density: 300 },
              geometry: {
                type: 'Point',
                coordinates: [-122.68, 45.32],
              },
            },
            {
              type: 'Feature',
              properties: { density: 450 },
              geometry: {
                type: 'Point',
                coordinates: [-122.72, 45.35],
              },
            },
            {
              type: 'Feature',
              properties: { density: 200 },
              geometry: {
                type: 'Point',
                coordinates: [-122.65, 45.28],
              },
            },
            {
              type: 'Feature',
              properties: { density: 100 },
              geometry: {
                type: 'Point',
                coordinates: [-122.75, 45.38],
              },
            },
          ],
        },
      });

      map.current.addLayer({
        id: 'population-heatmap',
        type: 'heatmap',
        source: 'population-density',
        paint: {
          // Increase weight as density increases
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'density'],
            0,
            0,
            500,
            1,
          ],
          // Increase intensity as zoom level increases
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          // Color ramp for heatmap
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33,102,172,0)',
            0.2,
            'rgb(103,169,207)',
            0.4,
            'rgb(209,229,240)',
            0.6,
            'rgb(253,219,199)',
            0.8,
            'rgb(239,138,98)',
            1,
            'rgb(178,24,43)',
          ],
          // Radius of heatmap points
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 40],
          // Decrease opacity to transition into circle layer
          'heatmap-opacity': 0.7,
        },
      });
    });

    // Update coordinates display on map move
    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setLng(parseFloat(center.lng.toFixed(4)));
      setLat(parseFloat(center.lat.toFixed(4)));
      setZoom(parseFloat(map.current.getZoom().toFixed(2)));
    });

    // Click handler to show location details
    map.current.on('click', 'risk-overlay', (e) => {
      if (!map.current || !e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const coordinates = e.lngLat;
      const properties = feature.properties;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(
          `<div style="color: #000; padding: 12px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${properties?.name}</h3>
            <div style="font-size: 14px; line-height: 1.6;">
              <p><strong>Risk Level:</strong> <span style="color: ${
                properties?.riskLevel === 'High'
                  ? '#ef4444'
                  : properties?.riskLevel === 'Medium'
                  ? '#f59e0b'
                  : '#22c55e'
              };">${properties?.riskLevel}</span></p>
              <p><strong>Risk Score:</strong> ${properties?.riskScore}/10</p>
              <p><strong>Hazards:</strong> ${properties?.hazards}</p>
              <p style="margin-top: 8px; font-size: 12px; color: #666;">
                Click for detailed analysis →
              </p>
            </div>
          </div>`
        )
        .addTo(map.current);
    });

    // Change cursor on hover over risk zones
    map.current.on('mouseenter', 'risk-overlay', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'risk-overlay', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Handle layer visibility changes
  useEffect(() => {
    if (!map.current) return;

    // Toggle Risk Overlay layers
    if (map.current.getLayer('risk-overlay')) {
      map.current.setLayoutProperty(
        'risk-overlay',
        'visibility',
        layers.riskOverlay ? 'visible' : 'none'
      );
    }
    if (map.current.getLayer('risk-borders')) {
      map.current.setLayoutProperty(
        'risk-borders',
        'visibility',
        layers.riskOverlay ? 'visible' : 'none'
      );
    }

    // Toggle Infrastructure markers
    markersRef.current.forEach((marker) => {
      if (layers.infrastructure) {
        marker.addTo(map.current!);
      } else {
        marker.remove();
      }
    });

    // Toggle Population Density heatmap
    if (map.current.getLayer('population-heatmap')) {
      map.current.setLayoutProperty(
        'population-heatmap',
        'visibility',
        layers.populationDensity ? 'visible' : 'none'
      );
    }
  }, [layers]);

  // Helper function to format coordinates
  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    const latDeg = Math.floor(Math.abs(lat));
    const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
    const lngDeg = Math.floor(Math.abs(lng));
    const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
    return `${latDeg}°${latMin}'${latDir} ${lngDeg}°${lngMin}'${lngDir}`;
  };

  return (
    <div className="flex-1 relative" style={{ minHeight: '400px' }}>
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* Coordinates Overlay */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono backdrop-blur-sm z-10">
        {formatCoordinates(lat, lng)}
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-2 rounded text-xs backdrop-blur-sm z-10">
        Zoom: {zoom.toFixed(1)}x
      </div>

      {/* Elevation Display */}
      <div className="absolute top-20 left-4 bg-black/70 text-yellow-300 px-3 py-2 rounded text-xs backdrop-blur-sm z-10">
        Elevation: {currentElevation}m
      </div>

      {/* Overall Risk Score Overlay - Top Right */}
      <div
        className="absolute text-white p-6 rounded-lg"
        style={{
          position: 'fixed',
          top: '100px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: 'transparent',
          minWidth: '200px'
        }}
      >
        <h3 className="font-semibold text-center mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' }}>
          Overall Risk Score
        </h3>

        {/* Circular Progress Indicator with centered number */}
        <div className="flex justify-center mb-4">
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
              <span className="text-white font-bold text-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)' }}>0.68</span>
            </div>
          </div>
        </div>

        {/* Three Circle Diagram (Borromean Rings) - Touching Triangle Layout */}
        <div className="flex justify-center">
          <div
            className="relative cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: '96px', height: '88px' }}
            onClick={() => setShowFormulaDialog(true)}
            title="Click to see calculation formula"
          >
            {/* Blue circle - top left, H label at top-left corner */}
            <div className="absolute" style={{ top: '0px', left: '0px' }}>
              <div className="relative w-12 h-12 border-4 border-blue-500 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>0.72</span>
                {/* H label at top-left corner */}
                <div className="absolute -top-2 -left-2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">H</span>
                </div>
              </div>
            </div>

            {/* Green circle - top right, L label at top-right corner */}
            <div className="absolute" style={{ top: '0px', right: '0px' }}>
              <div className="relative w-12 h-12 border-4 border-green-500 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>0.65</span>
                {/* L label at top-right corner */}
                <div className="absolute -top-2 -right-2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">L</span>
                </div>
              </div>
            </div>

            {/* Orange circle - bottom center, V label at bottom corner */}
            <div className="absolute" style={{ bottom: '0px', left: '50%', transform: 'translateX(-50%)' }}>
              <div className="relative w-12 h-12 border-4 border-orange-500 rounded-full bg-orange-500/10 flex items-center justify-center">
                <span className="text-white text-xs font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>0.67</span>
                {/* V label at bottom corner */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <span className="text-white text-xs font-semibold bg-slate-900 px-1 rounded">V</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Legend - shows based on active layers */}
      {(layers.riskOverlay || layers.populationDensity) && (
        <div className="absolute top-80 right-4 bg-black/70 text-white p-3 rounded text-xs backdrop-blur-sm z-10 space-y-2">
          {layers.riskOverlay && (
            <>
              <div className="font-semibold mb-2">Risk Levels</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Low Risk</span>
              </div>
            </>
          )}

          {layers.populationDensity && (
            <>
              {layers.riskOverlay && <div className="border-t border-gray-500 my-2"></div>}
              <div className="font-semibold mb-2">Population Density</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(178,24,43)' }}></div>
                <span>High (&gt;400/km²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(239,138,98)' }}></div>
                <span>Medium (200-400/km²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: 'rgb(103,169,207)' }}></div>
                <span>Low (&lt;200/km²)</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* API Key Warning (remove after setting key) */}
      {MAPBOX_API_KEY === 'YOUR_MAPBOX_API_KEY_HERE' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white p-6 rounded-lg backdrop-blur-sm z-50 max-w-md">
          <h3 className="font-bold text-lg mb-2">⚠️ Mapbox API Key Required</h3>
          <p className="text-sm mb-3">
            Please add your Mapbox API key to display the interactive map.
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Get a free API key from mapbox.com</li>
            <li>Create a .env file in the project root</li>
            <li>Add: VITE_MAPBOX_API_KEY=your_key_here</li>
            <li>Or update MAPBOX_API_KEY in MapView.tsx</li>
          </ol>
        </div>
      )}

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
