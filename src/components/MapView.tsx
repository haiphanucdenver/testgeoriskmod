
//import mapImage from 'figma:asset/6444ffb02271b17f771e6d5b5950c80f54c50e1d.png';
import mapImage from '../assets/image.jpeg';



export function MapView() {
  return (
    <div className="flex-1 relative bg-gray-100">
      {/* Map Background - Using the exact provided map */}
      <div className="absolute inset-0">
        <img
          src={mapImage}
          alt="Risk assessment map"
          //className="w-full h-full object-contain"
        />
      </div>
      
      {/* Map Text Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Location Labels */}
        <div className="absolute top-1/4 left-1/3 bg-black/60 text-white px-2 py-1 rounded text-sm backdrop-blur-sm">
          Mountain Ridge
        </div>
        
        <div className="absolute top-1/6 right-1/4 bg-black/60 text-white px-2 py-1 rounded text-sm backdrop-blur-sm">
          North Valley
        </div>
        
        
        
        {/* Analysis Point Marker */}
        
        
        {/* Risk Assessment Labels */}
        
        
        
        
        {/* Geographic Features */}
        
        
        
        
        {/* Elevation Marker */}
        <div className="absolute top-1/5 left-1/2 text-yellow-300 text-xs backdrop-blur-sm bg-black/40 px-1 rounded">
          Elevation: 1,250m
        </div>
        
        {/* Coordinates */}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono backdrop-blur-sm">
          45°18'N 122°42'W
        </div>        
        
        {/* Scale Indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
          Scale: 1:25,000
        </div>
      </div>
      
      {/* Reports Button */}
      <div className="absolute top-4 right-4">
        <button className="bg-slate-800/80 text-white px-4 py-2 rounded backdrop-blur-sm">
          Download
        </button>
      </div>
    </div>
  );
}