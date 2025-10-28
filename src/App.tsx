import { useState } from "react";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { MapView } from "./components/MapView";
import { RightSidebar } from "./components/RightSidebar";
import { DataManagement } from "./components/DataManagement";
import { Account } from "./components/Account";
import { Settings } from "./components/Settings";
import { Reports } from "./components/Reports";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";

import { FlowChart } from "./components/FlowChart";

export default function App() {
  const [currentPage, setCurrentPage] = useState("map");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("map"); // Reset to map page after logout
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
            <LeftSidebar />
            <MapView />
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
      />
      <div className="flex flex-1">
        {renderMainContent()}
      </div>
      <Toaster />
    </div>
  );
}