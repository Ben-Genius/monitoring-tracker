-- AI summary at the top of the morning brief.
--
-- Off for every organisation until an admin turns it on, because it sends task
-- titles, project names and people's names to Anthropic (Claude) to write the
-- summary. api/send-morning-briefs.ts writes one summary per organisation per
-- local day, once, and reuses it for every email and for the in-app brief.

BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_summary BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.organizations.ai_summary IS
  'An admin agreed to send the morning brief''s task details to Anthropic for a short written summary.';

CREATE TABLE IF NOT EXISTS public.brief_summaries (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brief_date      DATE NOT NULL,
  summary         TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 1200),
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, brief_date)
);
-- The job writes with the service role; the app reads through todays_brief_summary().
ALTER TABLE public.brief_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brief_summaries FROM PUBLIC, anon, authenticated;

-- ── Admins: read and change the setting for their own organisation ──────────

CREATE OR REPLACE FUNCTION public.get_ai_summary()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.ai_summary
    FROM public.users u JOIN public.organizations o ON o.id = u.organization_id
   WHERE u.id = auth.uid() AND u.deactivated_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.set_ai_summary(p_on BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org UUID;
BEGIN
  IF p_on IS NULL THEN RAISE EXCEPTION 'say on or off'; END IF;
  SELECT organization_id INTO v_org FROM public.users
   WHERE id = auth.uid() AND role = 'admin' AND deactivated_at IS NULL;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'only an admin can change this';
  END IF;
  UPDATE public.organizations SET ai_summary = p_on WHERE id = v_org;
  -- Turning it off also removes summaries already written.
  IF NOT p_on THEN
    DELETE FROM public.brief_summaries WHERE organization_id = v_org;
  END IF;
END $$;

-- ── People who read the brief: today's summary, if there is one ─────────────
-- The newest from the last 20 hours, so yesterday's never shows as today's.

CREATE OR REPLACE FUNCTION public.todays_brief_summary()
RETURNS TABLE (summary TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.summary, s.created_at
    FROM public.users u
    JOIN public.organizations o ON o.id = u.organization_id AND o.ai_summary
    JOIN public.brief_summaries s ON s.organization_id = o.id
   WHERE u.id = auth.uid()
     AND u.deactivated_at IS NULL
     AND u.role IN ('admin', 'executive', 'pa')
     AND s.created_at > now() - interval '20 hours'
   ORDER BY s.created_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_ai_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_ai_summary(BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.todays_brief_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_ai_summary(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.todays_brief_summary() TO authenticated;

COMMIT;
