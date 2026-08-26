ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS proposal_limit integer;
UPDATE public.profiles SET proposal_limit = plan_days WHERE proposal_limit IS NULL AND plan_days IS NOT NULL;