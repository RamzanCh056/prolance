import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Supabase places recovery tokens in the URL hash and triggers PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValid(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setValid(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = passwordSchema.safeParse(password);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated ✓");
      nav({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password");
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
        <h1 className="font-display font-bold text-3xl tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">Choose a strong password you haven't used before.</p>

        {!valid ? (
          <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
            This reset link is invalid or has expired. <button onClick={() => nav({ to: "/auth" })} className="text-primary font-semibold">Request a new one</button>.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pl-10" minLength={8} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 rounded-xl pl-10" minLength={8} required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</> : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
