-- Run manually in the Supabase SQL editor AFTER the accounts migration.
-- The confirmed account must exist first. This does not grant a subscription.
-- Existing owners and event publication states are preserved.
DO $$
DECLARE
  target_id uuid;
  matching_accounts integer;
  assigned_count integer;
BEGIN
  SELECT count(*) INTO matching_accounts
  FROM auth.users
  WHERE lower(email) = 'marcmenu707@gmail.com'
    AND email_confirmed_at IS NOT NULL
    AND coalesce(is_anonymous, false) = false;
  IF matching_accounts <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one confirmed account for marcmenu707@gmail.com. Create the account and confirm its email first.';
  END IF;

  SELECT id INTO target_id
  FROM auth.users
  WHERE lower(email) = 'marcmenu707@gmail.com'
    AND email_confirmed_at IS NOT NULL
    AND coalesce(is_anonymous, false) = false;

  WITH assigned AS (
    UPDATE public.projects SET owner_id = target_id
    WHERE owner_id IS NULL
    RETURNING slug
  )
  INSERT INTO public.event_activity(owner_id, project_slug, action)
  SELECT target_id, slug, 'legacy_owner_assigned' FROM assigned;

  GET DIAGNOSTICS assigned_count = ROW_COUNT;
  RAISE NOTICE '% legacy events assigned to marcmenu707@gmail.com', assigned_count;
END $$;
