import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { fetchOSMInfrastructure, InfrastructurePoint } from '../utils/osmInfrastructure';
import { fetchPopulationDensity, generatePopulationGeoJSON, PopulationPoint } from '../utils/populationDensity';

// IMPORTANT: Replace with your actual Mapbox API key
// You can also set this as an environment variable in .env file as VITE_MAPBOX_API_KEY
const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY || 'YOUR_MAPBOX_API_KEY_HERE';

interface RiskData {
  R_score: number;
  risk_level: string;
  H_score: number;
  L_score: number;
  V_score: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface MapViewProps {
  layers: {
    riskOverlay: boolean;
    infrastructure: boolean;
    populationDensity: boolean;
  };
  searchLocation?: string;
  onLocationChange?: (lat: number, lng: number, zoom: number) => void;
  areaSelectionMode: 'none' | 'centerPoint' | 'fourVertices';
  selectedCenterPoint: { lat: number; lng: number } | null;
  onCenterPointSelect: (lat: number, lng: number) => void;
  selectedVertices: Array<{ lat: number; lng: number }>;
  onVertexSelect: (lat: number, lng: number) => void;
  riskData?: RiskData | null;
}

export function MapView({ layers, searchLocation, onLocationChange, areaSelectionMode, selectedCenterPoint, onCenterPointSelect, selectedVertices, onVertexSelect, riskData }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const centerPointMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vertexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const activePopupsRef = useRef<Array<{ popup: mapboxgl.Popup; lngLat: [number, number] }>>([]);
  const hoverPopupsRef = useRef<{
    risk: mapboxgl.Popup[];
    infrastructure: mapboxgl.Popup[];
    population: mapboxgl.Popup[];
  }>({ risk: [], infrastructure: [], population: [] });
  const [lng, setLng] = useState(-122.7);
  const [lat, setLat] = useState(45.3);
  const [zoom, setZoom] = useState(10);
  const [currentElevation, setCurrentElevation] = useState(1250);
  const [infrastructureData, setInfrastructureData] = useState<InfrastructurePoint[]>([]);
  const [isLoadingInfrastructure, setIsLoadingInfrastructure] = useState(false);
  const [populationData, setPopulationData] = useState<PopulationPoint[]>([]);
  const [isLoadingPopulation, setIsLoadingPopulation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Helper function to check if two coordinates are close to each other
  const areCoordinatesClose = (coord1: [number, number], coord2: [number, number], threshold = 0.001) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    return Math.abs(lng1 - lng2) < threshold && Math.abs(lat1 - lat2) < threshold;
  };

  // Helper function to clear hover popups by type
  const clearHoverPopups = (type: 'risk' | 'infrastructure' | 'population') => {
    hoverPopupsRef.current[type].forEach(popup => popup.remove());
    hoverPopupsRef.current[type] = [];
  };

  // Calculate offset for popup - single popup appears above the marker
  const calculatePopupOffset = (index: number = 0): [number, number] => {
    if (index === 0) {
      // First popup appears directly above with arrow pointing down at marker
      return [0, -10];
    }
    // Additional popups offset horizontally
    const minSpacing = 20;
    const popupWidth = 250;
    const offsetX = index * (popupWidth + minSpacing);
    const offsetY = -10;
    return [offsetX, offsetY];
  };

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

      // Add risk overlay zones (initially empty, will be updated when risk is calculated)
      map.current.addSource('risk-zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add risk overlay layer with interpolated color coding (red-yellow-green)
      // 0-0.33: green, 0.33-0.66: yellow, 0.66-1.0: red
      map.current.addLayer({
        id: 'risk-overlay',
        type: 'fill',
        source: 'risk-zones',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'riskScore'], // Use normalized 0-1 score
            0, '#22c55e',    // Green (low risk)
            0.33, '#84cc16', // Light green
            0.5, '#eab308',  // Yellow (medium risk)
            0.66, '#f59e0b', // Orange
            1, '#ef4444',    // Red (high risk)
          ],
          'fill-opacity': 0.5,
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

      // Fetch infrastructure data from OpenStreetMap
      setIsLoadingInfrastructure(true);
      fetchOSMInfrastructure([lng, lat], 20) // 20km radius
        .then(data => {
          setInfrastructureData(data);
          setIsLoadingInfrastructure(false);
          console.log(`Loaded ${data.length} infrastructure points from OSM`);
        })
        .catch(error => {
          console.error('Failed to fetch infrastructure:', error);
          setIsLoadingInfrastructure(false);
        });

      // Fetch population density data from OpenStreetMap
      setIsLoadingPopulation(true);
      fetchPopulationDensity([lng, lat], 50) // 50km radius for population data
        .then(data => {
          setPopulationData(data);
          setIsLoadingPopulation(false);
          console.log(`Loaded ${data.length} population points from OSM`);
        })
        .catch(error => {
          console.error('Failed to fetch population data:', error);
          setIsLoadingPopulation(false);
        });

      // Initialize population density source with empty data (will be updated when data loads)
      map.current.addSource('population-density', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
      });

      map.current.addLayer({
        id: 'population-heatmap',
        type: 'heatmap',
        source: 'population-density',
        layout: {
          visibility: 'none' // Hidden by default
        },
        paint: {
          // Use logarithmic weight based on population
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'], // Use pre-calculated logarithmic weight
            0,
            0,
            10,
            1,
          ],
          // Increase intensity as zoom level increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.5,
            9, 1,
            15, 2
          ],
          // Color ramp for heatmap - blue (low) to red (high) population
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
          // Radius of heatmap points - larger radius for better visualization
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 10,
            9, 30,
            15, 60
          ],
          // Opacity
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0.8,
            15, 0.6
          ],
        },
      });

      // Add circle layer for individual population points (visible on hover)
      map.current.addLayer({
        id: 'population-points',
        type: 'circle',
        source: 'population-density',
        layout: {
          visibility: 'none' // Hidden by default
        },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 8,
            15, 12
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 'rgb(103,169,207)',
            5, 'rgb(239,138,98)',
            10, 'rgb(178,24,43)'
          ],
          'circle-opacity': 0.6,
          'circle-stroke-width': 0,
          'circle-stroke-color': 'transparent'
        },
      });

      // Add hover interaction for population points - show popup for specific point
      map.current.on('mouseenter', 'population-points', (e) => {
        if (!map.current || !e.features || e.features.length === 0) return;

        // Change cursor to pointer
        map.current.getCanvas().style.cursor = 'pointer';

        // Clear any existing population hover popups only
        clearHoverPopups('population');

        // Show popup only for the specific point being hovered over
        const feature = e.features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const properties = feature.properties;
        const offset = calculatePopupOffset(0);

        const popup = new mapboxgl.Popup({
          offset: offset,
          closeButton: false
        })
          .setLngLat(coordinates)
          .setHTML(
            `<div style="color: #000; padding: 8px; min-width: 150px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">${properties?.name || 'Population Point'}</h3>
              <p style="font-size: 12px; color: #666; margin-bottom: 4px;">Population: ${properties?.population ? parseInt(properties.population).toLocaleString() : 'N/A'}</p>
              <p style="font-size: 11px; color: #888;">Type: ${properties?.placeType || 'N/A'}</p>
            </div>`
          )
          .addTo(map.current!);

        // Track this hover popup by type
        hoverPopupsRef.current.population.push(popup);
      });

      map.current.on('mouseleave', 'population-points', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }

        // Close population hover popups only when mouse leaves
        clearHoverPopups('population');
      });

      // Mark map as fully loaded
      setMapLoaded(true);
    });

    // Update coordinates display on map move
    map.current.on('move', () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      const newLng = parseFloat(center.lng.toFixed(4));
      const newLat = parseFloat(center.lat.toFixed(4));
      const newZoom = parseFloat(map.current.getZoom().toFixed(2));
      setLng(newLng);
      setLat(newLat);
      setZoom(newZoom);

      // Notify parent component of location change
      if (onLocationChange) {
        onLocationChange(newLat, newLng, newZoom);
      }
    });

    // Hover handler to show risk zone at cursor location
    map.current.on('mouseenter', 'risk-overlay', (e) => {
      if (!map.current || !e.features || e.features.length === 0) return;

      // Change cursor to pointer
      map.current.getCanvas().style.cursor = 'pointer';

      const coordinates = e.lngLat;

      // Clear any existing risk hover popups only
      clearHoverPopups('risk');

      // Show popup only for the first feature (topmost layer)
      const feature = e.features[0];
      const properties = feature.properties;

      // Check if there are infrastructure popups - if so, offset to the right
      const hasInfrastructurePopups = hoverPopupsRef.current.infrastructure.length > 0;
      const offset = hasInfrastructurePopups ? [270, -10] : calculatePopupOffset(0);

      // Create popup for this feature
      const popup = new mapboxgl.Popup({ offset, closeButton: false })
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
            </div>
          </div>`
        )
        .addTo(map.current!);

      // Track this hover popup by type
      hoverPopupsRef.current.risk.push(popup);
    });

    map.current.on('mouseleave', 'risk-overlay', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }

      // Close risk hover popups only when mouse leaves
      clearHoverPopups('risk');
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, []);

  // Create markers from infrastructure data
  useEffect(() => {
    if (!map.current || infrastructureData.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Helper function to build infrastructure popup HTML
    const buildInfrastructurePopupHTML = (point: InfrastructurePoint) => {
      let popupHTML = `
        <div style="color: #000; padding: 8px; min-width: 150px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${point.name}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 4px;">Type: ${point.type}</p>
          <p style="font-size: 11px; color: #888;">Category: ${point.category}</p>
      `;

      if (point.additionalInfo) {
        if (point.additionalInfo.operator) {
          popupHTML += `<p style="font-size: 11px; color: #666; margin-top: 4px;"><strong>Operator:</strong> ${point.additionalInfo.operator}</p>`;
        }
        if (point.additionalInfo.description) {
          popupHTML += `<p style="font-size: 11px; color: #666; margin-top: 4px; font-style: italic;">${point.additionalInfo.description}</p>`;
        }
        if (point.additionalInfo.address) {
          popupHTML += `<p style="font-size: 11px; color: #666; margin-top: 4px;">📍 ${point.additionalInfo.address}</p>`;
        }
        if (point.additionalInfo.phone) {
          popupHTML += `<p style="font-size: 11px; color: #666;">📞 ${point.additionalInfo.phone}</p>`;
        }
        if (point.additionalInfo.email) {
          popupHTML += `<p style="font-size: 11px; color: #2563eb;"><a href="mailto:${point.additionalInfo.email}" style="color: #2563eb; text-decoration: underline;">📧 ${point.additionalInfo.email}</a></p>`;
        }
        if (point.additionalInfo.website) {
          popupHTML += `<p style="font-size: 11px; color: #2563eb; margin-top: 4px;"><a href="${point.additionalInfo.website}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">🌐 Website</a></p>`;
        }
        if (point.additionalInfo.beds) {
          popupHTML += `<p style="font-size: 11px; color: #666;">🛏️ Beds: ${point.additionalInfo.beds}</p>`;
        }
        if (point.additionalInfo.capacity) {
          popupHTML += `<p style="font-size: 11px; color: #666;">👥 Capacity: ${point.additionalInfo.capacity}</p>`;
        }
      }

      popupHTML += `</div>`;
      return popupHTML;
    };

    // Create new markers from OSM data
    infrastructureData.forEach((point) => {
      const el = document.createElement('div');
      el.className = 'infrastructure-marker';
      el.innerHTML = point.icon;
      el.style.fontSize = '24px';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat(point.coordinates);

      // Handle marker hover to show popup for this specific infrastructure
      el.addEventListener('mouseenter', (e) => {
        e.stopPropagation();

        // Clear any existing infrastructure hover popups only
        clearHoverPopups('infrastructure');

        // Show popup only for this specific marker
        const offset = calculatePopupOffset(0);

        const popup = new mapboxgl.Popup({
          offset: offset,
          closeButton: false
        })
          .setLngLat(point.coordinates)
          .setHTML(buildInfrastructurePopupHTML(point))
          .addTo(map.current!);

        // Track this hover popup by type
        hoverPopupsRef.current.infrastructure.push(popup);
      });

      // Handle marker mouse leave to remove infrastructure popups only
      el.addEventListener('mouseleave', () => {
        clearHoverPopups('infrastructure');
      });

      // Store marker reference for later control
      markersRef.current.push(marker);

      // Add to map if infrastructure layer is visible
      if (layers.infrastructure) {
        marker.addTo(map.current!);
      }
    });

    console.log(`Created ${markersRef.current.length} infrastructure markers`);
  }, [infrastructureData, map.current]);

  // Update population density heatmap when data is loaded
  useEffect(() => {
    if (!map.current || populationData.length === 0) return;

    const source = map.current.getSource('population-density') as mapboxgl.GeoJSONSource;
    if (source) {
      const geoJson = generatePopulationGeoJSON(populationData);
      source.setData(geoJson);
      console.log(`Updated population heatmap with ${populationData.length} points`);
    }
  }, [populationData]);

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
      // Clear risk popups when layer is hidden
      if (!layers.riskOverlay) {
        clearHoverPopups('risk');
      }
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
    // Clear infrastructure popups when layer is hidden
    if (!layers.infrastructure) {
      clearHoverPopups('infrastructure');
    }

    // Toggle Population Density heatmap and points
    if (map.current.getLayer('population-heatmap')) {
      map.current.setLayoutProperty(
        'population-heatmap',
        'visibility',
        layers.populationDensity ? 'visible' : 'none'
      );
    }
    if (map.current.getLayer('population-points')) {
      map.current.setLayoutProperty(
        'population-points',
        'visibility',
        layers.populationDensity ? 'visible' : 'none'
      );
      // Clear population popups when layer is hidden
      if (!layers.populationDensity) {
        clearHoverPopups('population');
      }
    }
  }, [layers]);

  // Handle search location changes
  useEffect(() => {
    if (!map.current || !searchLocation) return;

    // Use Mapbox Geocoding API to convert search query to coordinates
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json?access_token=${MAPBOX_API_KEY}&limit=1`;

    fetch(geocodeUrl)
      .then(response => response.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;
          const placeName = data.features[0].place_name;

          // Fly to the searched location
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true,
            duration: 2000
          });

          // Update state
          setLng(longitude);
          setLat(latitude);

          // Add a temporary marker at the searched location
          const searchCoords: [number, number] = [longitude, latitude];
          const searchOffset = calculatePopupOffset(searchCoords);

          const searchPopup = new mapboxgl.Popup({
            offset: [searchOffset[0] + 25, searchOffset[1]]
          }).setHTML(
            `<div style="color: #000; padding: 8px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">Search Result</h3>
              <p style="font-size: 12px;">${placeName}</p>
            </div>`
          );

          const searchMarker = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([longitude, latitude])
            .setPopup(searchPopup)
            .addTo(map.current!);

          // Show popup automatically and track it with coordinates
          searchMarker.togglePopup();
          activePopupsRef.current.push({ popup: searchPopup, lngLat: searchCoords });

          // Remove from array when popup is closed
          searchPopup.on('close', () => {
            activePopupsRef.current = activePopupsRef.current.filter(item => item.popup !== searchPopup);
          });

          // Remove marker after 5 seconds
          setTimeout(() => {
            searchMarker.remove();
            activePopupsRef.current = activePopupsRef.current.filter(item => item.popup !== searchPopup);
          }, 5000);
        } else {
          console.warn('No results found for:', searchLocation);
        }
      })
      .catch(error => {
        console.error('Geocoding error:', error);
      });
  }, [searchLocation]);

  // Handle map click for center point and vertex selection
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      if (areaSelectionMode === 'centerPoint') {
        onCenterPointSelect(lat, lng);
      } else if (areaSelectionMode === 'fourVertices') {
        onVertexSelect(lat, lng);
      }
    };

    // Change cursor style when in selection mode
    if (areaSelectionMode === 'centerPoint' || areaSelectionMode === 'fourVertices') {
      map.current.getCanvas().style.cursor = 'crosshair';
      map.current.on('click', handleMapClick);
    } else {
      map.current.getCanvas().style.cursor = '';
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [areaSelectionMode, onCenterPointSelect, onVertexSelect]);

  // Draw circle when center point is selected
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing marker and circle if any
    if (centerPointMarkerRef.current) {
      centerPointMarkerRef.current.remove();
      centerPointMarkerRef.current = null;
    }

    // Remove existing circle layer and source if any
    if (map.current.getLayer('selection-circle-fill')) {
      map.current.removeLayer('selection-circle-fill');
    }
    if (map.current.getLayer('selection-circle-border')) {
      map.current.removeLayer('selection-circle-border');
    }
    if (map.current.getSource('selection-circle')) {
      map.current.removeSource('selection-circle');
    }

    // If no center point selected, return
    if (!selectedCenterPoint) return;

    // Add marker at center point
    centerPointMarkerRef.current = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([selectedCenterPoint.lng, selectedCenterPoint.lat])
      .addTo(map.current);

    // Create circle with 2km radius
    // Convert 2km to degrees (approximately)
    // At equator, 1 degree ≈ 111km, so 2km ≈ 0.018 degrees
    // For better accuracy, we'll use a proper circle calculation
    const radius = 2; // km
    const points = 64;
    const coords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);

      // Convert km to degrees (approximation that works reasonably well)
      const deltaLng = dx / (111.32 * Math.cos(selectedCenterPoint.lat * Math.PI / 180));
      const deltaLat = dy / 110.574;

      coords.push([
        selectedCenterPoint.lng + deltaLng,
        selectedCenterPoint.lat + deltaLat
      ]);
    }

    // Close the circle
    coords.push(coords[0]);

    // Add circle as a GeoJSON source
    map.current.addSource('selection-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      }
    });

    // Add circle fill layer with risk-based coloring
    // Gray (0.4 opacity) until risk is calculated, allowing 3D terrain to show through
    // Will be updated to: red (#ef4444) for high, orange (#f59e0b) for medium, green (#22c55e) for low
    map.current.addLayer({
      id: 'selection-circle-fill',
      type: 'fill',
      source: 'selection-circle',
      paint: {
        'fill-color': '#6b7280', // Gray placeholder - will be updated based on calculated risk
        'fill-opacity': 0.4 // Semi-transparent to show 3D terrain underneath
      }
    });

    // Add circle border layer
    map.current.addLayer({
      id: 'selection-circle-border',
      type: 'line',
      source: 'selection-circle',
      paint: {
        'line-color': '#ffffff',
        'line-width': 2
      }
    });

  }, [selectedCenterPoint, mapLoaded]);

  // Draw polygon when vertices are selected
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing vertex markers
    vertexMarkersRef.current.forEach(marker => marker.remove());
    vertexMarkersRef.current = [];

    // Remove existing polygon layers and source
    if (map.current.getLayer('selection-polygon-fill')) {
      map.current.removeLayer('selection-polygon-fill');
    }
    if (map.current.getLayer('selection-polygon-border')) {
      map.current.removeLayer('selection-polygon-border');
    }
    if (map.current.getSource('selection-polygon')) {
      map.current.removeSource('selection-polygon');
    }

    // If no vertices, return
    if (selectedVertices.length === 0) return;

    // Add markers for each vertex
    selectedVertices.forEach((vertex, index) => {
      const marker = new mapboxgl.Marker({
        color: '#3b82f6',
        scale: 0.8
      })
        .setLngLat([vertex.lng, vertex.lat])
        .addTo(map.current!);

      vertexMarkersRef.current.push(marker);
    });

    // Draw polygon if we have at least 3 vertices
    if (selectedVertices.length >= 3) {
      const coords = selectedVertices.map(v => [v.lng, v.lat]);
      // Close the polygon by adding the first point at the end
      coords.push(coords[0]);

      map.current.addSource('selection-polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          }
        }
      });

      // Add polygon fill layer with risk-based coloring
      // Gray (0.4 opacity) until risk is calculated, allowing 3D terrain to show through
      // Will be updated to: red (#ef4444) for high, orange (#f59e0b) for medium, green (#22c55e) for low
      map.current.addLayer({
        id: 'selection-polygon-fill',
        type: 'fill',
        source: 'selection-polygon',
        paint: {
          'fill-color': '#6b7280', // Gray placeholder - will be updated based on calculated risk
          'fill-opacity': 0.4 // Semi-transparent to show 3D terrain underneath
        }
      });

      // Add polygon border layer
      map.current.addLayer({
        id: 'selection-polygon-border',
        type: 'line',
        source: 'selection-polygon',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2
        }
      });
    }

  }, [selectedVertices, mapLoaded]);

  // Update risk overlay when risk data is calculated
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('risk-zones') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // If no risk data, clear the overlay
    if (!riskData) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    // Create geometry based on selected area
    let geometry: any = null;

    if (selectedVertices.length === 4) {
      // Use the 4-vertex polygon
      const coordinates = selectedVertices.map(v => [v.lng, v.lat]);
      coordinates.push([selectedVertices[0].lng, selectedVertices[0].lat]); // Close the polygon
      geometry = {
        type: 'Polygon',
        coordinates: [coordinates],
      };
    } else if (selectedCenterPoint) {
      // Use a circle around the center point (approximate with polygon)
      const radiusInDegrees = 0.05; // ~5km radius
      const points = 64;
      const coordinates = [];
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const lat = selectedCenterPoint.lat + radiusInDegrees * Math.cos(angle);
        const lng = selectedCenterPoint.lng + radiusInDegrees * Math.sin(angle);
        coordinates.push([lng, lat]);
      }
      coordinates.push(coordinates[0]); // Close the polygon
      geometry = {
        type: 'Polygon',
        coordinates: [coordinates],
      };
    }

    // If we have geometry, create the risk overlay feature
    if (geometry) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              riskScore: riskData.R_score, // 0-1 normalized score
              riskLevel: riskData.risk_level,
              H_score: riskData.H_score,
              L_score: riskData.L_score,
              V_score: riskData.V_score,
            },
            geometry: geometry,
          },
        ],
      });
    }
  }, [riskData, selectedCenterPoint, selectedVertices, mapLoaded]);

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

      {/* Infrastructure Loading Indicator */}
      {isLoadingInfrastructure && (
        <div className="absolute top-32 left-4 bg-blue-600/90 text-white px-3 py-2 rounded text-xs backdrop-blur-sm z-10 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          Loading infrastructure data...
        </div>
      )}

      {/* Infrastructure Count Display */}
      {!isLoadingInfrastructure && infrastructureData.length > 0 && (
        <div className="absolute top-32 left-4 bg-green-600/90 text-white px-3 py-2 rounded text-xs backdrop-blur-sm z-10">
          {infrastructureData.length} infrastructure points loaded
        </div>
      )}

      {/* Population Loading Indicator */}
      {isLoadingPopulation && (
        <div className="absolute top-44 left-4 bg-purple-600/90 text-white px-3 py-2 rounded text-xs backdrop-blur-sm z-10 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          Loading population data...
        </div>
      )}

      {/* Population Count Display */}
      {!isLoadingPopulation && populationData.length > 0 && (
        <div className="absolute top-44 left-4 bg-purple-600/90 text-white px-3 py-2 rounded text-xs backdrop-blur-sm z-10">
          {populationData.length} population points loaded
        </div>
      )}

      {/* Risk Overlay Legend */}
      {layers.riskOverlay && riskData && (
        <div className="absolute top-20 right-4 bg-black/70 text-white p-3 rounded text-xs backdrop-blur-sm z-10 space-y-2">
          <div className="font-semibold mb-2">Risk Level</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>High (0.66 - 1.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span>Medium (0.33 - 0.66)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Low (0 - 0.33)</span>
          </div>
          {riskData && (
            <div className="mt-3 pt-2 border-t border-white/20">
              <div className="font-semibold mb-1">Current Area</div>
              <div className="text-white">
                Risk Score: {(riskData.R_score * 100).toFixed(1)}%
              </div>
              <div className="text-white capitalize">
                Level: {riskData.risk_level.replace('-', ' ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Population Density Legend */}
      {layers.populationDensity && (
        <div className="absolute top-80 right-4 bg-black/70 text-white p-3 rounded text-xs backdrop-blur-sm z-10 space-y-2">
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
    </div>
  );
}
