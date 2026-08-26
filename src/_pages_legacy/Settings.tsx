import { LogOut, Crown, Mail, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


function formatRemaining(endMs: number, now: number): { label: string; expired: boolean } {
  const diff = endMs - now;
  if (diff <= 0) return { label: "Expired", expired: true };
  const totalHours = Math.floor(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { label: `${days}d ${hours}h left`, expired: false };
  if (hours > 0) return { label: `${hours}h ${mins}m left`, expired: false };
  return { label: `${mins}m left`, expired: false };
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isPremium } = useProfile();
  const nav = useNavigate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    nav({ to: "/auth", replace: true });
  };

  const startMs = profile?.plan_started_at ? new Date(profile.plan_started_at).getTime() : null;
  const endMs = startMs && profile?.plan_days ? startMs + profile.plan_days * 86400000 : null;
  const remaining = endMs ? formatRemaining(endMs, now) : null;


  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="font-display font-bold text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalize your experience.</p>
      </header>

      {/* Account card */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-display font-bold text-lg shadow-glow">
          {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{profile?.display_name || "Freelancer"}</div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Mail className="h-3 w-3" /> {user?.email}
          </div>
        </div>
        {isPremium && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-primary text-primary-foreground px-2 py-1 rounded-full">
            <Crown className="h-3 w-3" /> Pro
          </span>
        )}
      </div>

      {/* Plan timer (read-only) */}
      {remaining && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-soft text-primary grid place-items-center">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Plan time remaining</div>
            <div className="text-xs text-muted-foreground">
              {profile?.plan_days} day plan · managed by admin
            </div>
          </div>
          <span
            className={
              "text-xs font-bold px-2.5 py-1 rounded-full border " +
              (remaining.expired
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-primary/10 text-primary border-primary/30")
            }
          >
            {remaining.label}
          </span>
        </div>
      )}

      {/* Settings list */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border overflow-hidden">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-smooth text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center"><LogOut className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-destructive">Log out</div>
                <div className="text-xs text-muted-foreground">Sign out of your account</div>
              </div>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll be signed out of your account and returned to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">Prolance · v1.1</p>
    </div>
  );
}
