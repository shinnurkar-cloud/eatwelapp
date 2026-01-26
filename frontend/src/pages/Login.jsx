import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        if (user.role !== "admin") {
          toast.error("Access denied. Admin login only.");
          return;
        }
        toast.success(`Welcome back, ${user.name}!`);
      } else {
        await register({
          ...formData,
          role: "admin",
        });
        toast.success("Account created successfully!");
      }
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary glow-primary mb-4">
            <MapPin className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">ZONEBITE</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            ADMIN DASHBOARD
          </p>
        </div>

        <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Enter your credentials to access the dashboard"
                : "Sign up for a new admin account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      data-testid="name-input"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="bg-input border-transparent focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      data-testid="phone-input"
                      placeholder="+1 234 567 8900"
                      value={formData.phone}
                      onChange={handleChange}
                      className="bg-input border-transparent focus:border-primary"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="email-input"
                  placeholder="admin@zonebite.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-input border-transparent focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                    className="bg-input border-transparent focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    data-testid="toggle-password-btn"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="submit-btn"
                className="w-full h-11 font-bold tracking-wide uppercase"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                data-testid="toggle-auth-mode-btn"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Need an account? " : "Already have an account? "}
                <span className="font-semibold text-primary">
                  {isLogin ? "Sign up" : "Sign in"}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-mono animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Create a new admin account to get started
        </p>
      </div>
    </div>
  );
};

export default Login;
