import { useState } from "react";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
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

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
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

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderMainContent = () => {
    switch (currentPage) {
      case "data":
        return <DataManagement />;
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
            <LeftSidebar layers={layers} onLayerToggle={handleLayerToggle} />
            <MapView layers={layers} />
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
      />
      <div className="flex flex-1">
        {renderMainContent()}
      </div>
      <Toaster />
    </div>
  );
}