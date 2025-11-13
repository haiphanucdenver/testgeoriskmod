import { useState } from "react";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { MapView } from "./components/MapView";
import { DataManagement } from "./components/DataManagement";
import { Account } from "./components/Account";
import { Settings } from "./components/Settings";
import { Reports } from "./components/Reports";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";

import { FlowChart } from "./components/FlowChart";

export default function App() {
  const [currentPage, setCurrentPage] = useState("map");

  // Use persisted value, fallback to true to avoid showing login on first open.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const v = localStorage.getItem("isLoggedIn");
    if (v !== null) return v === "true";
    return true; // change to false if you want login shown by default on first load
  });

  // Layer visibility state - start with only risk overlay visible
  const [layers, setLayers] = useState({
    riskOverlay: true,
    infrastructure: false,
    populationDensity: false,
  });

  // Search location state
  const [searchLocation, setSearchLocation] = useState<string>("");

  // Current map location state
  const [mapLocation, setMapLocation] = useState({
    lat: 45.3,
    lng: -122.7,
    zoom: 10
  });

  // Area selection state
  const [areaSelectionMode, setAreaSelectionMode] = useState<'none' | 'centerPoint' | 'fourVertices'>('none');
  const [selectedCenterPoint, setSelectedCenterPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVertices, setSelectedVertices] = useState<Array<{ lat: number; lng: number }>>([]);

  // Risk calculation results state
  const [riskData, setRiskData] = useState<any>(null);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
  };

  const handleSearch = (location: string) => {
    setSearchLocation(location);
  };

  const handleLocationChange = (lat: number, lng: number, zoom: number) => {
    setMapLocation({ lat, lng, zoom });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("map");
    localStorage.removeItem("isLoggedIn");
  };

  const handleLayerToggle = (layer: 'riskOverlay' | 'infrastructure' | 'populationDensity') => {
    setLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleAreaSelectionModeChange = (mode: 'none' | 'centerPoint' | 'fourVertices') => {
    setAreaSelectionMode(mode);
    // Clear selected point when changing modes
    if (mode !== 'centerPoint') {
      setSelectedCenterPoint(null);
    }
    // Clear vertices when entering fourVertices mode to start fresh
    if (mode === 'fourVertices') {
      setSelectedVertices([]);
    }
  };

  const handleCenterPointSelect = (lat: number, lng: number) => {
    setSelectedCenterPoint({ lat, lng });
    // Auto-exit selection mode after selecting a point
    setAreaSelectionMode('none');
  };

  const handleVertexSelect = (lat: number, lng: number) => {
    setSelectedVertices(prev => {
      const newVertices = [...prev, { lat, lng }];
      // Auto-exit after 4 vertices are selected
      if (newVertices.length === 4) {
        setAreaSelectionMode('none');
      }
      return newVertices;
    });
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderMainContent = () => {
    switch (currentPage) {
      case "data":
        return <DataManagement mapLocation={mapLocation} onRiskCalculated={setRiskData} />;
      case "account":
        return <Account onLogout={handleLogout} />;
      case "settings":
        return <Settings />;
      // case "reports":
      //   return <Reports />;

      // case "flowchart":
      //   return <FlowChart />;
      case "map":
      default:
        return (
          <>
            <LeftSidebar
              layers={layers}
              onLayerToggle={handleLayerToggle}
              mapLocation={mapLocation}
              areaSelectionMode={areaSelectionMode}
              onAreaSelectionModeChange={handleAreaSelectionModeChange}
              selectedVertices={selectedVertices}
            />
            <MapView
              layers={layers}
              searchLocation={searchLocation}
              onLocationChange={handleLocationChange}
              areaSelectionMode={areaSelectionMode}
              selectedCenterPoint={selectedCenterPoint}
              onCenterPointSelect={handleCenterPointSelect}
              selectedVertices={selectedVertices}
              onVertexSelect={handleVertexSelect}
              riskData={riskData}
            />
            <RightSidebar />
          </>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
        onSearch={handleSearch}
      />
      <div className="flex flex-1">
        {renderMainContent()}
      </div>
      <Toaster />
    </div>
  );
}