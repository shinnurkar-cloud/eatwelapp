import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarRange, Plus, Pencil, Trash2, Loader2, AlertCircle, Upload, Image } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["breakfast", "lunch", "dinner"];

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: "",
    combo_id: "",
    price: 0,
    validity_days: 7,
    image_url: "",
    schedule: DAYS.map(day => ({ day, meals: [] }))
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, combosRes] = await Promise.all([
        axios.get(`${API}/plans`),
        axios.get(`${API}/combos`),
      ]);
      setPlans(plansRes.data);
      setCombos(combosRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Get Cloudinary signature from backend
      const signatureRes = await axios.get(`${API}/cloudinary/signature?folder=plans`);
      const { signature, timestamp, cloud_name, api_key, folder } = signatureRes.data;

      // Step 2: Upload directly to Cloudinary using fetch (to avoid axios Authorization header)
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append("file", file);
      cloudinaryFormData.append("signature", signature);
      cloudinaryFormData.append("timestamp", timestamp);
      cloudinaryFormData.append("api_key", api_key);
      cloudinaryFormData.append("folder", folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        {
          method: "POST",
          body: cloudinaryFormData
        }
      );
      
      if (!uploadRes.ok) {
        throw new Error("Cloudinary upload failed");
      }
      
      const uploadData = await uploadRes.json();

      // Step 3: Save the secure_url from Cloudinary response
      setFormData({ ...formData, image_url: uploadData.secure_url });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleMealToggle = (dayIndex, meal) => {
    const newSchedule = [...formData.schedule];
    const daySchedule = newSchedule[dayIndex];
    
    if (daySchedule.meals.includes(meal)) {
      daySchedule.meals = daySchedule.meals.filter(m => m !== meal);
    } else {
      daySchedule.meals = [...daySchedule.meals, meal];
    }
    
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.combo_id || formData.price <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if at least one meal is scheduled
    const hasMeals = formData.schedule.some(s => s.meals.length > 0);
    if (!hasMeals) {
      toast.error("Please schedule at least one meal");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        schedule: formData.schedule.filter(s => s.meals.length > 0)
      };

      if (selectedPlan) {
        await axios.put(`${API}/plans/${selectedPlan.id}`, payload);
        toast.success("Plan updated");
      } else {
        await axios.post(`${API}/plans`, payload);
        toast.success("Plan created");
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    
    // Rebuild full schedule from plan data
    const fullSchedule = DAYS.map(day => {
      const existing = plan.schedule?.find(s => s.day === day);
      return { day, meals: existing?.meals || [] };
    });
    
    setFormData({
      name: plan.name,
      combo_id: plan.combo_id,
      price: plan.price,
      validity_days: plan.validity_days,
      image_url: plan.image_url || "",
      schedule: fullSchedule
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;

    try {
      await axios.delete(`${API}/plans/${selectedPlan.id}`);
      toast.success("Plan deleted");
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete plan");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPlan(null);
    setFormData({
      name: "",
      combo_id: "",
      price: 0,
      validity_days: 7,
      image_url: "",
      schedule: DAYS.map(day => ({ day, meals: [] }))
    });
  };

  const getMealBadges = (schedule) => {
    const meals = [];
    schedule?.forEach(s => {
      s.meals?.forEach(m => {
        if (!meals.includes(m)) meals.push(m);
      });
    });
    return meals;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="plans-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Subscription Plans</h1>
          <p className="text-muted-foreground mt-1">
            Create meal subscription plans with schedules
          </p>
        </div>
        <Button
          data-testid="add-plan-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase"
          disabled={combos.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {combos.length === 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <p className="text-yellow-500">Create combos first before creating plans.</p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {plans.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Create Plan" to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              data-testid={`plan-card-${plan.id}`}
              className="bg-card border-border hover:border-primary/50 transition-colors duration-300 animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image */}
              <div className="h-32 bg-secondary/30 relative overflow-hidden">
                {plan.image_url ? (
                  <img
                    src={plan.image_url}
                    alt={plan.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CalendarRange className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={`absolute top-2 right-2 ${plan.is_active ? "status-delivered" : "status-cancelled"}`}
                >
                  {plan.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <CardContent className="p-4">
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.combo_name}</p>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="font-mono text-xl font-bold text-green-500">
                    ₹{plan.price.toFixed(0)}
                  </div>
                  <Badge variant="secondary">{plan.validity_days} days</Badge>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {getMealBadges(plan.schedule).map(meal => (
                    <Badge key={meal} variant="outline" className="text-xs capitalize">
                      {meal}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    data-testid={`edit-plan-${plan.id}`}
                    onClick={() => handleEdit(plan)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`delete-plan-${plan.id}`}
                    onClick={() => {
                      setSelectedPlan(plan);
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
        <DialogContent className="glass border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {selectedPlan ? "Edit Plan" : "Create Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  data-testid="plan-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Veg Plan"
                  className="bg-input border-transparent focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>Combo *</Label>
                <Select
                  value={formData.combo_id}
                  onValueChange={(value) => setFormData({ ...formData, combo_id: value })}
                >
                  <SelectTrigger data-testid="plan-combo-select" className="bg-input">
                    <SelectValue placeholder="Select combo" />
                  </SelectTrigger>
                  <SelectContent>
                    {combos.map((combo) => (
                      <SelectItem key={combo.id} value={combo.id}>
                        {combo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  min="0"
                  data-testid="plan-price-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-input border-transparent focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>Validity *</Label>
                <Select
                  value={formData.validity_days.toString()}
                  onValueChange={(value) => setFormData({ ...formData, validity_days: parseInt(value) })}
                >
                  <SelectTrigger data-testid="plan-validity-select" className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Plan Image</Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Image
                </Button>
                {formData.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Meal Schedule *</Label>
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-mono text-muted-foreground">
                  <div>Day</div>
                  <div className="text-center">Breakfast</div>
                  <div className="text-center">Lunch</div>
                  <div className="text-center">Dinner</div>
                </div>
                {formData.schedule.map((daySchedule, dayIndex) => (
                  <div key={daySchedule.day} className="grid grid-cols-4 gap-2 items-center py-2 border-t border-border/50">
                    <div className="text-sm font-medium">{daySchedule.day.slice(0, 3)}</div>
                    {MEALS.map((meal) => (
                      <div key={meal} className="flex justify-center">
                        <Checkbox
                          data-testid={`schedule-${daySchedule.day}-${meal}`}
                          checked={daySchedule.meals.includes(meal)}
                          onCheckedChange={() => handleMealToggle(dayIndex, meal)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-plan-btn"
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
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlan?.name}"? This may affect active subscriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-plan"
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

export default Plans;
