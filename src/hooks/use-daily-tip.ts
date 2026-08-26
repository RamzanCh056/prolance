import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const DEFAULT_DAILY_TIP =
  "Apply within 5 minutes of a new job post to get **3x** more views.";
export const DEFAULT_DAILY_TIP_TITLE = "Today's tip";
export const DEFAULT_DAILY_TIP_TITLE_COLOR = "#F5C542";

const SETTINGS_KEYS = ["daily_tip", "daily_tip_title", "daily_tip_title_color"] as const;

export function normalizeHexColor(value: string | undefined | null, fallback = DEFAULT_DAILY_TIP_TITLE_COLOR): string {
  const raw = (value ?? "").trim();
  if (/^#([0-9a-f]{6})$/i.test(raw)) return raw.toUpperCase();
  if (/^#([0-9a-f]{3})$/i.test(raw)) {
    const [a, b, c] = raw.slice(1).split("");
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  return fallback;
}

export function useDailyTip() {
  const { isReady } = useAuth();
  const [tip, setTip] = useState<string>(DEFAULT_DAILY_TIP);
  const [title, setTitle] = useState<string>(DEFAULT_DAILY_TIP_TITLE);
  const [titleColor, setTitleColor] = useState<string>(DEFAULT_DAILY_TIP_TITLE_COLOR);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("key, value").in("key", [...SETTINGS_KEYS]);
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    setTip(map.daily_tip?.trim() || DEFAULT_DAILY_TIP);
    setTitle(map.daily_tip_title?.trim() || DEFAULT_DAILY_TIP_TITLE);
    setTitleColor(normalizeHexColor(map.daily_tip_title_color));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    refresh();
  }, [isReady, refresh]);

  return { tip, title, titleColor, loading, refresh };
}
