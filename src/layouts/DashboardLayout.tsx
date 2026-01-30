import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, CalendarDays, Package, Receipt, Settings, Box, ShoppingCart, LayoutDashboard, ClipboardList } from "lucide-react"; // Import ClipboardList icon
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils"; // Import cn for conditional classnames

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { profile, isLoading } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();

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
      name: "Procurement", // New item
      href: "/operasional/procurement", // New route
      icon: ClipboardList, // Icon for Procurement
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"], // Roles that can access
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
    // Add more navigation items here based on roles
  ];

  const filteredNavigation = navigationItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b border-gray-700 px-4 lg:h-[60px] lg:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg font-bold text-neon-cyan">Elmony App</span>
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
                  isActive && "text-neon-cyan bg-gray-800 neon-glow"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-neon-cyan hover:bg-gray-800"
          onClick={handleLogout}
        >
          <Settings className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-deep-charcoal text-foreground">
      {/* Desktop Floating Sidebar */}
      <aside className="fixed left-4 top-4 bottom-4 hidden w-64 rounded-xl glassmorphism md:flex flex-col z-50">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col md:ml-72"> {/* Adjust margin for fixed sidebar */}
        {/* Mobile Header and Sidebar */}
        <header className="flex h-14 items-center gap-4 border-b border-gray-700 bg-deep-charcoal px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 text-neon-cyan border-neon-cyan/50 bg-transparent hover:bg-gray-800"
              >
                <Home className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-midnight-blue glassmorphism border-r border-gray-700">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold text-neon-cyan">Elmony App</span>
          </Link>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;