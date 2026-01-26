import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Bike,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  vehicle_type: "",
  vehicle_number: "",
};

const DeliveryBoys = () => {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedBoy, setSelectedBoy] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchDeliveryBoys();
  }, []);

  const fetchDeliveryBoys = async () => {
    try {
      const response = await axios.get(`${API}/delivery-boys`);
      setDeliveryBoys(response.data);
    } catch (error) {
      toast.error("Failed to fetch delivery boys");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error("Name, email, and phone are required");
      return;
    }
    if (!selectedBoy && !formData.password) {
      toast.error("Password is required for new delivery boys");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/delivery-boys`, formData);
      toast.success("Delivery boy added successfully");
      fetchDeliveryBoys();
      handleCloseDialog();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBoy) return;

    try {
      await axios.delete(`${API}/delivery-boys/${selectedBoy.id}`);
      toast.success("Delivery boy removed successfully");
      fetchDeliveryBoys();
      setSelectedBoy(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleToggleAvailability = async (boy) => {
    try {
      await axios.put(`${API}/delivery-boys/${boy.id}/availability?is_available=${!boy.is_available}`);
      toast.success(`${boy.name} is now ${!boy.is_available ? "available" : "unavailable"}`);
      fetchDeliveryBoys();
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBoy(null);
    setFormData(initialFormData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="delivery-boys-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Delivery Boys</h1>
          <p className="text-muted-foreground mt-1">
            Manage delivery personnel
          </p>
        </div>
        <Button
          data-testid="add-delivery-boy-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Delivery Boy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Bike className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold font-mono">{deliveryBoys.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold font-mono">
                {deliveryBoys.filter((b) => b.is_available).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <XCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Busy</p>
              <p className="text-2xl font-bold font-mono">
                {deliveryBoys.filter((b) => !b.is_available).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Boys List */}
      {deliveryBoys.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No delivery boys yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Add Delivery Boy" to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveryBoys.map((boy, index) => (
            <Card
              key={boy.id}
              data-testid={`delivery-boy-card-${boy.id}`}
              className="bg-card border-border hover:border-accent/50 transition-colors duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold">{boy.name}</h3>
                      <Badge
                        variant="outline"
                        className={boy.is_available ? "status-delivered" : "status-pending"}
                      >
                        {boy.is_available ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    data-testid={`toggle-availability-${boy.id}`}
                    checked={boy.is_available}
                    onCheckedChange={() => handleToggleAvailability(boy)}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{boy.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{boy.phone}</span>
                  </div>
                  {boy.vehicle_type && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bike className="w-4 h-4" />
                      <span>
                        {boy.vehicle_type}
                        {boy.vehicle_number && ` - ${boy.vehicle_number}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Deliveries</span>
                    <span className="font-mono font-bold">{boy.total_deliveries}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-destructive hover:bg-destructive/10"
                    data-testid={`delete-delivery-boy-${boy.id}`}
                    onClick={() => {
                      setSelectedBoy(boy);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              Add Delivery Boy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                data-testid="delivery-boy-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                data-testid="delivery-boy-email-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                data-testid="delivery-boy-phone-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                data-testid="delivery-boy-password-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Type</Label>
              <Input
                id="vehicle"
                data-testid="delivery-boy-vehicle-input"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                placeholder="e.g., Motorcycle, Bicycle, Car"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_number">Vehicle Number</Label>
              <Input
                id="vehicle_number"
                data-testid="delivery-boy-vehicle-number-input"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                placeholder="e.g., ABC-1234"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-delivery-boy-btn"
              onClick={handleSave}
              disabled={saving}
              className="font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Delivery Boy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Delivery Boy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{selectedBoy?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-delivery-boy"
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryBoys;
