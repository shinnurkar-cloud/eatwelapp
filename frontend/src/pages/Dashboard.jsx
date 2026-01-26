import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag,
  Clock,
  Bike,
  DollarSign,
  Store,
  Users,
  MapPin,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, trend, color = "primary" }) => {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    green: "text-green-500 bg-green-500/10",
    yellow: "text-yellow-500 bg-yellow-500/10",
  };

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-bold font-mono mt-2">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
                <TrendingUp className="w-3 h-3" />
                <span className="font-mono">{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: "Pending", className: "status-pending" },
    confirmed: { label: "Confirmed", className: "status-confirmed" },
    preparing: { label: "Preparing", className: "status-preparing" },
    out_for_delivery: { label: "Out for Delivery", className: "status-out_for_delivery" },
    delivered: { label: "Delivered", className: "status-delivered" },
    cancelled: { label: "Cancelled", className: "status-cancelled" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant="outline" className={`${config.className} font-mono text-xs uppercase`}>
      {config.label}
    </Badge>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/recent-orders`),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your delivery operations
        </p>
      </div>

      {/* Stats Grid - Bento Layout */}
      <div className="bento-grid">
        <div className="bento-item-wide">
          <StatCard
            title="Total Revenue"
            value={`$${(stats?.total_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            trend="+12.5% this week"
            color="green"
          />
        </div>
        
        <StatCard
          title="Total Orders"
          value={stats?.total_orders || 0}
          icon={ShoppingBag}
          color="primary"
        />
        
        <StatCard
          title="Pending Orders"
          value={stats?.pending_orders || 0}
          icon={Clock}
          color="yellow"
        />
        
        <StatCard
          title="Active Deliveries"
          value={stats?.active_deliveries || 0}
          icon={Bike}
          color="accent"
        />
        
        <StatCard
          title="Restaurants"
          value={stats?.total_restaurants || 0}
          icon={Store}
          color="primary"
        />
        
        <StatCard
          title="Delivery Boys"
          value={stats?.total_delivery_boys || 0}
          icon={Bike}
          color="accent"
        />
        
        <StatCard
          title="Customers"
          value={stats?.total_customers || 0}
          icon={Users}
          color="green"
        />
        
        <StatCard
          title="Delivery Zones"
          value={stats?.total_zones || 0}
          icon={MapPin}
          color="primary"
        />
      </div>

      {/* Recent Orders */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once placed</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {recentOrders.map((order, index) => (
                  <div
                    key={order.id}
                    data-testid={`order-${order.id}`}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-sm text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="font-medium mt-1 truncate">
                        {order.restaurant_name || "Unknown Restaurant"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {order.customer_name || "Unknown Customer"} • {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-mono font-bold text-lg">
                        ${(order.total_amount + order.delivery_fee).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
