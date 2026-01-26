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
  CreditCard,
  Plus,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Calendar,
  User,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, customersRes, plansRes] = await Promise.all([
        axios.get(`${API}/subscriptions`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/plans?active_only=true`),
      ]);
      setSubscriptions(subsRes.data);
      setCustomers(customersRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCustomer || !selectedPlan) {
      toast.error("Please select customer and plan");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/subscriptions`, {
        customer_id: selectedCustomer,
        plan_id: selectedPlan,
      });
      toast.success("Subscription activated");
      fetchData();
      handleCloseDialog();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to create subscription";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (subId) => {
    try {
      await axios.put(`${API}/subscriptions/${subId}/pause`);
      toast.success("Subscription paused");
      fetchData();
    } catch (error) {
      toast.error("Failed to pause subscription");
    }
  };

  const handleResume = async (subId) => {
    try {
      await axios.put(`${API}/subscriptions/${subId}/resume`);
      toast.success("Subscription resumed");
      fetchData();
    } catch (error) {
      toast.error("Failed to resume subscription");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCustomer("");
    setSelectedPlan("");
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="subscriptions-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer meal subscriptions
          </p>
        </div>
        <Button
          data-testid="add-subscription-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase"
          disabled={customers.length === 0 || plans.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Activate Subscription
        </Button>
      </div>

      {(customers.length === 0 || plans.length === 0) && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <p className="text-yellow-500">
              {customers.length === 0 && "Add customers first. "}
              {plans.length === 0 && "Create subscription plans first."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CreditCard className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold font-mono">
                {subscriptions.filter((s) => s.is_active && !s.is_paused).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Pause className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paused</p>
              <p className="text-2xl font-bold font-mono">
                {subscriptions.filter((s) => s.is_paused).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <CreditCard className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold font-mono">{subscriptions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No subscriptions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activate subscriptions for customers
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase">
              All Subscriptions ({subscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {subscriptions.map((sub, index) => (
                  <div
                    key={sub.id}
                    data-testid={`subscription-card-${sub.id}`}
                    className="p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={
                              sub.is_paused
                                ? "status-pending"
                                : sub.is_active
                                ? "status-delivered"
                                : "status-cancelled"
                            }
                          >
                            {sub.is_paused ? "Paused" : sub.is_active ? "Active" : "Expired"}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            #{sub.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{sub.customer_name}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{sub.plan_name}</Badge>
                          <Badge variant="outline">{sub.combo_name}</Badge>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(sub.start_date)} - {formatDate(sub.end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {sub.is_active && !sub.is_paused && (
                          <Button
                            size="sm"
                            variant="secondary"
                            data-testid={`pause-subscription-${sub.id}`}
                            onClick={() => handlePause(sub.id)}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                        )}
                        {sub.is_paused && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-green-500"
                            data-testid={`resume-subscription-${sub.id}`}
                            onClick={() => handleResume(sub.id)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Subscription Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              Activate Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Customer *</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger data-testid="select-customer" className="bg-input">
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.customer_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Plan *</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger data-testid="select-plan" className="bg-input">
                  <SelectValue placeholder="Choose plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ${p.price} ({p.validity_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Subscription will be activated immediately (manual activation - payment skipped)
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-subscription-btn"
              onClick={handleCreate}
              disabled={saving}
              className="font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;
