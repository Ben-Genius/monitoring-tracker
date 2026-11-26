-- Calendar feed: each person can subscribe to their own due dates from
-- Google Calendar, Outlook or Apple Calendar.
--
-- The app asks for a private link (calendar_feed_token); the calendar app then
-- fetches /api/calendar/<token>.ics on its own schedule, with no sign-in, so
-- the token is the only key. api/calendar/[token].ts reads the feed with the
-- service role through calendar_feed(); nothing here is open to anon.
--
-- Resetting the link replaces the token, so any calendar using the old one
-- stops getting updates.

BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_feeds (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE CHECK (length(token) >= 48),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Only these functions and the service role touch it.
ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_feeds FROM PUBLIC, anon, authenticated;

-- ── The app: get (or reset) your own link ───────────────────────────────────
-- Returns your token, creating one the first time. p_reset makes a new one.
-- Two random UUIDs give 244 random bits without needing pgcrypto.

CREATE OR REPLACE FUNCTION public.calendar_feed_token(p_reset BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token TEXT := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_out   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND deactivated_at IS NULL) THEN
    RAISE EXCEPTION 'no active account';
  END IF;

  IF coalesce(p_reset, false) THEN
    INSERT INTO public.calendar_feeds (user_id, token) VALUES (auth.uid(), v_token)
      ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, created_at = now()
      RETURNING token INTO v_out;
  ELSE
    INSERT INTO public.calendar_feeds (user_id, token) VALUES (auth.uid(), v_token)
      ON CONFLICT (user_id) DO NOTHING;
    SELECT token INTO v_out FROM public.calendar_feeds WHERE user_id = auth.uid();
  END IF;
  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public.calendar_feed_token(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calendar_feed_token(BOOLEAN) TO authenticated;

-- ── The feed endpoint: one person's dated, open tasks ───────────────────────
-- NULL when the token is unknown or the person is deactivated, so the endpoint
-- can answer 404 without telling the two apart.

CREATE OR REPLACE FUNCTION public.calendar_feed(p_token TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
      'name', u.name,
      'org_name', o.name,
      'tasks', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
            'id', t.id, 'title', t.title, 'stage', t.stage, 'priority', t.priority,
            'due_date', t.due_date, 'is_urgent', coalesce(t.is_urgent, false),
            'updated_at', t.updated_at, 'project', p.name
          ) ORDER BY t.due_date, t.title)
          FROM public.tasks t
          LEFT JOIN public.projects p ON p.id = t.project_id
         WHERE t.assignee_id = u.id
           AND t.due_date IS NOT NULL
           AND t.archived_at IS NULL
           AND t.stage <> 'completed'
      ), '[]'::jsonb))
    FROM public.calendar_feeds f
    JOIN public.users u ON u.id = f.user_id
    LEFT JOIN public.organizations o ON o.id = u.organization_id
   WHERE f.token = p_token
     AND u.deactivated_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.calendar_feed(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_feed(TEXT) TO service_role;

COMMIT;
