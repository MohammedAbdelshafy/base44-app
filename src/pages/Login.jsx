import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Mail, Lock, Loader2, Shield, Briefcase, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { getHomeRoute } from "@/lib/roles";

const TAB_CONFIG = {
  admin: {
    icon: Shield,
    label: "Admin",
    labelAr: "مدير",
    description: "Full system access — Dashboard, Users, Reports",
    descriptionAr: "صلاحيات كاملة — لوحة التحكم، المستخدمين، التقارير",
    color: "bg-navy",
  },
  employee: {
    icon: Briefcase,
    label: "Employee",
    labelAr: "موظف",
    description: "Operations access — Buildings, Pickups, Payments",
    descriptionAr: "صلاحيات عمليات — المباني، الجمع، المدفوعات",
    color: "bg-cyan",
  },
  consumer: {
    icon: User,
    label: "Consumer",
    labelAr: "عميل",
    description: "Building owner — View your building & pickups",
    descriptionAr: "مالك مبنى — عرض مبنىك ومواعيد الجمع",
    color: "bg-green",
  },
};

export default function Login() {
  const [activeTab, setActiveTab] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { checkUserAuth, user } = useAuth();
  const { lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await checkUserAuth();
      const role = user?.role || (await supabase.auth.getUser()).data?.user?.role || 'admin';
      window.location.href = getHomeRoute(role);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Google login removed because OAuth is not configured in Supabase.

  const config = TAB_CONFIG[activeTab];

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {Object.entries(TAB_CONFIG).map(([key, tab]) => (
            <TabsTrigger key={key} value={key} className="text-xs font-semibold gap-1.5">
              <tab.icon size={14} />
              {lang === 'ar' ? tab.labelAr : tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(TAB_CONFIG).map(([key, tab]) => (
          <TabsContent key={key} value={key} className="mt-0">
            <div className={`mb-5 p-3 rounded-lg ${key === 'admin' ? 'bg-navy/5 border border-navy/10' : key === 'employee' ? 'bg-cyan/5 border border-cyan/10' : 'bg-green/5 border border-green/10'}`}>
              <p className={`text-sm font-bold ${key === 'admin' ? 'text-navy' : key === 'employee' ? 'text-cyan' : 'text-green'}`}>
                {lang === 'ar' ? tab.labelAr : tab.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'ar' ? tab.descriptionAr : tab.description}
              </p>
            </div>
          </TabsContent>
        ))}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </Tabs>

      {activeTab === "consumer" && (
        <div className="mt-4 p-5 rounded-xl bg-green/10 border border-green/20 text-center">
          <p className="text-base font-bold text-green mb-1">
            {lang === 'ar' ? 'سجّل مبناك — اطلب جمع القمامة' : 'Register your building — Request trash pickup'}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {lang === 'ar' ? 'سجّل مبناك واطلب جمع القمامة' : 'Register your building and request trash pickup'}
          </p>
          <Link to="/doorman-signup" className="inline-flex items-center justify-center w-full bg-green hover:bg-green/90 text-white rounded-lg py-3 font-bold text-sm transition-colors">
            {lang === 'ar' ? 'تسجيل المبنى' : 'Register Building'}
          </Link>
        </div>
      )}

      {/* Download App Section */}
      <div className="mt-8 pt-6 border-t border-border/40 flex flex-col items-center text-center">
        <p className="text-sm font-bold text-foreground mb-4">
          {lang === 'ar' ? 'قم بتحميل تطبيق دوريكس الآن' : 'Download the DAWRIX App'}
        </p>
        <div className="flex gap-3 justify-center w-full">
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full h-14 bg-background hover:bg-muted/50 border-border shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              <div className="flex flex-col items-start text-left">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">Download on the</span>
                <span className="text-sm font-bold leading-none mt-1">App Store</span>
              </div>
            </Button>
          </a>
          <a href="/dawrix-app.apk" download="dawrix-app.apk" className="flex-1">
            <Button variant="outline" className="w-full h-14 bg-background hover:bg-muted/50 border-border shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
              <div className="flex flex-col items-start text-left">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">GET IT ON</span>
                <span className="text-sm font-bold leading-none mt-1">Google Play</span>
              </div>
            </Button>
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}
