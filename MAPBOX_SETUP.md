# Mapbox Integration Setup Guide

## Overview

The GeoRiskModTest application now features an interactive Mapbox-powered map with advanced risk assessment visualization and 3D terrain capabilities.

## Features Implemented

### Interactive Map Features
- **Pan & Zoom**: Navigate the map freely with mouse/touch controls
- **3D Terrain**: Realistic elevation visualization with 1.5x exaggeration
- **3D Buildings**: Extruded building footprints in urban areas
- **Satellite Imagery**: High-resolution satellite base layer with street labels

### Risk Assessment Layers
- **Color-Coded Risk Zones**:
  - 🔴 Red: High Risk (landslide, avalanche zones)
  - 🟠 Orange: Medium Risk (flooding areas)
  - 🟢 Green: Low Risk (safe zones)
- **Interactive Popups**: Click any risk zone to view detailed information:
  - Risk level and score (0-10)
  - Identified hazards
  - Location name

### Infrastructure Markers
- 🏥 **Medical Facilities** (Hospitals)
- 🏫 **Educational Institutions** (Schools)
- ⚡ **Utilities** (Power stations, critical infrastructure)
- Click markers for facility details

### Controls & UI Elements
- **Navigation Controls**: Zoom in/out, compass orientation (top-left)
- **Fullscreen Mode**: Toggle fullscreen view (top-left)
- **Scale Bar**: Metric distance reference (bottom-left)
- **Live Coordinates**: Real-time lat/long display (bottom-right)
- **Zoom Level**: Current zoom multiplier (bottom-center)
- **Elevation Display**: Current elevation in meters (top-left)
- **Risk Legend**: Color-coded risk level key (top-right)

## Setup Instructions

### Step 1: Get a Mapbox API Key

