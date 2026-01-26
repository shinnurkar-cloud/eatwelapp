import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingBag,
  Loader2,
  Coffee,
  Sun,
  Moon,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle,
  Package,
  Truck,
  AlertCircle,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "yellow" },
  packed: { label: "Packed", icon: Package, color: "blue" },
  out_for_delivery: { label: "Out for Delivery", icon: Truck, color: "orange" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "green" },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`status-${status} font-mono text-xs uppercase flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const OrderCard = ({ order, onStatusUpdate, deliveryBoys }) => {
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [selectedBoy, setSelectedBoy] = useState(order.delivery_boy_id || "");

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await onStatusUpdate(order.id, selectedStatus, selectedBoy);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={order.status} />
              <span className="font-mono text-xs text-muted-foreground">
                #{order.id.slice(0, 8)}
              </span>
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{order.customer_mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{order.customer_address}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{order.combo_name}</Badge>
              {order.zone_name && (
                <Badge variant="outline" className="text-accent border-accent/30">
                  {order.zone_name}
                </Badge>
              )}
            </div>

            {order.delivery_boy_name && (
              <p className="text-sm text-accent mt-2">
                Delivery: {order.delivery_boy_name}
              </p>
            )}
          </div>
        </div>

        {order.status !== "delivered" && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-input flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedStatus === "out_for_delivery" && !order.delivery_boy_id && (
                <Select value={selectedBoy} onValueChange={setSelectedBoy}>
                  <SelectTrigger className="bg-input flex-1">
                    <SelectValue placeholder="Assign delivery boy" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryBoys.map((boy) => (
                      <SelectItem key={boy.id} value={boy.id}>
                        {boy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <Button
              onClick={handleUpdate}
              disabled={updating || selectedStatus === order.status}
              className="w-full"
              size="sm"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Status"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneSummary, setZoneSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mealType, setMealType] = useState("breakfast");
  const [filterZone, setFilterZone] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, [mealType]);

  const fetchData = async () => {
    try {
      const [ordersRes, boysRes, zonesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/orders?meal_type=${mealType}`),
        axios.get(`${API}/delivery-boys`),
        axios.get(`${API}/zones`),
        axios.get(`${API}/orders/zone-summary?meal_type=${mealType}`),
      ]);
      setOrders(ordersRes.data);
      setDeliveryBoys(boysRes.data.filter(b => b.is_active));
      setZones(zonesRes.data);
      setZoneSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, status, deliveryBoyId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status,
        delivery_boy_id: deliveryBoyId || null
      });
      toast.success("Order updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterZone !== "all" && order.zone_id !== filterZone) return false;
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    return true;
  });

  const getMealIcon = (type) => {
    switch (type) {
      case "breakfast": return Coffee;
      case "lunch": return Sun;
      case "dinner": return Moon;
      default: return Coffee;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const MealIcon = getMealIcon(mealType);

  return (
    <div data-testid="orders-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Today's meal orders by type
          </p>
        </div>
      </div>

      {/* Meal Type Tabs */}
      <Tabs value={mealType} onValueChange={setMealType} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="breakfast" data-testid="tab-breakfast" className="gap-2">
            <Coffee className="w-4 h-4" />
            Breakfast
          </TabsTrigger>
          <TabsTrigger value="lunch" data-testid="tab-lunch" className="gap-2">
            <Sun className="w-4 h-4" />
            Lunch
          </TabsTrigger>
          <TabsTrigger value="dinner" data-testid="tab-dinner" className="gap-2">
            <Moon className="w-4 h-4" />
            Dinner
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Zone Summary */}
      {zoneSummary.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
              <MealIcon className="w-5 h-5" />
              Zone-wise Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zoneSummary.map((zone) => (
                <div key={zone.zone_id || 'unassigned'} className="p-4 bg-secondary/30 rounded-lg">
                  <h4 className="font-medium text-accent">{zone.zone_name}</h4>
                  <div className="mt-2 space-y-1">
                    {zone.combos?.map((combo, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{combo.combo_name}</span>
                        <span className="font-mono font-bold">{combo.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zone</label>
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger data-testid="filter-zone" className="w-[180px] bg-input">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status" className="w-[180px] bg-input">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No {mealType} orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate orders from the dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => (
            <div
              key={order.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <OrderCard
                order={order}
                onStatusUpdate={handleStatusUpdate}
                deliveryBoys={deliveryBoys}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
