-- Escalation when work goes silent: the "nothing stays still" rule enforced.
--
-- Once a day, public.run_escalations() (called by api/run-escalations.ts)
-- walks open, owned tasks up a ladder:
--
--   in progress, no movement   day 2: owner   day 4: leads + assigner   day 7: PAs
--   past its deadline          day 1: owner   day 3: leads + assigner
--   not accepted               day 2: owner   day 4: leads + assigner
--
-- Each step is sent once per spell of silence (task_escalations remembers
-- it). Any movement, acceptance, new deadline or completion clears the
-- record, so the ladder starts again from the bottom if the task stalls
-- later. Leads are the active leads of the task's company.

BEGIN;

CREATE TABLE IF NOT EXISTS public.task_escalations (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  rule    TEXT NOT NULL CHECK (rule IN ('silent', 'overdue', 'unaccepted')),
  level   SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, rule, level)
);
ALTER TABLE public.task_escalations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.task_escalations FROM PUBLIC, anon, authenticated;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'assigned', 'stage_changed', 'blocked', 'blocking_you', 'progress', 'accepted', 'comment', 'nudge', 'mention', 'unblocked', 'escalation'
]));

-- Movement resets the ladder.
CREATE OR REPLACE FUNCTION private.reset_escalations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.last_movement_at IS DISTINCT FROM OLD.last_movement_at
     OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    DELETE FROM public.task_escalations WHERE task_id = NEW.id AND rule = 'silent';
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.stage = 'completed' THEN
    DELETE FROM public.task_escalations WHERE task_id = NEW.id AND rule = 'overdue';
  END IF;
  IF NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    DELETE FROM public.task_escalations WHERE task_id = NEW.id AND rule = 'unaccepted';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.reset_escalations() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS reset_escalations_trigger ON public.tasks;
CREATE TRIGGER reset_escalations_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.reset_escalations();

