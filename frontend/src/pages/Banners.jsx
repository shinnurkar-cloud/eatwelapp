import { useState, useEffect, useRef } from "react";
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
import { Image, Plus, Pencil, Trash2, Loader2, AlertCircle, Upload, GripVertical } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initialFormData = {
  title: "",
  image_url: "",
  link_url: "",
  is_active: true,
  order: 0,
};

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners`);
      setBanners(response.data);
    } catch (error) {
      toast.error("Failed to fetch banners");
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
      const signatureRes = await axios.get(`${API}/cloudinary/signature?folder=banners`);
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

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.image_url) {
      toast.error("Title and image are required");
      return;
    }

    setSaving(true);
    try {
      if (selectedBanner) {
        await axios.put(`${API}/banners/${selectedBanner.id}`, formData);
        toast.success("Banner updated");
      } else {
        await axios.post(`${API}/banners`, {
          ...formData,
          order: banners.length
        });
        toast.success("Banner created");
      }
      fetchBanners();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      is_active: banner.is_active,
      order: banner.order,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedBanner) return;

    try {
      await axios.delete(`${API}/banners/${selectedBanner.id}`);
      toast.success("Banner deleted");
      fetchBanners();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await axios.put(`${API}/banners/${banner.id}`, {
        ...banner,
        is_active: !banner.is_active
      });
      toast.success(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
      fetchBanners();
    } catch (error) {
      toast.error("Failed to update banner");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBanner(null);
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
    <div data-testid="banners-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Banners</h1>
          <p className="text-muted-foreground mt-1">
            Manage auto-sliding banners for customer app
          </p>
        </div>
        <Button
          data-testid="add-banner-btn"
          onClick={() => setDialogOpen(true)}
          className="font-bold tracking-wide uppercase bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Banner Preview */}
      {banners.filter(b => b.is_active).length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Preview (Active Banners)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {banners.filter(b => b.is_active).map((banner) => (
                <div key={banner.id} className="flex-shrink-0 w-64 h-32 rounded-lg overflow-hidden relative">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-sm font-medium truncate">{banner.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner List */}
      {banners.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">No banners yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add banners to show on customer app home screen
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner, index) => (
            <Card
              key={banner.id}
              data-testid={`banner-card-${banner.id}`}
              className="bg-card border-border hover:border-orange-500/50 transition-colors duration-300 animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image */}
              <div className="h-40 bg-secondary/30 relative overflow-hidden">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    #{banner.order + 1}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={`absolute top-2 right-2 ${banner.is_active ? "status-delivered" : "status-cancelled"}`}
                >
                  {banner.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{banner.title}</h3>
                    {banner.link_url && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        Link: {banner.link_url}
                      </p>
                    )}
                  </div>
                  <Switch
                    data-testid={`toggle-banner-${banner.id}`}
                    checked={banner.is_active}
                    onCheckedChange={() => handleToggleActive(banner)}
                  />
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    data-testid={`edit-banner-${banner.id}`}
                    onClick={() => handleEdit(banner)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`delete-banner-${banner.id}`}
                    onClick={() => {
                      setSelectedBanner(banner);
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
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {selectedBanner ? "Edit Banner" : "Add Banner"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Banner Title *</Label>
              <Input
                id="title"
                data-testid="banner-title-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Special Offer!"
                className="bg-input border-border focus:border-orange-500"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Banner Image *</Label>
              <div className="space-y-3">
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
                  className="w-full"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Image
                </Button>
                {formData.image_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-secondary">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link URL (Optional)</Label>
              <Input
                id="link"
                data-testid="banner-link-input"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://..."
                className="bg-input border-border focus:border-orange-500"
              />
              <p className="text-xs text-muted-foreground">
                Where to navigate when banner is tapped
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                min="0"
                data-testid="banner-order-input"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="bg-input border-border focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                data-testid="banner-active-switch"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-banner-btn"
              onClick={handleSave}
              disabled={saving}
              className="font-bold bg-orange-600 hover:bg-orange-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBanner?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-banner"
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

export default Banners;
