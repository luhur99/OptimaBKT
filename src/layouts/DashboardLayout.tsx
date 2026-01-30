import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Package2, Home, ShoppingCart, Package, Users, LineChart, Truck, CalendarDays, FileText, Factory, Warehouse, Settings, UserCog, ReceiptText, ScrollText, ClipboardList, BarChart3, Boxes, Handshake, FileStack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthSession } from '@/hooks/use-auth-session';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isSidebarOpen: boolean;
  end?: boolean;
  allowedRoles?: string[];
  userRole?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, isSidebarOpen, end, allowedRoles, userRole }) => {
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-neon-cyan",
          isActive ? "bg-gray-800 text-neon-cyan" : "text-gray-400",
          isSidebarOpen ? "justify-start" : "justify-center"
        )
      }
    >
      <Icon className={cn("h-5 w-5", !isSidebarOpen && "mx-auto")} />
      {isSidebarOpen && <span className="text-sm">{label}</span>}
    </NavLink>
  );
};

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/login');
    }
  };

  const userRole = profile?.role;

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard", end: true, allowedRoles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN", "SALES_DIV", "WAREHOUSE_STAFF", "PURCHASING_STAFF"] },
    { to: "/operasional/scheduling", icon: CalendarDays, label: "Scheduling", allowedRoles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "TECHNICIAN"] },
    { to: "/operasional/delivery-orders", icon: Truck, label: "Delivery Orders", allowedRoles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "WAREHOUSE_STAFF"] }, // New DO menu
    { to: "/operasional/invoices", icon: FileText, label: "Invoices", allowedRoles: ["SUPER_ADMIN", "OPERASIONAL_DIV", "SALES_DIV"] },
    { to: "/operasional/sales-details", icon: ScrollText, label: "Sales Details", allowedRoles: ["SUPER_ADMIN", "SALES_DIV"] },
    { to: "/purchasing/purchase-requests", icon: ClipboardList, label: "Purchase Requests", allowedRoles: ["SUPER_ADMIN", "PURCHASING_STAFF"] },
    { to: "/purchasing/purchase-orders", icon: ReceiptText, label: "Purchase Orders", allowedRoles: ["SUPER_ADMIN", "PURCHASING_STAFF", "WAREHOUSE_STAFF"] },
    { to: "/warehouse/products", icon: Package, label: "Products", allowedRoles: ["SUPER_ADMIN", "WAREHOUSE_STAFF", "PURCHASING_STAFF"] },
    { to: "/warehouse/inventories", icon: Boxes, label: "Inventories", allowedRoles: ["SUPER_ADMIN", "WAREHOUSE_STAFF"] },
    { to: "/warehouse/stock-ledger", icon: BarChart3, label: "Stock Ledger", allowedRoles: ["SUPER_ADMIN", "WAREHOUSE_STAFF"] },
    { to: "/master-data/customers", icon: Users, label: "Customers", allowedRoles: ["SUPER_ADMIN", "SALES_DIV", "OPERASIONAL_DIV"] },
    { to: "/master-data/suppliers", icon: Handshake, label: "Suppliers", allowedRoles: ["SUPER_ADMIN", "PURCHASING_STAFF"] },
    { to: "/master-data/technicians", icon: UserCog, label: "Technicians", allowedRoles: ["SUPER_ADMIN", "OPERASIONAL_DIV"] },
    { to: "/master-data/warehouse-categories", icon: Factory, label: "Warehouse Categories", allowedRoles: ["SUPER_ADMIN", "WAREHOUSE_STAFF"] },
    { to: "/master-data/sales-invoices", icon: FileStack, label: "Sales Invoices", allowedRoles: ["SUPER_ADMIN", "SALES_DIV"] },
    { to: "/settings", icon: Settings, label: "Settings", allowedRoles: ["SUPER_ADMIN"] },
  ];

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-neon-cyan">
        Loading authentication...
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr] bg-deep-charcoal text-foreground">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-50 flex-col bg-midnight-blue p-4 border-r border-gray-800 transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20",
        "hidden md:flex"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {isSidebarOpen ? (
            <NavLink to="/" className="flex items-center gap-2 font-semibold text-neon-cyan">
              <Package2 className="h-6 w-6" />
              <span>Acme Inc</span>
            </NavLink>
          ) : (
            <NavLink to="/" className="flex items-center justify-center w-full font-semibold text-neon-cyan">
              <Package2 className="h-6 w-6" />
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:bg-gray-700 hover:text-neon-cyan"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-auto py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isSidebarOpen={isSidebarOpen}
              end={item.end}
              allowedRoles={item.allowedRoles}
              userRole={userRole}
            />
          ))}
        </nav>
      </aside>

      <div className={cn(
        "flex flex-col",
        isSidebarOpen ? "md:ml-64" : "md:ml-20",
        "transition-all duration-300 w-full"
      )}>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-800 bg-midnight-blue px-4 md:px-6 justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden bg-midnight-blue border-gray-700 text-neon-cyan hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-midnight-blue border-r border-gray-800 text-foreground">
              <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-neon-cyan h-16 border-b border-gray-700 px-4">
                <Package2 className="h-6 w-6" />
                <span>Acme Inc</span>
              </NavLink>
              <nav className="grid gap-2 py-4 text-lg font-medium flex-1 overflow-auto">
                {navItems.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isSidebarOpen={true} // Always open in mobile sheet
                    end={item.end}
                    allowedRoles={item.allowedRoles}
                    userRole={userRole}
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex-1">
            {/* You can add a search bar or other header content here */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full border-2 border-neon-cyan/50 w-9 h-9">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || "https://github.com/shadcn.png"} alt="User Avatar" />
                  <AvatarFallback>{profile?.full_name ? profile.full_name.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-midnight-blue border border-gray-700 text-foreground">
              <DropdownMenuLabel className="text-neon-cyan">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800">Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800">Support</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-gray-800 focus:bg-gray-800">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;