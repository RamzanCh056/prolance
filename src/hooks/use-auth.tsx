import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, isReady: false, signOut: async () => {} });

function isAccountRemovedError(error: { message?: string; code?: string; status?: number } | null) {
  if (!error) return false;
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  // Only the GoTrue responses for a deleted/banned account — not expired JWT, 403, or network errors.
  if (code === "user_not_found" || code === "user_banned") return true;
  if (msg.includes("user from sub claim in jwt does not exist")) return true;
  if (msg.includes("user has been deleted")) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsReady(true);
    });

    // Deleted-account check only. Passing the access token avoids a refresh-token race
    // that used to sign out admins and users who were still valid.
    let inFlight = false;
    const validateDeletedAccount = async () => {
      if (inFlight) return;
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const token = session?.access_token;
      if (!token) return;
      const expiresAtMs = (session.expires_at ?? 0) * 1000;
      if (expiresAtMs && expiresAtMs - Date.now() < 90_000) return;
      inFlight = true;
      try {
        const { error } = await supabase.auth.getUser(token);
        if (isAccountRemovedError(error)) {
          await supabase.auth.signOut();
        }
      } catch {
        // Network / Failed to fetch — keep the session.
      } finally {
        inFlight = false;
      }
    };

    const interval = setInterval(validateDeletedAccount, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") validateDeletedAccount();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, isReady, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
