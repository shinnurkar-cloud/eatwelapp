import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DeliveryBoys from "@/pages/DeliveryBoys";
import Combos from "@/pages/Combos";
import Plans from "@/pages/Plans";
import Zones from "@/pages/Zones";
import Orders from "@/pages/Orders";
import Customers from "@/pages/Customers";
import Subscriptions from "@/pages/Subscriptions";
import Banners from "@/pages/Banners";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";
import "@/App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="delivery-boys" element={<DeliveryBoys />} />
        <Route path="combos" element={<Combos />} />
        <Route path="plans" element={<Plans />} />
        <Route path="zones" element={<Zones />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="banners" element={<Banners />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
