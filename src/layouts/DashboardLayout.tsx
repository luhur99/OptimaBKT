import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, CalendarDays, Package, Receipt, Settings, Box, ShoppingCart, LayoutDashboard, ClipboardList, Menu, ArrowLeft, Truck } from "lucide-react"; // Import Truck icon
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { profile, isLoading } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open for desktop

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-deep-charcoal">
        <aside className="w-64 bg-midnight-blue p-4 border-r border-gray-800 hidden md:block">
          <Skeleton className="h-8 w-3/4 mb-8 bg-gray-700" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
          </div>
        </aside>
        <main className="flex-1 p-8">
          <Skeleton className="h-10 w-1/4 mb-6 bg-gray-700" />
          <Skeleton className="h-6 w-1/2 mb-8 bg-gray-700" />
          <Skeleton className="h-[calc(100vh-200px)] w-full bg-gray-700" />
        </main>
      </div>
    );
  }

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV", "TECHNICIAN", "ACCOUNTING", "USER"],
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: Users,
      roles: ["SUPER_ADMIN"],
    },
    {
      name: "Operasional Scheduling",
      href: "/operasional/scheduling",
      icon: CalendarDays,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Sales Scheduling",
      href: "/sales/scheduling",
      icon: ShoppingCart,
      roles: ["SUPER_ADMIN", "SALES_DIV"],
    },
    {
      name: "Procurement",
      href: "/operasional/procurement",
      icon: ClipboardList,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"],
    },
    {
      name: "Delivery Orders", // New navigation item
      href: "/operasional/delivery-orders",
      icon: Truck, // Using Truck icon
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Stock Movement",
      href: "/operasional/stock-movement",
      icon: Package,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Product Catalog",
      href: "/operasional/products",
      icon: Box,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Inventory Dashboard",
      href: "/operasional/inventory-dashboard",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Billing Review",
      href: "/operasional/billing-review",
      icon: Receipt,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "ACCOUNTING"],
    },
  ];

  const filteredNavigation = navigationItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  const SidebarContent = ({ isCollapsed = false }) => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b border-gray-700 px-4 lg:h-[60px] lg:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          {isCollapsed ? (
            <Home className="h-5 w-5 text-neon-cyan" />
          ) : (
            <span className="text-lg font-bold text-neon-cyan">OPTIMABKT</span>
          )}
        </Link>
      </div>
      <div className="flex-1 py-4">
        <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "text-gray-400 hover:text-neon-cyan hover:bg-gray-800",
                  isActive && "text-neon-cyan bg-gray-800 neon-glow",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-gray-400 hover:text-neon-cyan hover:bg-gray-800",
            isCollapsed && "justify-center"
          )}
          onClick={handleLogout}
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-deep-charcoal text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-50 flex-col bg-midnight-blue p-4 border-r border-gray-800 transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20",
        "hidden md:flex" // Ensure it's hidden on mobile, flex on desktop
      )}>
        <SidebarContent isCollapsed={!isSidebarOpen} />
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col flex-1",
        isSidebarOpen ? "md:ml-64" : "md:ml-20" // Dynamic margin for desktop
      )}>
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b border-gray-700 bg-deep-charcoal px-4 lg:h-[60px] lg:px-6">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 text-neon-cyan border-neon-cyan/50 bg-transparent hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" /> {/* Hamburger icon for mobile */}
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-midnight-blue glassmorphism border-r border-gray-700">
              <SidebarContent /> {/* Mobile sidebar content is always full */}
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex shrink-0 text-neon-cyan hover:bg-gray-800"
          >
            {isSidebarOpen ? <ArrowLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />} {/* Toggle icon for desktop */}
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* The Elmony App title in the header is now removed to avoid redundancy with the sidebar title */}
          {/* <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold text-neon-cyan">Elmony App</span>
          </Link> */}
          {/* Add other header content here if needed */}
        </header>

        <main className="flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;