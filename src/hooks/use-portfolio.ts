import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  skills: string[];
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioInput {
  title: string;
  description: string;
  skills: string[];
  link?: string | null;
}

export function usePortfolio() {
  const { user, isReady } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as PortfolioItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (isReady) refresh(); }, [isReady, refresh]);

  const create = async (input: PortfolioInput) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("portfolio_items")
      .insert({
        user_id: user.id,
        title: input.title,
        description: input.description,
        skills: input.skills,
        link: input.link ?? null,
      })
      .select()
      .single();
    if (!error) await refresh();
    return data as PortfolioItem | null;
  };

  const update = async (id: string, input: PortfolioInput) => {
    if (!user) return;
    await supabase
      .from("portfolio_items")
      .update({
        title: input.title,
        description: input.description,
        skills: input.skills,
        link: input.link ?? null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    await refresh();
  };

  const remove = async (id: string) => {
    if (!user) return;
    await supabase.from("portfolio_items").delete().eq("id", id).eq("user_id", user.id);
    await refresh();
  };

  return { items, loading, refresh, create, update, remove };
}
