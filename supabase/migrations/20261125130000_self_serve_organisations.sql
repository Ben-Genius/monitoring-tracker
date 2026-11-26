-- Self-serve sign-up: anyone can start their own organisation.
--
-- Until now a new customer needed someone to run SQL. create_organization()
-- lets a freshly signed-up person (authenticated, with no profile yet) create
-- an organisation, its first company, and their own admin profile in one
-- transaction. With p_with_sample it also loads a small sample project and
-- three sample teammates, chosen so the morning brief has something in every
-- section on day one. clear_sample_data() removes all of it.
--
-- Tenant isolation is unchanged: everything is created inside the new
-- organisation and the restrictive "Same organisation only" policies apply.

BEGIN;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users    ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.projects.is_sample IS 'Loaded by create_organization(p_with_sample); removed by clear_sample_data().';
COMMENT ON COLUMN public.users.is_sample    IS 'Sample teammate with no login; removed by clear_sample_data().';

CREATE OR REPLACE FUNCTION public.create_organization(
  p_org_name     TEXT,
  p_company_name TEXT,
  p_name         TEXT,
  p_with_sample  BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_email   TEXT := auth.jwt() ->> 'email';
  v_org     UUID;
  v_company UUID;
  v_project UUID;
  v_slug    TEXT;
  v_tag     TEXT := substr(md5(gen_random_uuid()::text), 1, 6);
  v_kofi    UUID := gen_random_uuid();
  v_ama     UUID := gen_random_uuid();
  v_yaw     UUID := gen_random_uuid();
BEGIN
  IF v_uid IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  p_org_name     := btrim(p_org_name);
  p_company_name := btrim(p_company_name);
  p_name         := btrim(p_name);
  IF coalesce(p_org_name, '') = '' OR coalesce(p_company_name, '') = '' OR coalesce(p_name, '') = '' THEN
    RAISE EXCEPTION 'organisation, company and your name are all required';
  END IF;
  IF length(p_org_name) > 120 OR length(p_company_name) > 120 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'names must be 120 characters or fewer';
  END IF;

  -- One organisation per login. Someone already in a team (including a
  -- profile imported or invited under this email) joins through an invite.
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid OR lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'this email already belongs to a team on Pulse360. Ask your admin for an invite.';
  END IF;

  v_slug := trim(BOTH '-' FROM regexp_replace(lower(p_org_name), '[^a-z0-9]+', '-', 'g'));
  v_slug := left(coalesce(nullif(v_slug, ''), 'org'), 50) || '-' || v_tag;

  INSERT INTO public.organizations (name, slug) VALUES (p_org_name, v_slug) RETURNING id INTO v_org;
  INSERT INTO public.companies (name, organization_id) VALUES (p_company_name, v_org) RETURNING id INTO v_company;
  -- The founder is an admin attached to their first company: global read
  -- across the organisation, plus the company-scoped write access.
  INSERT INTO public.users (id, email, name, role, company_id)
  VALUES (v_uid, v_email, p_name, 'admin', v_company);

  IF p_with_sample THEN
    INSERT INTO public.users (id, email, name, role, company_id, is_sample) VALUES
      (v_kofi, 'kofi.mensah.' || v_tag || '@sample.invalid', 'Kofi Mensah (sample)', 'lead',     v_company, true),
      (v_ama,  'ama.owusu.'   || v_tag || '@sample.invalid', 'Ama Owusu (sample)',   'employee', v_company, true),
      (v_yaw,  'yaw.boateng.' || v_tag || '@sample.invalid', 'Yaw Boateng (sample)', 'employee', v_company, true);

    INSERT INTO public.projects (name, description, company_id, status, contract_value, actual_cost,
                                 start_date, expected_handover, created_by, is_sample)
    VALUES ('Sample: Warehouse extension',
            'A sample project so you can see how Pulse360 works. Remove it from the banner on your dashboard.',
            v_company, 'active', 2500000, 1150000,
            current_date - 40, current_date + 75, v_uid, true)
    RETURNING id INTO v_project;

    -- One task per brief section: urgent, blocked, stuck, overdue, not
    -- accepted, moved today and done (see src/features/brief/hooks/useBrief.ts).
    INSERT INTO public.tasks (title, description, project_id, company_id, assignee_id, created_by, stage, priority,
                              progress_percent, is_urgent, due_date, acknowledged_at, acknowledged_by,
                              blocker_description, last_movement_at, next_update_due, started_at, completed_at)
    VALUES
      ('Renew the crane hire before it lapses', 'The crane contract ends on Friday; without it the roof work stops.',
       v_project, v_company, v_kofi, v_uid, 'in_progress', 'critical', 50, true, current_date + 2,
       now() - interval '3 days', v_kofi, NULL, now() - interval '6 hours', now() + interval '1 day', now() - interval '5 days', NULL),
      ('Pour the ground-floor slab', NULL,
       v_project, v_company, v_ama, v_uid, 'blockers', 'high', 25, false, current_date + 5,
       now() - interval '6 days', v_ama, 'Waiting on the cement delivery from the supplier.',
       now() - interval '1 day', now() + interval '1 day', now() - interval '6 days', NULL),
      ('Install the roof trusses', NULL,
       v_project, v_company, v_yaw, v_uid, 'in_progress', 'medium', 40, false, current_date + 10,
       now() - interval '9 days', v_yaw, NULL, now() - interval '4 days', now() + interval '2 days', now() - interval '8 days', NULL),
      ('Submit the fire safety drawings', 'The fire service needs these before the next inspection.',
       v_project, v_company, v_ama, v_uid, 'yet_to_start', 'high', 0, false, current_date - 3,
       now() - interval '10 days', v_ama, NULL, now() - interval '10 days', NULL, NULL, NULL),
      ('Order the electrical fittings', NULL,
       v_project, v_company, v_yaw, v_uid, 'yet_to_start', 'medium', 0, false, current_date + 7,
       NULL, NULL, NULL, now() - interval '1 day', NULL, NULL, NULL),
      ('Finish the site survey', NULL,
       v_project, v_company, v_kofi, v_uid, 'in_progress', 'medium', 75, false, current_date + 3,
       now() - interval '7 days', v_kofi, NULL, now() - interval '2 hours', now() + interval '2 days', now() - interval '7 days', NULL),
      ('Clear and level the site', NULL,
       v_project, v_company, v_kofi, v_uid, 'completed', 'medium', 100, false, current_date - 1,
       now() - interval '20 days', v_kofi, NULL, now() - interval '1 day', NULL, now() - interval '20 days', now() - interval '1 day');
  END IF;

  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Removes the sample project and sample teammates from the caller's
-- organisation. Admins only. Real work assigned to a sample teammate is kept
-- and left unassigned.
CREATE OR REPLACE FUNCTION public.clear_sample_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM public.users
   WHERE id = auth.uid() AND role = 'admin' AND deactivated_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'only an admin can remove the sample data';
  END IF;

  DELETE FROM public.projects p
   USING public.companies c
   WHERE c.id = p.company_id AND c.organization_id = v_org AND p.is_sample;

  UPDATE public.tasks SET assignee_id = NULL
   WHERE assignee_id IN (SELECT id FROM public.users WHERE organization_id = v_org AND is_sample);
  UPDATE public.tasks SET created_by = NULL
   WHERE created_by IN (SELECT id FROM public.users WHERE organization_id = v_org AND is_sample);
  DELETE FROM public.task_comments
   WHERE user_id IN (SELECT id FROM public.users WHERE organization_id = v_org AND is_sample);
  DELETE FROM public.users WHERE organization_id = v_org AND is_sample;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_sample_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_sample_data() TO authenticated;

COMMIT;
