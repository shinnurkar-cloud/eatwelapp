import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  ShoppingBag,
  Bike,
  Coffee,
  Sun,
  Moon,
  CheckCircle,
  Clock,
  Loader2,
  Play,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color = "primary", subtitle }) => {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    green: "text-green-500 bg-green-500/10",
    yellow: "text-yellow-500 bg-yellow-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    purple: "text-purple-500 bg-purple-500/10",
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
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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

const MealCard = ({ title, icon: Icon, orders, color, onGenerate, generating }) => {
  const colorClasses = {
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 text-${color}-500`} />
            <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
          </div>
          <Badge variant="outline" className="font-mono">
            {orders} orders
          </Badge>
        </div>
        <Button
          onClick={onGenerate}
          disabled={generating}
          variant="secondary"
          className="w-full"
          data-testid={`generate-${title.toLowerCase()}-btn`}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Generate Orders
        </Button>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState({ breakfast: false, lunch: false, dinner: false });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrders = async (mealType) => {
    setGenerating({ ...generating, [mealType]: true });
    try {
      const response = await axios.post(`${API}/orders/generate?meal_type=${mealType}`);
      toast.success(response.data.message);
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate orders";
      toast.error(message);
    } finally {
      setGenerating({ ...generating, [mealType]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Today's meal delivery overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscribers"
          value={stats?.total_active_customers || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Today's Orders"
          value={stats?.total_orders_today || 0}
          icon={ShoppingBag}
          color="primary"
        />
        <StatCard
          title="Delivery Boys"
          value={stats?.total_delivery_boys || 0}
          icon={Bike}
          color="accent"
        />
        <StatCard
          title="Delivered"
          value={stats?.delivered_today || 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${stats?.pending_today || 0} pending`}
        />
      </div>

      {/* Order Generation Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight uppercase mb-4">
          Order Generation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MealCard
            title="Breakfast"
            icon={Coffee}
            orders={stats?.breakfast_orders || 0}
            color="yellow"
            onGenerate={() => handleGenerateOrders("breakfast")}
            generating={generating.breakfast}
          />
          <MealCard
            title="Lunch"
            icon={Sun}
            orders={stats?.lunch_orders || 0}
            color="orange"
            onGenerate={() => handleGenerateOrders("lunch")}
            generating={generating.lunch}
          />
          <MealCard
            title="Dinner"
            icon={Moon}
            orders={stats?.dinner_orders || 0}
            color="purple"
            onGenerate={() => handleGenerateOrders("dinner")}
            generating={generating.dinner}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Delivered</span>
                </div>
                <span className="font-mono font-bold">{stats?.delivered_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <span className="font-mono font-bold">{stats?.pending_today || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_orders_today
                        ? (stats.delivered_today / stats.total_orders_today) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Meal Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-yellow-500" />
                  <span>Breakfast</span>
                </div>
                <span className="font-mono font-bold">{stats?.breakfast_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  <span>Lunch</span>
                </div>
                <span className="font-mono font-bold">{stats?.lunch_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-500" />
                  <span>Dinner</span>
                </div>
                <span className="font-mono font-bold">{stats?.dinner_orders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
