-- The morning brief by email, at 7am in each organisation's time zone.
--
-- Who gets it: people who see the whole organisation (admin, executive, PA),
-- who are active, real (not sample teammates) and haven't turned it off.
-- Sent by api/send-morning-briefs.ts using the service role; these functions
-- are for that job only and are not callable from the app.
--
-- brief_emails_sent records each send, so a second run of the job on the
-- same day (a retry, or two schedulers) never emails anyone twice.

BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Accra';
COMMENT ON COLUMN public.organizations.timezone IS 'IANA time zone; the morning email goes out at 7am here.';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS brief_email BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN public.users.brief_email IS 'Wants the 7am morning brief email. Only admins, executives and PAs receive it.';

CREATE TABLE IF NOT EXISTS public.brief_emails_sent (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brief_date)
);
-- Only the service role reads or writes it: no grants to the app, and RLS on
-- with no policies in case a default grant ever comes back.
ALTER TABLE public.brief_emails_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brief_emails_sent FROM PUBLIC, anon, authenticated;

-- ── The app: turn your own email on or off ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_brief_email(p_on BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_on IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  UPDATE public.users SET brief_email = p_on WHERE id = auth.uid();
END $$;

REVOKE ALL ON FUNCTION public.set_brief_email(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_brief_email(BOOLEAN) TO authenticated;

-- ── The job: who to email ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.brief_email_recipients()
RETURNS TABLE (
  user_id         UUID,
  email           TEXT,
  name            TEXT,
  organization_id UUID,
  org_name        TEXT,
  executive_title TEXT,
  timezone        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, u.email, u.name, o.id, o.name, o.executive_title, o.timezone
    FROM public.users u
    JOIN public.organizations o ON o.id = u.organization_id
   WHERE u.role IN ('admin', 'executive', 'pa')
     AND u.brief_email
     AND u.deactivated_at IS NULL
     AND NOT u.is_sample
     AND u.email IS NOT NULL
     AND u.email NOT ILIKE '%@sample.invalid'
   ORDER BY o.id, u.name;
$$;

-- ── The job: one organisation's brief ───────────────────────────────────────
-- Open tasks plus anything completed in the last day, shaped like the app's
-- brief query (src/features/brief/hooks/useBrief.ts) so both classify alike.

CREATE OR REPLACE FUNCTION public.brief_email_tasks(p_org UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'stage', t.stage, 'priority', t.priority,
      'due_date', t.due_date, 'blocker_description', t.blocker_description,
      'progress_percent', coalesce(t.progress_percent, 0),
      'acknowledged_at', t.acknowledged_at, 'next_update_due', t.next_update_due,
      'last_movement_at', t.last_movement_at, 'is_urgent', coalesce(t.is_urgent, false),
      'assignee_id', t.assignee_id, 'completed_at', t.completed_at, 'company_id', t.company_id,
      'project', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('name', p.name, 'company_id', p.company_id) END,
      'owner', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('name', a.name) END,
      'blocker', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('name', b.name) END
    )), '[]'::jsonb)
    FROM public.tasks t
    LEFT JOIN public.projects p ON p.id = t.project_id
    LEFT JOIN public.users a ON a.id = t.assignee_id
    LEFT JOIN public.users b ON b.id = t.blocked_by
   WHERE COALESCE(private.project_org(t.project_id), private.company_org(t.company_id)) = p_org
     AND t.archived_at IS NULL
     AND (t.stage <> 'completed' OR t.completed_at >= now() - interval '1 day');
$$;

-- ── The job: claim a send, so it happens once per person per day ───────────
-- Returns true if this call claimed it. If the email then fails to send, the
-- job calls release_brief_email so a later run tries again.

CREATE OR REPLACE FUNCTION public.claim_brief_email(p_user UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.brief_emails_sent (user_id, brief_date) VALUES (p_user, p_date)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.release_brief_email(p_user UUID, p_date DATE)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.brief_emails_sent WHERE user_id = p_user AND brief_date = p_date;
$$;

-- ── Unsubscribe link (signed by the server, applied with the service role) ─

CREATE OR REPLACE FUNCTION public.unsubscribe_brief_email(p_user UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.users SET brief_email = false WHERE id = p_user;
$$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.brief_email_recipients()',
    'public.brief_email_tasks(UUID)',
    'public.claim_brief_email(UUID, DATE)',
    'public.release_brief_email(UUID, DATE)',
    'public.unsubscribe_brief_email(UUID)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;
