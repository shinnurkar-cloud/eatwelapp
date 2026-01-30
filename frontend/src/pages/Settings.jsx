import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Clock, Phone, Loader2, Save, Lock, Key, Eye, EyeOff } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    master: false,
    resetNew: false,
    resetConfirm: false,
  });
  const [formData, setFormData] = useState({
    meal_timings: {
      breakfast_start: "03:00",
      breakfast_end: "09:00",
      lunch_start: "09:10",
      lunch_end: "15:00",
      dinner_start: "17:00",
      dinner_end: "21:00",
    },
    help_number: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [masterResetData, setMasterResetData] = useState({
    master_password: "",
    new_password: "",
    confirm_password: "",
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

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(`${API}/auth/change-password`, passwordData);
      toast.success("Password changed successfully");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleMasterReset = async () => {
    if (masterResetData.new_password !== masterResetData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    if (masterResetData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResettingPassword(true);
    try {
      await axios.post(`${API}/auth/master-reset-password`, masterResetData);
      toast.success("Password reset successfully");
      setMasterResetData({ master_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reset password");
    } finally {
      setResettingPassword(false);
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

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
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
          Configure meal timings, help contact, and security
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
                placeholder="+91 98765 43210"
                className="bg-input border-transparent focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                This number will be visible to customers in the app
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-500" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  data-testid="current-password-input"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  className="bg-input border-transparent focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  data-testid="new-password-input"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password (min 6 chars)"
                  className="bg-input border-transparent focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  data-testid="confirm-password-input"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  className="bg-input border-transparent focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              data-testid="change-password-btn"
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.current_password || !passwordData.new_password}
              className="w-full font-bold tracking-wide uppercase bg-green-600 hover:bg-green-700"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Master Reset Password */}
        <Card className="bg-card border-border border-amber-500/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Master Password Reset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              Use this option if you forgot your current password. Requires the master password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="master_password">Master Password</Label>
              <div className="relative">
                <Input
                  id="master_password"
                  data-testid="master-password-input"
                  type={showPasswords.master ? "text" : "password"}
                  value={masterResetData.master_password}
                  onChange={(e) => setMasterResetData({ ...masterResetData, master_password: e.target.value })}
                  placeholder="Enter master password"
                  className="bg-input border-transparent focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("master")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.master ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset_new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="reset_new_password"
                  data-testid="reset-new-password-input"
                  type={showPasswords.resetNew ? "text" : "password"}
                  value={masterResetData.new_password}
                  onChange={(e) => setMasterResetData({ ...masterResetData, new_password: e.target.value })}
                  placeholder="Enter new password"
                  className="bg-input border-transparent focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("resetNew")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.resetNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset_confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="reset_confirm_password"
                  data-testid="reset-confirm-password-input"
                  type={showPasswords.resetConfirm ? "text" : "password"}
                  value={masterResetData.confirm_password}
                  onChange={(e) => setMasterResetData({ ...masterResetData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  className="bg-input border-transparent focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("resetConfirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.resetConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              data-testid="master-reset-btn"
              onClick={handleMasterReset}
              disabled={resettingPassword || !masterResetData.master_password || !masterResetData.new_password}
              className="w-full font-bold tracking-wide uppercase bg-amber-600 hover:bg-amber-700"
            >
              {resettingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Key className="w-4 h-4 mr-2" />
              )}
              Reset with Master Password
            </Button>
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
