import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  plan_days: number | null;
  plan_started_at: string | null;
  proposal_limit: number | null;
}

export function useProfile() {
  const { user, isReady } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isReady) return;
    refresh();
  }, [isReady, refresh]);

  const setPremium = async (is_premium: boolean) => {
    if (!user) return;
    await supabase.from("profiles").update({ is_premium }).eq("user_id", user.id);
    await refresh();
  };

  // Subscription UI is admin-managed. All signed-in users are treated as premium in the app.
  return { profile, loading, refresh, setPremium, isPremium: true };
}

const FREE_DAILY_LIMIT = 3;

export function useProposalUsage() {
  const { user, isReady } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = () => new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    if (!user) { setCount(0); setLoading(false); return; }
    const { data } = await supabase
      .from("proposal_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("usage_date", today())
      .maybeSingle();
    setCount(data?.count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (isReady) refresh(); }, [isReady, refresh]);

  const increment = async () => {
    if (!user) return;
    const date = today();
    const { data: existing } = await supabase
      .from("proposal_usage")
      .select("id, count")
      .eq("user_id", user.id)
      .eq("usage_date", date)
      .maybeSingle();
    if (existing) {
      await supabase.from("proposal_usage").update({ count: existing.count + 1 }).eq("id", existing.id);
      setCount(existing.count + 1);
    } else {
      await supabase.from("proposal_usage").insert({ user_id: user.id, usage_date: date, count: 1 });
      setCount(1);
    }
  };

  return { count, loading, limit: FREE_DAILY_LIMIT, refresh, increment };
}

export function useTotalProposals() {
  const { user, isReady } = useAuth();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = () => new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    if (!user) { setTotal(0); setLoading(false); return; }
    const { data } = await supabase
      .from("proposal_usage")
      .select("count")
      .eq("user_id", user.id);
    const sum = (data ?? []).reduce((acc, r: { count?: number }) => acc + (r.count ?? 0), 0);
    setTotal(sum);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isReady || !user) return;
    refresh();
    const channel = supabase
      .channel(`proposal_usage_total_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proposal_usage", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isReady, user, refresh]);

  const increment = async () => {
    if (!user) return;
    setTotal((t) => t + 1);
    const date = today();
    const { data: existing } = await supabase
      .from("proposal_usage")
      .select("id, count")
      .eq("user_id", user.id)
      .eq("usage_date", date)
      .maybeSingle();
    if (existing) {
      await supabase.from("proposal_usage").update({ count: existing.count + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("proposal_usage").insert({ user_id: user.id, usage_date: date, count: 1 });
    }
    await refresh();
  };

  return { total, loading, refresh, increment };
}

