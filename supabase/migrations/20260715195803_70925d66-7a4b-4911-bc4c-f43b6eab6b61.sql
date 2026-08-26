
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_days integer,
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
