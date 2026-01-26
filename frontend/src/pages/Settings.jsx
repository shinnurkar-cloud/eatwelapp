import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Clock, Phone, Loader2, Save } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    meal_timings: {
      breakfast_start: "03:00",
      breakfast_end: "09:00",
      lunch_start: "09:10",
      lunch_end: "15:00",
      dinner_start: "15:10",
      dinner_end: "21:00",
    },
    help_number: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setFormData({
        meal_timings: response.data.meal_timings || formData.meal_timings,
        help_number: response.data.help_number || "",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success("Settings saved successfully");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateTiming = (key, value) => {
    setFormData({
      ...formData,
      meal_timings: {
        ...formData.meal_timings,
        [key]: value,
      },
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
    <div data-testid="settings-page" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure meal timings and help contact
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Timings */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Order Generation Timings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Breakfast */}
            <div className="space-y-3">
              <h4 className="font-medium text-yellow-500">Breakfast</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    data-testid="breakfast-start"
                    value={formData.meal_timings.breakfast_start}
                    onChange={(e) => updateTiming("breakfast_start", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    data-testid="breakfast-end"
                    value={formData.meal_timings.breakfast_end}
                    onChange={(e) => updateTiming("breakfast_end", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Lunch */}
            <div className="space-y-3">
              <h4 className="font-medium text-orange-500">Lunch</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    data-testid="lunch-start"
                    value={formData.meal_timings.lunch_start}
                    onChange={(e) => updateTiming("lunch_start", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    data-testid="lunch-end"
                    value={formData.meal_timings.lunch_end}
                    onChange={(e) => updateTiming("lunch_end", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Dinner */}
            <div className="space-y-3">
              <h4 className="font-medium text-purple-500">Dinner</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    data-testid="dinner-start"
                    value={formData.meal_timings.dinner_start}
                    onChange={(e) => updateTiming("dinner_start", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    data-testid="dinner-end"
                    value={formData.meal_timings.dinner_end}
                    onChange={(e) => updateTiming("dinner_end", e.target.value)}
                    className="bg-input border-transparent focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Number */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Phone className="w-5 h-5 text-accent" />
              Help Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="help_number">Help Phone Number</Label>
              <Input
                id="help_number"
                data-testid="help-number-input"
                value={formData.help_number}
                onChange={(e) => setFormData({ ...formData, help_number: e.target.value })}
                placeholder="+1 234 567 8900"
                className="bg-input border-transparent focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                This number will be visible to customers in the app
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          data-testid="save-settings-btn"
          onClick={handleSave}
          disabled={saving}
          className="font-bold tracking-wide uppercase"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
