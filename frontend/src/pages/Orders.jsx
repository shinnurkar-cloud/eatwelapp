import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  pending: { label: "Pending", className: "status-pending", next: "confirmed" },
  confirmed: { label: "Confirmed", className: "status-confirmed", next: "preparing" },
  preparing: { label: "Preparing", className: "status-preparing", next: "out_for_delivery" },
  out_for_delivery: { label: "Out for Delivery", className: "status-out_for_delivery", next: "delivered" },
  delivered: { label: "Delivered", className: "status-delivered", next: null },
  cancelled: { label: "Cancelled", className: "status-cancelled", next: null },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={`${config.className} font-mono text-xs uppercase`}>
      {config.label}
    </Badge>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, boysRes] = await Promise.all([
        axios.get(`${API}/orders`),
        axios.get(`${API}/delivery-boys?available_only=true`),
      ]);
      setOrders(ordersRes.data);
      setDeliveryBoys(boysRes.data);
    } catch (error) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  const handleUpdateStatus = async (order, newStatus) => {
    setUpdating(true);
    try {
      const updateData = { status: newStatus };
      if (newStatus === "out_for_delivery" && selectedDeliveryBoy) {
        updateData.delivery_boy_id = selectedDeliveryBoy;
      }

      await axios.put(`${API}/orders/${order.id}/status`, updateData);
      toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
      fetchData();
      setDialogOpen(false);
      setSelectedDeliveryBoy("");
    } catch (error) {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async (order) => {
    setUpdating(true);
    try {
      await axios.put(`${API}/orders/${order.id}/status`, { status: "cancelled" });
      toast.success("Order cancelled");
      fetchData();
      setDialogOpen(false);
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setUpdating(false);
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="orders-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger data-testid="filter-status" className="w-[180px] bg-input">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders will appear here once placed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <Card
              key={order.id}
              data-testid={`order-card-${order.id}`}
              className="bg-card border-border hover:border-primary/50 transition-colors duration-300 animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 0.03}s` }}
              onClick={() => viewOrderDetails(order)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-mono text-sm text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </p>
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-muted-foreground font-mono">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <p className="font-medium">
                        {order.restaurant_name || "Unknown Restaurant"}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {order.items?.length || 0} items
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {order.delivery_address}
                    </p>
                    {order.delivery_boy_name && (
                      <p className="text-sm text-accent mt-1">
                        Delivery: {order.delivery_boy_name}
                      </p>
                    )}
                  </div>

                  {/* Price and Action */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono font-bold text-xl">
                        ${(order.total_amount + order.delivery_fee).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +${order.delivery_fee.toFixed(2)} delivery
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              {/* Order ID and Status */}
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-muted-foreground">
                  #{selectedOrder.id.slice(0, 8)}
                </p>
                <StatusBadge status={selectedOrder.status} />
              </div>

              {/* Restaurant */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Restaurant</p>
                <p className="font-medium">{selectedOrder.restaurant_name || "Unknown"}</p>
              </div>

              {/* Customer */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{selectedOrder.customer_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {selectedOrder.delivery_address}
                </p>
              </div>

              {/* Items */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <ScrollArea className="max-h-[150px]">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-mono">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
                <div className="border-t border-border mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-mono">${selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span className="font-mono">${selectedOrder.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="font-mono">
                      ${(selectedOrder.total_amount + selectedOrder.delivery_fee).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Boy Assignment */}
              {selectedOrder.status === "preparing" && (
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground mb-2">Assign Delivery Boy</p>
                  <Select value={selectedDeliveryBoy} onValueChange={setSelectedDeliveryBoy}>
                    <SelectTrigger data-testid="assign-delivery-boy" className="bg-input">
                      <SelectValue placeholder="Select delivery boy" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryBoys.map((boy) => (
                        <SelectItem key={boy.id} value={boy.id}>
                          {boy.name} ({boy.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Assigned Delivery Boy */}
              {selectedOrder.delivery_boy_name && (
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground">Assigned Delivery Boy</p>
                  <p className="font-medium text-accent">{selectedOrder.delivery_boy_name}</p>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground font-mono">
                <p>Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(selectedOrder.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedOrder && statusConfig[selectedOrder.status]?.next && (
              <Button
                data-testid="advance-order-status"
                onClick={() =>
                  handleUpdateStatus(selectedOrder, statusConfig[selectedOrder.status].next)
                }
                disabled={updating}
                className="font-bold"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `Mark as ${statusConfig[statusConfig[selectedOrder.status].next].label}`
                )}
              </Button>
            )}
            {selectedOrder &&
              selectedOrder.status !== "delivered" &&
              selectedOrder.status !== "cancelled" && (
                <Button
                  variant="secondary"
                  data-testid="cancel-order-btn"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleCancelOrder(selectedOrder)}
                  disabled={updating}
                >
                  Cancel Order
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
