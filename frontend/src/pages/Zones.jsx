import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MapPin, Plus, Pencil, Trash2, Loader2, AlertCircle, Users } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Libraries for Google Maps
const libraries = ["drawing", "geometry"];

// Default center (Bangalore, India)
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "8px",
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: "all",
      elementType: "geometry",
      stylers: [{ color: "#242f3e" }],
    },
    {
      featureType: "all",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#242f3e" }],
    },
    {
      featureType: "all",
      elementType: "labels.text.fill",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
  ],
};

// Drawing manager options
const drawingManagerOptions = {
  drawingControl: false,
  polygonOptions: {
    fillColor: "#FF4F00",
    fillOpacity: 0.3,
    strokeColor: "#FF4F00",
    strokeWeight: 2,
    clickable: true,
    editable: true,
    draggable: true,
  },
};

const Zones = () => {
  const [zones, setZones] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [formData, setFormData] = useState({
    name: "",
    polygon: [],
    assigned_delivery_boys: [],
  });

  const mapRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const currentPolygonRef = useRef(null);

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [zonesRes, boysRes] = await Promise.all([
        axios.get(`${API}/zones`),
        axios.get(`${API}/delivery-boys`),
      ]);
      setZones(zonesRes.data);
      setDeliveryBoys(boysRes.data);

      // Center map on first zone if exists
      if (zonesRes.data.length > 0 && zonesRes.data[0].polygon?.length > 0) {
        const firstPolygon = zonesRes.data[0].polygon;
        const centerLat = firstPolygon.reduce((sum, p) => sum + p[1], 0) / firstPolygon.length;
        const centerLng = firstPolygon.reduce((sum, p) => sum + p[0], 0) / firstPolygon.length;
        setMapCenter({ lat: centerLat, lng: centerLng });
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager) => {
    drawingManagerRef.current = drawingManager;
  }, []);

  const handlePolygonComplete = useCallback((polygon) => {
    // Get polygon path
    const path = polygon.getPath();
    const coordinates = [];
    
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }

    // Close the polygon
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    // Store reference to current polygon for editing
    currentPolygonRef.current = polygon;

    // Update form data and open dialog
    setFormData((prev) => ({ ...prev, polygon: coordinates }));
    setIsDrawing(false);
    setDialogOpen(true);

    // Add listener for polygon path changes
    polygon.getPath().addListener("set_at", () => {
      updatePolygonCoordinates(polygon);
    });
    polygon.getPath().addListener("insert_at", () => {
      updatePolygonCoordinates(polygon);
    });
  }, []);

  const updatePolygonCoordinates = (polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }
    
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }
    
    setFormData((prev) => ({ ...prev, polygon: coordinates }));
  };

  const startDrawing = () => {
    setIsDrawing(true);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
    if (currentPolygonRef.current) {
      currentPolygonRef.current.setMap(null);
      currentPolygonRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    if (formData.polygon.length < 4) {
      toast.error("Draw at least 3 points");
      return;
    }

    setSaving(true);
    try {
      if (selectedZone) {
        await axios.put(`${API}/zones/${selectedZone.id}`, formData);
        toast.success("Zone updated");
      } else {
        await axios.post(`${API}/zones`, formData);
        toast.success("Zone created");
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      polygon: zone.polygon || [],
      assigned_delivery_boys: zone.assigned_delivery_boys || [],
    });
    setDialogOpen(true);

    // Center map on zone
    if (zone.polygon?.length > 0) {
      const centerLat = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;
      const centerLng = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
      setMapCenter({ lat: centerLat, lng: centerLng });
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;

    try {
      await axios.delete(`${API}/zones/${selectedZone.id}`);
      toast.success("Zone deleted");
      fetchData();
      setSelectedZone(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete zone");
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedZone(null);
    setFormData({ name: "", polygon: [], assigned_delivery_boys: [] });
    if (currentPolygonRef.current) {
      currentPolygonRef.current.setMap(null);
      currentPolygonRef.current = null;
    }
  };

  const toggleDeliveryBoy = (boyId) => {
    const current = formData.assigned_delivery_boys;
    if (current.includes(boyId)) {
      setFormData({ ...formData, assigned_delivery_boys: current.filter((id) => id !== boyId) });
    } else {
      setFormData({ ...formData, assigned_delivery_boys: [...current, boyId] });
    }
  };

  const getDeliveryBoyNames = (ids) => {
    return ids
      .map((id) => deliveryBoys.find((b) => b.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (zone.polygon?.length > 0) {
      const centerLat = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;
      const centerLng = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
      if (mapRef.current) {
        mapRef.current.panTo({ lat: centerLat, lng: centerLng });
        mapRef.current.setZoom(14);
      }
    }
  };

  // Convert [lng, lat] to {lat, lng} for Google Maps
  const convertToGooglePath = (polygon) => {
    if (!polygon || polygon.length === 0) return [];
    return polygon.map((point) => ({ lat: point[1], lng: point[0] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>Error loading Google Maps</p>
        <p className="text-sm text-muted-foreground mt-2">{loadError.message}</p>
      </div>
    );
  }

  return (
    <div data-testid="zones-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Delivery Zones</h1>
          <p className="text-muted-foreground mt-1">Draw and manage delivery zones on the map</p>
        </div>
        <Button
          data-testid="draw-zone-btn"
          onClick={isDrawing ? cancelDrawing : startDrawing}
          className="font-bold tracking-wide uppercase"
          variant={isDrawing ? "destructive" : "default"}
        >
          {isDrawing ? (
            "Cancel Drawing"
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
              {isLoaded ? (
                <div className="relative">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={12}
                    options={mapOptions}
                    onLoad={onMapLoad}
                  >
                    {/* Drawing Manager */}
                    <DrawingManager
                      onLoad={onDrawingManagerLoad}
                      onPolygonComplete={handlePolygonComplete}
                      options={drawingManagerOptions}
                    />

                    {/* Existing Zones */}
                    {zones.map((zone) => (
                      <Polygon
                        key={zone.id}
                        paths={convertToGooglePath(zone.polygon)}
                        options={{
                          fillColor: selectedZone?.id === zone.id ? "#FF4F00" : "#007AFF",
                          fillOpacity: selectedZone?.id === zone.id ? 0.4 : 0.2,
                          strokeColor: selectedZone?.id === zone.id ? "#FF4F00" : "#007AFF",
                          strokeWeight: selectedZone?.id === zone.id ? 3 : 2,
                          clickable: true,
                        }}
                        onClick={() => handleZoneClick(zone)}
                      />
                    ))}
                  </GoogleMap>

                  {isDrawing && (
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-xs border border-primary">
                      <p className="text-sm font-medium text-primary">Drawing Mode Active</p>
                      <p className="text-xs text-gray-300 mt-1">
                        Click on the map to add points. Click on the first point to close the
                        polygon.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[450px] bg-secondary/30 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
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
                  <p className="text-sm mt-1">Click "Draw New Zone"</p>
                </div>
              ) : (
                <ScrollArea className="h-[380px]">
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
                        onClick={() => handleZoneClick(zone)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{zone.name}</p>
                            {zone.assigned_delivery_boys?.length > 0 && (
                              <p className="text-xs text-accent mt-1">
                                <Users className="w-3 h-3 inline mr-1" />
                                {getDeliveryBoyNames(zone.assigned_delivery_boys)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {zone.polygon?.length - 1 || 0} points
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
                            className="text-destructive hover:bg-destructive/10"
                            data-testid={`delete-zone-${zone.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedZone(zone);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
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
        <DialogContent className="glass border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">
              {selectedZone ? "Edit Zone" : "Create Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Zone Name *</Label>
              <Input
                id="name"
                data-testid="zone-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Zone A - Downtown"
                className="bg-input border-transparent focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Delivery Boys</Label>
              <div className="bg-secondary/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                {deliveryBoys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No delivery boys available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {deliveryBoys
                      .filter((b) => b.is_active)
                      .map((boy) => (
                        <label
                          key={boy.id}
                          className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.assigned_delivery_boys.includes(boy.id)}
                            onCheckedChange={() => toggleDeliveryBoy(boy.id)}
                          />
                          <span className="text-sm">{boy.name}</span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                Polygon Points: {formData.polygon.length > 0 ? formData.polygon.length - 1 : 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button data-testid="save-zone-btn" onClick={handleSave} disabled={saving} className="font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
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
              Are you sure you want to delete "{selectedZone?.name}"?
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

export default Zones;