-- The daily run. Returns how many steps were reached and notifications sent.
-- p_record_only notes the steps without notifying anyone (used once below).
CREATE OR REPLACE FUNCTION public.run_escalations(p_now TIMESTAMPTZ DEFAULT now(), p_record_only BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_sent JSONB;
BEGIN
  WITH open_tasks AS (
    SELECT t.id, t.title, t.assignee_id, t.created_by, t.stage, t.due_date, t.acknowledged_at,
           t.last_movement_at, t.created_at,
           COALESCE(p.company_id, t.company_id) AS company_id,
           COALESCE(private.project_org(t.project_id), private.company_org(t.company_id)) AS org_id
      FROM public.tasks t
      LEFT JOIN public.projects p ON p.id = t.project_id
      JOIN public.users o ON o.id = t.assignee_id AND o.deactivated_at IS NULL AND NOT o.is_sample
     WHERE t.archived_at IS NULL AND t.stage <> 'completed'
  ),
  -- Which step each task has reached on each ladder today.
  due_steps AS (
    SELECT id, 'silent'::text AS rule,
           CASE WHEN p_now - last_movement_at >= interval '7 days' THEN 3
                WHEN p_now - last_movement_at >= interval '4 days' THEN 2
                WHEN p_now - last_movement_at >= interval '2 days' THEN 1 END AS level,
           floor(extract(epoch FROM p_now - last_movement_at) / 86400)::int AS days
      FROM open_tasks WHERE stage = 'in_progress' AND last_movement_at IS NOT NULL
    UNION ALL
    SELECT id, 'overdue',
           CASE WHEN p_now::date - due_date >= 3 THEN 2 WHEN p_now::date - due_date >= 1 THEN 1 END,
           p_now::date - due_date
      FROM open_tasks WHERE due_date IS NOT NULL
    UNION ALL
    SELECT id, 'unaccepted',
           CASE WHEN p_now - created_at >= interval '4 days' THEN 2 WHEN p_now - created_at >= interval '2 days' THEN 1 END,
           floor(extract(epoch FROM p_now - created_at) / 86400)::int
      FROM open_tasks WHERE acknowledged_at IS NULL
  ),
  -- Record each new step once; only the newly recorded ones are sent.
  fresh AS (
    INSERT INTO public.task_escalations (task_id, rule, level)
    SELECT id, rule, level FROM due_steps WHERE level IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING task_id, rule, level
  ),
  recipients AS (
    -- Level 1: the owner.
    SELECT f.task_id, f.rule, f.level, o.assignee_id AS user_id FROM fresh f JOIN open_tasks o ON o.id = f.task_id WHERE f.level = 1
    UNION
    -- Level 2: the company's leads and whoever assigned it.
    SELECT f.task_id, f.rule, f.level, u.id FROM fresh f JOIN open_tasks o ON o.id = f.task_id
      JOIN public.users u ON u.company_id = o.company_id AND u.role = 'lead' AND u.deactivated_at IS NULL AND NOT u.is_sample
     WHERE f.level = 2
    UNION
    SELECT f.task_id, f.rule, f.level, o.created_by FROM fresh f JOIN open_tasks o ON o.id = f.task_id
     WHERE f.level = 2 AND o.created_by IS NOT NULL
    UNION
    -- Level 3: the organisation's PAs (the brief shows it to the executive too).
    SELECT f.task_id, f.rule, f.level, u.id FROM fresh f JOIN open_tasks o ON o.id = f.task_id
      JOIN public.users u ON u.organization_id = o.org_id AND u.role = 'pa' AND u.deactivated_at IS NULL AND NOT u.is_sample
     WHERE f.level = 3
  ),
  sent AS (
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r.user_id, r.task_id, NULL, 'escalation',
           CASE
             WHEN r.level = 1 AND r.rule = 'silent'     THEN 'No update for ' || s.days || ' days: ' || o.title
             WHEN r.level = 1 AND r.rule = 'overdue'    THEN 'Past its deadline: ' || o.title
             WHEN r.level = 1 AND r.rule = 'unaccepted' THEN 'Waiting for you to accept: ' || o.title
             WHEN r.rule = 'silent'     THEN 'Gone quiet (' || s.days || ' days): ' || o.title
             WHEN r.rule = 'overdue'    THEN s.days || ' days late: ' || o.title
             ELSE                            'Not accepted after ' || s.days || ' days: ' || o.title
           END,
           CASE
             WHEN r.level = 1 AND r.rule = 'unaccepted' THEN 'Accept it, or tell your lead if it isn''t yours.'
             WHEN r.level = 1 THEN 'Post a quick update so your lead knows where it stands.'
             ELSE 'Owner: ' || coalesce(own.name, 'unassigned') || '. Worth a check-in.'
           END
      FROM recipients r
      JOIN open_tasks o ON o.id = r.task_id
      JOIN due_steps s ON s.id = r.task_id AND s.rule = r.rule
      LEFT JOIN public.users own ON own.id = o.assignee_id
      JOIN public.users target ON target.id = r.user_id AND target.deactivated_at IS NULL AND NOT target.is_sample
     -- Higher levels go to others, not back to the owner.
     WHERE (r.level = 1 OR r.user_id <> o.assignee_id) AND NOT p_record_only
    RETURNING 1
  )
  SELECT jsonb_build_object(
           'steps', (SELECT count(*) FROM fresh),
           'notifications', (SELECT count(*) FROM sent))
    INTO v_sent;
  RETURN v_sent;
END $$;
REVOKE ALL ON FUNCTION public.run_escalations(TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_escalations(TIMESTAMPTZ, BOOLEAN) TO service_role;

-- Start from today: work that is already quiet is noted as escalated, without
-- sending anything, so the first daily run doesn't flood people with old news.
-- Only new silence escalates from here on.
SELECT public.run_escalations(now(), true);

COMMIT;
