import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Loader2, Phone, MapPin, AlertCircle, Search, Hash } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
    address: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.password.trim() || !formData.address.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/customers`, formData);
      toast.success("Customer added successfully");
      fetchCustomers();
      handleCloseDialog();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ name: "", mobile: "", password: "", address: "" });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_id.toLowerCase().includes(search.toLowerCase()) ||
      c.login_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="customers-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage registered customers
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="search-customers"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-[200px] bg-input"
            />
          </div>
          <Button
            data-testid="add-customer-btn"
            onClick={() => setDialogOpen(true)}
            className="font-bold tracking-wide uppercase"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500/10">
            <Users className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold font-mono">{customers.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">
              {search ? "No customers match your search" : "No customers yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase">
              All Customers ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    data-testid={`customer-card-${customer.id}`}
                    className="p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{customer.name}</p>
                            <Badge variant="outline" className="font-mono text-xs">
                              <Hash className="w-3 h-3 mr-1" />
                              {customer.customer_id}
                            </Badge>
                            {customer.login_id && customer.login_id !== customer.customer_id && (
                              <Badge variant="secondary" className="font-mono text-xs">
                                @{customer.login_id.replace('@', '')}
                              </Badge>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={customer.is_active ? "status-delivered" : "status-cancelled"}
                          >
                            {customer.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{customer.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{customer.address}</span>
                        </div>
                        {customer.zone_name && (
                          <Badge variant="outline" className="w-fit text-accent border-accent/30">
                            {customer.zone_name}
                          </Badge>
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

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              Add Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                data-testid="customer-name-input"
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
                data-testid="customer-mobile-input"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+1 234 567 8900"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                data-testid="customer-password-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                data-testid="customer-address-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full delivery address"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Customer ID will be auto-generated (e.g., CUS0001)
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-customer-btn"
              onClick={handleSave}
              disabled={saving}
              className="font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
