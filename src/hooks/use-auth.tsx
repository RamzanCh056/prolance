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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1) Subscribe FIRST (do not await anything inside the callback)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    // 2) Then restore existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsReady(true);
    });

    // 3) Periodically validate the session — if account was deleted by admin, sign out.
    const validate = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { error } = await supabase.auth.getUser();
      if (error) {
        await supabase.auth.signOut();
      }
    };
    const interval = setInterval(validate, 30000);
    const onFocus = () => validate();
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, isReady, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
