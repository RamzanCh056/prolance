import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { checkCurrentUserAccess } from "@/lib/admin.functions";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export default function Auth() {
  const nav = useNavigate();
  const { user, isReady } = useAuth();

  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isReady || !user || loading) return;
    if (isAdminLogin) nav({ to: "/admin", replace: true });
    else nav({ to: "/", replace: true });
  }, [isReady, user, loading, isAdminLogin, nav]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = emailSchema.safeParse(email);
    if (!e.success) { toast.error(e.error.issues[0].message); return; }
    const p = passwordSchema.safeParse(password);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const access = await checkCurrentUserAccess();
      if (access.status === "free") {
        await supabase.auth.signOut();
        toast.error("You have a free plan. Please contact the admin.");
        return;
      }
      if (access.status === "expired") {
        await supabase.auth.signOut();
        toast.error("Your plan has expired. Please contact the admin.");
        return;
      }

      if (isAdminLogin) {
        if (!access.isAdmin) {
          await supabase.auth.signOut();
          throw new Error("This account is not an admin.");
        }
        toast.success("Welcome, admin");
        nav({ to: "/admin", replace: true });
        return;
      }
      toast.success("Welcome back 👋");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      if (/invalid login/i.test(msg)) toast.error("Wrong email or password");
      else if (/email not confirmed/i.test(msg)) toast.error("Please verify your email first");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-hero opacity-20 pointer-events-none" />
      <div className="relative flex-1 flex flex-col mx-auto w-full max-w-md px-5 pt-10 pb-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">Prolance<span className="text-gradient">.</span></span>
        </div>

        <header className="mb-6">
          <h1 className="font-display font-bold text-3xl tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Sign in to continue.</p>
        </header>

        <div className="mb-4 inline-flex p-1 rounded-xl bg-muted text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsAdminLogin(false)}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${!isAdminLogin ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setIsAdminLogin(true)}
            className={`px-3 py-1.5 rounded-lg transition-smooth ${isAdminLogin ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 rounded-xl pl-10"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="h-12 rounded-xl pl-10 pr-10"
                autoComplete="current-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-smooth mt-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait...</>
            ) : (
              <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account? Please contact the admin.
        </p>

        <p className="text-center text-[11px] text-muted-foreground mt-auto pt-8">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </div>
  );
}
