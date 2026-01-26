import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UtensilsCrossed, Plus, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Combos = () => {
  const [combos, setCombos] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [dishes, setDishes] = useState([]);
  const [newDish, setNewDish] = useState("");

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      const response = await axios.get(`${API}/combos`);
      setCombos(response.data);
    } catch (error) {
      toast.error("Failed to fetch combos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDish = () => {
    if (newDish.trim()) {
      setDishes([...dishes, newDish.trim()]);
      setNewDish("");
    }
  };

  const handleRemoveDish = (index) => {
    setDishes(dishes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Combo name is required");
      return;
    }
    if (dishes.length === 0) {
      toast.error("Add at least one dish");
      return;
    }

    setSaving(true);
    try {
      if (selectedCombo) {
        await axios.put(`${API}/combos/${selectedCombo.id}`, { name, dishes });
        toast.success("Combo updated");
      } else {
        await axios.post(`${API}/combos`, { name, dishes });
        toast.success("Combo created");
      }
      fetchCombos();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save combo");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (combo) => {
    setSelectedCombo(combo);
    setName(combo.name);
    setDishes(combo.dishes || []);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCombo) return;

    try {
      await axios.delete(`${API}/combos/${selectedCombo.id}`);
      toast.success("Combo deleted");
      fetchCombos();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete combo");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCombo(null);
    setName("");
    setDishes([]);
    setNewDish("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="combos-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Combos</h1>
          <p className="text-muted-foreground mt-1">
            Manage meal combos with multiple dishes
          </p>
        </div>
        <Button
          data-testid="add-combo-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Combo
        </Button>
      </div>

      {/* List */}
      {combos.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No combos yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Create Combo" to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((combo, index) => (
            <Card
              key={combo.id}
              data-testid={`combo-card-${combo.id}`}
              className="bg-card border-border hover:border-primary/50 transition-colors duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{combo.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {combo.dishes?.length || 0} dishes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {combo.dishes?.map((dish, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {dish}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    data-testid={`edit-combo-${combo.id}`}
                    onClick={() => handleEdit(combo)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`delete-combo-${combo.id}`}
                    onClick={() => {
                      setSelectedCombo(combo);
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
              {selectedCombo ? "Edit Combo" : "Create Combo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Combo Name *</Label>
              <Input
                id="name"
                data-testid="combo-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Veg Combo 1"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>Dishes *</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="new-dish-input"
                  value={newDish}
                  onChange={(e) => setNewDish(e.target.value)}
                  placeholder="Add a dish"
                  className="bg-input border-transparent focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDish())}
                />
                <Button
                  type="button"
                  data-testid="add-dish-btn"
                  onClick={handleAddDish}
                  variant="secondary"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {dishes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dishes.map((dish, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="pr-1 flex items-center gap-1"
                    >
                      {dish}
                      <button
                        type="button"
                        onClick={() => handleRemoveDish(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-combo-btn"
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
            <AlertDialogTitle>Delete Combo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCombo?.name}"? This may affect existing plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-combo"
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

export default Combos;
