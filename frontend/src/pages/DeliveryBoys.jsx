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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bike, Plus, Trash2, Loader2, Phone, MapPin, AlertCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initialFormData = {
  name: "",
  mobile: "",
  login_id: "",
  password: "",
};

const DeliveryBoys = () => {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedBoy, setSelectedBoy] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedZones, setSelectedZones] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [boysRes, zonesRes] = await Promise.all([
        axios.get(`${API}/delivery-boys`),
        axios.get(`${API}/zones`),
      ]);
      setDeliveryBoys(boysRes.data);
      setZones(zonesRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.login_id.trim() || !formData.password.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/delivery-boys`, {
        ...formData,
        role: "delivery_boy"
      });
      toast.success("Delivery boy added successfully");
      fetchData();
      handleCloseDialog();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (boy) => {
    try {
      await axios.put(`${API}/delivery-boys/${boy.id}/status?is_active=${!boy.is_active}`);
      toast.success(`${boy.name} ${!boy.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleAssignZones = async () => {
    if (!selectedBoy) return;
    
    try {
      await axios.put(`${API}/delivery-boys/${selectedBoy.id}/zones`, selectedZones);
      toast.success("Zones assigned successfully");
      fetchData();
      setZoneDialogOpen(false);
    } catch (error) {
      toast.error("Failed to assign zones");
    }
  };

  const handleDelete = async () => {
    if (!selectedBoy) return;

    try {
      await axios.delete(`${API}/delivery-boys/${selectedBoy.id}`);
      toast.success("Delivery boy deleted");
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
  };

  const openZoneDialog = (boy) => {
    setSelectedBoy(boy);
    setSelectedZones(boy.assigned_zones || []);
    setZoneDialogOpen(true);
  };

  const getZoneNames = (zoneIds) => {
    return zoneIds
      .map((id) => zones.find((z) => z.id === id)?.name)
      .filter(Boolean)
      .join(", ");
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
            Manage delivery personnel and zone assignments
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

      {/* List */}
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
                        className={boy.is_active ? "status-delivered" : "status-cancelled"}
                      >
                        {boy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    data-testid={`toggle-status-${boy.id}`}
                    checked={boy.is_active}
                    onCheckedChange={() => handleToggleStatus(boy)}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{boy.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">ID: {boy.login_id}</span>
                  </div>
                  {boy.assigned_zones?.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span className="text-accent">{getZoneNames(boy.assigned_zones)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    data-testid={`assign-zones-${boy.id}`}
                    onClick={() => openZoneDialog(boy)}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Assign Zones
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`delete-delivery-boy-${boy.id}`}
                    onClick={() => {
                      setSelectedBoy(boy);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
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
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                data-testid="delivery-boy-mobile-input"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+1 234 567 8900"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login_id">Login ID *</Label>
              <Input
                id="login_id"
                data-testid="delivery-boy-login-input"
                value={formData.login_id}
                onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
                placeholder="delivery01"
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Assignment Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              Assign Zones to {selectedBoy?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {zones.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No zones created yet. Create zones first.
              </p>
            ) : (
              <div className="space-y-2">
                {zones.map((zone) => (
                  <label
                    key={zone.id}
                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedZones.includes(zone.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedZones([...selectedZones, zone.id]);
                        } else {
                          setSelectedZones(selectedZones.filter((id) => id !== zone.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{zone.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setZoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="save-zone-assignment-btn"
              onClick={handleAssignZones}
              className="font-bold"
              disabled={zones.length === 0}
            >
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Boy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBoy?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-delivery-boy"
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryBoys;
