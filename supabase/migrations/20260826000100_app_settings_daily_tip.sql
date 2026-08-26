CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read settings" ON public.app_settings;
CREATE POLICY "Authenticated read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.app_settings (key, value)
VALUES
  ('daily_tip', 'Apply within 5 minutes of a new job post to get **3x** more views.'),
  ('daily_tip_title', 'Today''s tip'),
  ('daily_tip_title_color', '#F5C542')
ON CONFLICT (key) DO NOTHING;
