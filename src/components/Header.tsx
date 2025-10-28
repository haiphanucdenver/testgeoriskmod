import { Menu, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export function Header({
  currentPage,
  onPageChange,
  onLogout,
}: HeaderProps) {
  const navItems = [
    { id: "map", label: "Map" },
    { id: "data", label: "Data Management" },
    // { id: "reports", label: "Reports" },
    { id: "settings", label: "Setting" },

    //{ id: "flowchart", label: "Flow Chart" }
  ];

  return (
    <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              G
            </span>
          </div>
          <span className="text-xl font-semibold">GEORISKMOD</span>
        </div>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`transition-colors ${
                currentPage === item.id
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {(currentPage === "map" || currentPage === "data") && (
          <Input
            placeholder="Search map..."
            className="w-48 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 text-white hover:bg-slate-700 px-3 py-2 rounded-md transition-colors">
            <User className="h-4 w-4" />
            <span className="text-sm">Hai P.</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white border-gray-200 shadow-lg"
            sideOffset={5}
          >
            <DropdownMenuItem
              onClick={() => onPageChange("account")}
              className="text-gray-900 hover:bg-gray-100 cursor-pointer"
            >
              <User className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}