1. Visit [Mapbox Account](https://account.mapbox.com/)
2. Sign up for a free account (or log in)
3. Navigate to **Access Tokens** section
4. Copy your **Default Public Token** or create a new one
   - For production, create a token with URL restrictions

### Step 2: Configure Your API Key

#### Option A: Using Environment Variables (Recommended)

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```env
   VITE_MAPBOX_API_KEY=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJhYmMxMjM0NTYifQ.xxxxxxx
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

#### Option B: Direct Code Update (Not Recommended for Production)

1. Open `src/components/MapView.tsx`
2. Find line 7:
   ```typescript
   const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY || 'YOUR_MAPBOX_API_KEY_HERE';
   ```
3. Replace `'YOUR_MAPBOX_API_KEY_HERE'` with your actual key:
   ```typescript
   const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY || 'pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJhYmMxMjM0NTYifQ.xxxxxxx';
   ```

### Step 3: Run the Application

```bash
npm install  # Install dependencies (including mapbox-gl)
npm run dev  # Start development server
```

Visit `http://localhost:3000` and the interactive map should load.

## Understanding the Map

### Risk Overlay Data

The current implementation includes **sample GeoJSON data** for three risk zones:

1. **Mountain Ridge** (High Risk - 7.2/10)
   - Hazards: Landslide, Avalanche
   - Location: Northwest region

2. **North Valley** (Medium Risk - 4.5/10)
   - Hazards: Flooding
   - Location: North-central region

3. **Central Area** (Low Risk - 2.1/10)
   - Hazards: None identified
   - Location: Central-south region

### Connecting to Your Database

To replace sample data with real PostgreSQL/PostGIS data:

1. **Backend API Endpoint**: Create an endpoint in `main.py` to serve GeoJSON:
   ```python
   @app.get("/api/risk-zones")
   def get_risk_zones():
       # Query PostGIS database
       # Return GeoJSON FeatureCollection
   ```

2. **Update MapView.tsx**: Fetch data from your API:
   ```typescript
   const response = await fetch('/api/risk-zones');
   const geojsonData = await response.json();

   map.current.addSource('risk-zones', {
     type: 'geojson',
     data: geojsonData
   });
   ```

## Customization Options

### Change Map Style

Edit line 27 in `MapView.tsx`:
```typescript
style: 'mapbox://styles/mapbox/satellite-streets-v12'
```

Available Mapbox styles:
- `satellite-streets-v12` - Satellite with labels (current)
- `streets-v12` - Standard street map
- `outdoors-v12` - Topographic/hiking map
- `light-v11` - Minimal light theme
- `dark-v11` - Dark theme (matches app)
- Custom style URL from Mapbox Studio

### Adjust Initial View

Edit lines 12-14 in `MapView.tsx`:
```typescript
const [lng, setLng] = useState(-122.7);  // Longitude
const [lat, setLat] = useState(45.3);    // Latitude
const [zoom, setZoom] = useState(10);    // Zoom level (0-22)
```

### Modify 3D Tilt

Edit line 30 in `MapView.tsx`:
```typescript
pitch: 45,  // Angle (0 = flat, 60 = max tilt)
```

### Change Terrain Exaggeration

Edit line 60 in `MapView.tsx`:
```typescript
map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
// Values: 0 (flat) to 3 (very dramatic)
```

## Integration with Sidebar Controls

The left sidebar in `LeftSidebar.tsx` has controls ready for integration:

- **Layer Toggles**: Risk Overlay, Infrastructure, Population Density
- **Scenario Modeling**: Rainfall adjustment, temperature changes, hazard additions

### Next Steps for Full Integration:

1. **State Management**: Use React Context or props to share map instance
2. **Layer Toggle Logic**: Connect sidebar checkboxes to map layer visibility
3. **Scenario Updates**: Trigger map layer re-rendering on scenario changes
4. **Real-time Calculations**: Update risk overlay colors based on scenario inputs

Example integration pattern:
```typescript
// In App.tsx or shared context
const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

// In MapView.tsx
useEffect(() => {
  if (map.current) {
    setMapInstance(map.current);
  }
}, [map.current]);

// In LeftSidebar.tsx
const toggleRiskOverlay = (visible: boolean) => {
  if (mapInstance) {
    mapInstance.setLayoutProperty(
      'risk-overlay',
      'visibility',
      visible ? 'visible' : 'none'
    );
  }
};
```

## Troubleshooting

### "API Key Required" Warning Appears
- Verify `.env` file exists and contains `VITE_MAPBOX_API_KEY`
- Restart dev server after creating/modifying `.env`
- Check browser console for errors

### Map Doesn't Load
- Check browser console for API key errors
- Verify internet connection (Mapbox requires online access)
- Ensure no ad blockers are blocking Mapbox domains
- Check Mapbox API key is valid and not expired

### 3D Terrain Not Showing
- Zoom in closer (terrain detail appears at higher zoom levels)
- Check if WebGL is enabled in your browser
- Some older browsers don't support WebGL 2.0

### Performance Issues
- Reduce terrain exaggeration
- Switch to a simpler map style (`streets-v12` instead of `satellite-streets-v12`)
- Decrease pitch to 0 for flat 2D view
- Reduce number of custom markers/overlays

## Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Mapbox Studio](https://studio.mapbox.com/) - Create custom map styles
- [GeoJSON Specification](https://geojson.org/) - Data format for map layers
- [PostGIS Documentation](https://postgis.net/docs/) - Spatial database queries

## Next Features to Implement

1. **Geocoding**: Add address search functionality
2. **Drawing Tools**: Allow users to draw custom risk zones
3. **Heatmaps**: Population density and infrastructure density visualization
4. **Time-series Animation**: Show risk changes over time
5. **Export**: Download map as PNG/PDF for reports
6. **Clustering**: Group infrastructure markers at low zoom levels
7. **Routing**: Calculate evacuation routes and safe paths

## License & Attribution

Mapbox requires attribution on all maps. This is automatically included by the Mapbox GL JS library.

If you use Mapbox's free tier:
- 50,000 free map loads per month
- Unlimited use for development

For production apps exceeding free tier limits, visit [Mapbox Pricing](https://www.mapbox.com/pricing).
