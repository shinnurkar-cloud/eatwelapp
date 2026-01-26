import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { UtensilsCrossed, Plus, Pencil, Trash2, Loader2, DollarSign, AlertCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categories = [
  "Appetizers",
  "Main Course",
  "Desserts",
  "Beverages",
  "Sides",
  "Specials",
];

const initialFormData = {
  restaurant_id: "",
  name: "",
  description: "",
  price: 0,
  category: "",
  image_url: "",
  is_available: true,
};

const MenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, restaurantsRes] = await Promise.all([
        axios.get(`${API}/menu-items`),
        axios.get(`${API}/restaurants`),
      ]);
      setMenuItems(itemsRes.data);
      setRestaurants(restaurantsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    if (filterRestaurant !== "all" && item.restaurant_id !== filterRestaurant) return false;
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    return true;
  });

  const getRestaurantName = (id) => {
    return restaurants.find((r) => r.id === id)?.name || "Unknown";
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.restaurant_id || !formData.category || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (selectedItem) {
        await axios.put(`${API}/menu-items/${selectedItem.id}`, formData);
        toast.success("Menu item updated successfully");
      } else {
        await axios.post(`${API}/menu-items`, formData);
        toast.success("Menu item created successfully");
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await axios.delete(`${API}/menu-items/${selectedItem.id}`);
      toast.success("Menu item deleted successfully");
      fetchData();
      setSelectedItem(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete menu item");
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      restaurant_id: item.restaurant_id,
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category,
      image_url: item.image_url || "",
      is_available: item.is_available,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
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
    <div data-testid="menu-items-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Menu Items</h1>
          <p className="text-muted-foreground mt-1">
            Manage restaurant menu items
          </p>
        </div>
        <Button
          data-testid="add-menu-item-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase"
          disabled={restaurants.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground mb-1 block">Restaurant</Label>
              <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
                <SelectTrigger data-testid="filter-restaurant" className="w-full sm:w-[200px] bg-input">
                  <SelectValue placeholder="All Restaurants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger data-testid="filter-category" className="w-full sm:w-[200px] bg-input">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No menu items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {restaurants.length === 0
                ? "Create a restaurant first"
                : "Click 'Add Item' to create menu items"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item, index) => (
            <Card
              key={item.id}
              data-testid={`menu-item-card-${item.id}`}
              className="bg-card border-border hover:border-primary/50 transition-colors duration-300 animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Image */}
              <div className="h-32 bg-secondary/30 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={`absolute top-2 right-2 ${
                    item.is_available ? "status-delivered" : "status-cancelled"
                  }`}
                >
                  {item.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>

              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getRestaurantName(item.restaurant_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-green-500/10 text-green-500 px-2 py-1 rounded font-mono text-sm font-bold">
                    <DollarSign className="w-3 h-3" />
                    {item.price.toFixed(2)}
                  </div>
                </div>

                <Badge variant="secondary" className="mt-2 text-xs">
                  {item.category}
                </Badge>

                {item.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-8 text-xs"
                    data-testid={`edit-menu-item-${item.id}`}
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-destructive hover:bg-destructive/10"
                    data-testid={`delete-menu-item-${item.id}`}
                    onClick={() => {
                      setSelectedItem(item);
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {selectedItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Restaurant *</Label>
              <Select
                value={formData.restaurant_id}
                onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
              >
                <SelectTrigger data-testid="menu-item-restaurant-select" className="bg-input">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                data-testid="menu-item-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Margherita Pizza"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="menu-item-category-select" className="bg-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                data-testid="menu-item-price-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="menu-item-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the dish"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                data-testid="menu-item-image-input"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Available</Label>
              <Switch
                data-testid="menu-item-available-switch"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-menu-item-btn"
              onClick={handleSave}
              disabled={saving}
              className="font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-menu-item"
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

export default MenuItems;
