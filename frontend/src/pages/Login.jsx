import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_5b457f8b-21e9-4fcb-ab01-881f7858e8c3/artifacts/cjqtf2uz_Gemini_Generated_Image_yx04ezyx04ezyx04-removebg-preview%20%281%29.png";
const LORD_IMAGE_URL = "https://customer-assets.emergentagent.com/job_5b457f8b-21e9-4fcb-ab01-881f7858e8c3/artifacts/dlbfx1dt_download.jpg";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [helpNumber, setHelpNumber] = useState("");
  const [formData, setFormData] = useState({
    loginId: "",
    password: "",
  });
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch help number for WhatsApp support
    const fetchHelpNumber = async () => {
      try {
        const response = await axios.get(`${API}/customer/settings`);
        setHelpNumber(response.data.help_number || "");
      } catch (error) {
        console.error("Error fetching help number:", error);
      }
    };
    fetchHelpNumber();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(formData.loginId, formData.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openWhatsApp = () => {
    if (helpNumber) {
      // Remove any non-numeric characters except +
      const cleanNumber = helpNumber.replace(/[^\d+]/g, "");
      const message = encodeURIComponent("Hi, I need help with my EATWEL login.");
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank");
    } else {
      toast.error("Help number not configured");
    }
  };

  return (
    <div className="min-h-screen bg-orange-500 flex">
      {/* Left Side - Lord Image */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        
        {/* Lord Sharanabasweshwara Image */}
        <div className="relative z-10 mb-8">
          <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/50 shadow-2xl shadow-black/20">
            <img 
              src={LORD_IMAGE_URL} 
              alt="Lord Sharanabasweshwara" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            ॐ श्री गुरवे नमः
          </div>
        </div>
        
        {/* Spacer */}
        <div className="h-4"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-xl shadow-black/20 mb-4">
              <img 
                src={LOGO_URL} 
                alt="Eatwel Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">EATWEL</h1>
            <p className="text-white/80 font-medium text-sm mt-1">
              Stay Healthy
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-xl border-orange-200 shadow-2xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-orange-900">Admin Login</CardTitle>
              <CardDescription className="text-orange-700/70">
                Enter your credentials to access the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginId" className="text-orange-800">Login ID</Label>
                  <Input
                    id="loginId"
                    name="loginId"
                    data-testid="login-id-input"
                    placeholder="admin"
                    value={formData.loginId}
                    onChange={handleChange}
                    required
                    className="bg-orange-50 border-orange-200 text-orange-900 placeholder:text-orange-400 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-orange-800">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      data-testid="password-input"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="bg-orange-50 border-orange-200 text-orange-900 placeholder:text-orange-400 focus:border-orange-500 focus:ring-orange-500/20 pr-10"
                    />
                    <button
                      type="button"
                      data-testid="toggle-password-btn"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="submit-btn"
                  className="w-full h-11 font-bold tracking-wide uppercase bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo credentials */}
          <p className="text-center text-xs text-white/70 mt-6 font-mono animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Default: admin / admin123
          </p>

          {/* Mobile Lord Image */}
          <div className="lg:hidden mt-8 flex justify-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-400/30">
              <img 
                src={LORD_IMAGE_URL} 
                alt="Lord Sharanabasweshwara" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
