import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  CalendarRange,
  MapPin,
  ShoppingBag,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bike,
  Leaf,
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_5b457f8b-21e9-4fcb-ab01-881f7858e8c3/artifacts/cjqtf2uz_Gemini_Generated_Image_yx04ezyx04ezyx04-removebg-preview%20%281%29.png";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/delivery-boys", icon: Bike, label: "Delivery Boys" },
  { path: "/combos", icon: UtensilsCrossed, label: "Combos" },
  { path: "/plans", icon: CalendarRange, label: "Plans" },
  { path: "/zones", icon: MapPin, label: "Zones" },
  { path: "/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/customers", icon: Users, label: "Customers" },
  { path: "/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-btn"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-orange-900/80 backdrop-blur-lg border border-orange-500/20 rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5 text-orange-200" />
      </button>

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-orange-950/95 to-black/95 backdrop-blur-xl border-r border-orange-500/20 z-40 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center p-1">
                <img src={LOGO_URL} alt="Eatwel" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div className="animate-fade-in">
                  <h1 className="text-xl font-bold tracking-tight text-orange-100">EATWEL</h1>
                  <p className="text-xs text-orange-400 font-medium">Stay Healthy</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-300 border-l-2 border-orange-500"
                      : "text-orange-200/70 hover:bg-orange-500/10 hover:text-orange-200"
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium animate-fade-in">{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-orange-500/20">
            {!collapsed && user && (
              <div className="px-4 py-2 mb-2 animate-fade-in">
                <p className="text-sm font-medium text-orange-100 truncate">{user.name}</p>
                <p className="text-xs text-orange-400 font-mono truncate uppercase">
                  {user.role}
                </p>
              </div>
            )}
            <Button
              data-testid="logout-btn"
              variant="ghost"
              className="w-full justify-start gap-3 text-orange-300/70 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </div>

          {/* Collapse button */}
          <button
            data-testid="collapse-sidebar-btn"
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-orange-900 border border-orange-500/30 rounded-full items-center justify-center hover:bg-orange-800 text-orange-300"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        }`}
      >
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
