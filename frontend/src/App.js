import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DeliveryZones from "@/pages/DeliveryZones";
import Restaurants from "@/pages/Restaurants";
import MenuItems from "@/pages/MenuItems";
import Orders from "@/pages/Orders";
import DeliveryBoys from "@/pages/DeliveryBoys";
import Customers from "@/pages/Customers";
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
        <Route path="zones" element={<DeliveryZones />} />
        <Route path="restaurants" element={<Restaurants />} />
        <Route path="menu" element={<MenuItems />} />
        <Route path="orders" element={<Orders />} />
        <Route path="delivery-boys" element={<DeliveryBoys />} />
        <Route path="customers" element={<Customers />} />
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
