import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { MapPin, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Mock map component (replace with Google Maps when API key is available)
const MockMap = ({ zones, selectedZone, onZoneClick, onMapClick, isDrawing }) => {
  const canvasRef = useRef(null);
  const [drawingPoints, setDrawingPoints] = useState([]);

  useEffect(() => {
    drawMap();
  }, [zones, selectedZone, drawingPoints]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Background
    ctx.fillStyle = "#18181B";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw zones
    zones.forEach((zone) => {
      if (zone.polygon && zone.polygon.length > 2) {
        drawPolygon(ctx, zone.polygon, zone.id === selectedZone?.id, canvas);
      }
    });

    // Draw current drawing
    if (drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#FF4F00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const firstPoint = convertToCanvas(drawingPoints[0], canvas);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      drawingPoints.slice(1).forEach((point) => {
        const canvasPoint = convertToCanvas(point, canvas);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      drawingPoints.forEach((point) => {
        const canvasPoint = convertToCanvas(point, canvas);
        ctx.beginPath();
        ctx.fillStyle = "#FF4F00";
        ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const convertToCanvas = (coords, canvas) => {
    // Simple conversion for demo - assumes coords are in range [-74.1, -73.9] for lng and [40.6, 40.9] for lat
    const lng = coords[0];
    const lat = coords[1];
    const x = ((lng + 74.1) / 0.2) * canvas.width;
    const y = ((40.9 - lat) / 0.3) * canvas.height;
    return { x, y };
  };

  const convertFromCanvas = (x, y, canvas) => {
    const lng = (x / canvas.width) * 0.2 - 74.1;
    const lat = 40.9 - (y / canvas.height) * 0.3;
    return [lng, lat];
  };

  const drawPolygon = (ctx, polygon, isSelected, canvas) => {
    if (polygon.length < 3) return;

    ctx.beginPath();
    const firstPoint = convertToCanvas(polygon[0], canvas);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    polygon.slice(1).forEach((point) => {
      const canvasPoint = convertToCanvas(point, canvas);
      ctx.lineTo(canvasPoint.x, canvasPoint.y);
    });

    ctx.closePath();
    ctx.fillStyle = isSelected ? "rgba(255, 79, 0, 0.3)" : "rgba(0, 122, 255, 0.2)";
    ctx.fill();
    ctx.strokeStyle = isSelected ? "#FF4F00" : "#007AFF";
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
  };

  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coords = convertFromCanvas(x, y, canvas);

    setDrawingPoints([...drawingPoints, coords]);
  };

  const handleDoubleClick = () => {
    if (drawingPoints.length >= 3) {
      onMapClick(drawingPoints);
      setDrawingPoints([]);
    }
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
      />
      {isDrawing && (
        <div className="absolute top-4 left-4 glass rounded-lg p-4 max-w-xs">
          <p className="text-sm font-medium text-primary">Drawing Mode</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to add points. Double-click to complete the zone.
            {drawingPoints.length > 0 && ` (${drawingPoints.length} points)`}
          </p>
        </div>
      )}
      <div className="absolute bottom-4 right-4 glass rounded-lg px-3 py-2">
        <p className="text-xs font-mono text-muted-foreground">
          Mock Map • New York Area
        </p>
      </div>
    </div>
  );
};

const DeliveryZones = () => {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    delivery_fee: 0,
    is_active: true,
    polygon: [],
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data);
    } catch (error) {
      toast.error("Failed to fetch delivery zones");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (polygon) => {
    setFormData({ ...formData, polygon });
    setIsDrawing(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    if (formData.polygon.length < 3) {
      toast.error("Draw at least 3 points to create a zone");
      return;
    }

    setSaving(true);
    try {
      if (selectedZone) {
        await axios.put(`${API}/zones/${selectedZone.id}`, formData);
        toast.success("Zone updated successfully");
      } else {
        await axios.post(`${API}/zones`, formData);
        toast.success("Zone created successfully");
      }
      fetchZones();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;

    try {
      await axios.delete(`${API}/zones/${selectedZone.id}`);
      toast.success("Zone deleted successfully");
      fetchZones();
      setSelectedZone(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete zone");
    }
  };

  const handleEdit = (zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || "",
      delivery_fee: zone.delivery_fee || 0,
      is_active: zone.is_active,
      polygon: zone.polygon || [],
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedZone(null);
    setFormData({
      name: "",
      description: "",
      delivery_fee: 0,
      is_active: true,
      polygon: [],
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
    <div data-testid="delivery-zones-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Delivery Zones</h1>
          <p className="text-muted-foreground mt-1">
            Manage geo-fenced delivery areas
          </p>
        </div>
        <Button
          data-testid="draw-zone-btn"
          onClick={() => setIsDrawing(!isDrawing)}
          className="font-bold tracking-wide uppercase"
        >
          {isDrawing ? (
            <>Cancel Drawing</>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Draw New Zone
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Zone Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MockMap
                zones={zones}
                selectedZone={selectedZone}
                onZoneClick={setSelectedZone}
                onMapClick={handleMapClick}
                isDrawing={isDrawing}
              />
            </CardContent>
          </Card>
        </div>

        {/* Zone List */}
        <div>
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold tracking-tight uppercase">
                All Zones ({zones.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p>No zones created</p>
                  <p className="text-sm mt-1">Click "Draw New Zone" to start</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {zones.map((zone) => (
                      <div
                        key={zone.id}
                        data-testid={`zone-item-${zone.id}`}
                        className={`p-4 rounded-lg cursor-pointer transition-colors duration-200 ${
                          selectedZone?.id === zone.id
                            ? "bg-primary/20 border border-primary"
                            : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                        }`}
                        onClick={() => setSelectedZone(zone)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{zone.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Fee: ${zone.delivery_fee?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              zone.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            data-testid={`edit-zone-${zone.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(zone);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            data-testid={`delete-zone-${zone.id}`}
                            className="text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedZone(zone);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {selectedZone ? "Edit Zone" : "Create New Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Zone Name</Label>
              <Input
                id="name"
                data-testid="zone-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downtown Area"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="zone-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Delivery Fee ($)</Label>
              <Input
                id="fee"
                type="number"
                step="0.01"
                data-testid="zone-fee-input"
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                className="bg-input border-transparent focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                data-testid="zone-active-switch"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                Points: {formData.polygon.length}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              data-testid="save-zone-btn"
              onClick={handleSave}
              disabled={saving}
              className="font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedZone?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-zone"
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

export default DeliveryZones;
