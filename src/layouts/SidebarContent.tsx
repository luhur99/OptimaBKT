import { NavLink } from "react-router-dom";
import { CalendarDays, Home, Settings, User } from "lucide-react";

export function SidebarContent() {
  return (
    <nav className="flex flex-col p-4 space-y-2">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-neon-cyan/20 hover:text-neon-cyan ${
            isActive ? "bg-neon-cyan/20 text-neon-cyan shadow-neon-glow" : "text-gray-400"
          }`
        }
      >
        <Home className="h-5 w-5" />
        Home
      </NavLink>
      <NavLink
        to="/scheduling-requests"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-neon-cyan/20 hover:text-neon-cyan ${
            isActive ? "bg-neon-cyan/20 text-neon-cyan shadow-neon-glow" : "text-gray-400"
          }`
        }
      >
        <CalendarDays className="h-5 w-5" />
        Scheduling Requests
      </NavLink>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-neon-cyan/20 hover:text-neon-cyan ${
            isActive ? "bg-neon-cyan/20 text-neon-cyan shadow-neon-glow" : "text-gray-400"
          }`
        }
      >
        <User className="h-5 w-5" />
        Profile
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-neon-cyan/20 hover:text-neon-cyan ${
            isActive ? "bg-neon-cyan/20 text-neon-cyan shadow-neon-glow" : "text-gray-400"
          }`
        }
      >
        <Settings className="h-5 w-5" />
        Settings
      </NavLink>
    </nav>
  );
}