import React from "react";
import { Link } from "react-router-dom";
import { Home, Users, CalendarDays, Package, Receipt, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { profile, isLoading } = useAuthSession();
  const navigate = useNavigate();

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
      <div className="flex h-screen">
        <aside className="w-64 bg-sidebar p-4 border-r border-sidebar-border hidden md:block">
          <Skeleton className="h-8 w-3/4 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </aside>
        <main className="flex-1 p-8">
          <Skeleton className="h-10 w-1/4 mb-6" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-[calc(100vh-200px)] w-full" />
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
      name: "Scheduling",
      href: "/operasional/scheduling",
      icon: CalendarDays,
      roles: ["SUPER_ADMIN", "OPERASIONAL_DIV"],
    },
    {
      name: "Stock Movement",
      href: "/operasional/stock-movement",
      icon: Package,
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
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg font-bold text-sidebar-primary-foreground">Elmony App</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary" onClick={handleLogout}>
          <Settings className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-sidebar md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header and Sidebar */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Home className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-sidebar">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold text-foreground">Elmony App</span>
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