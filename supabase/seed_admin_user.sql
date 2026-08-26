-- Grants an existing account the access the app requires to get past /auth.
-- Create the user first (dashboard: Authentication -> Users -> Add user, with
-- "Auto Confirm User" enabled), then set the email below and run this.
--
-- Why this is needed: handle_new_user() creates a profile with only a display
-- name, and checkCurrentUserAccess() in src/lib/admin.functions.ts signs out
-- any account whose profile lacks is_premium + plan_days + plan_started_at.
-- The Admin tab additionally requires a user_roles row.

DO $$
DECLARE
  target_email text := 'hc860400@gmail.com';  -- change if needed
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user with email %. Create it in the dashboard first.', target_email;
  END IF;

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (uid, split_part(target_email, '@', 1))
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profiles
  SET is_premium = true,
      plan_days = 30,
      plan_started_at = now(),
      proposal_limit = 30
  WHERE user_id = uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Provisioned % (%) as premium admin', target_email, uid;
END $$;
