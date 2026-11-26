-- Recurring tasks and task dependencies.
--
-- Recurring: a task can repeat daily, on weekdays, weekly or monthly. When
-- it is completed, the next one is created straight away for the same owner,
-- dated on the next occurrence after today. One series never has two open
-- copies. A repeat that was accepted stays accepted.
--
-- Dependencies: a task can wait on others ("can't pour the slab until the
-- formwork is up"). Loops are refused, both tasks must be in the same
-- organisation, and when the last thing a task waits on is done, its owner
-- is told they can start.

BEGIN;

-- ── Recurring tasks ─────────────────────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS repeat TEXT CHECK (repeat IN ('daily', 'weekdays', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS series_id UUID;
COMMENT ON COLUMN public.tasks.repeat IS 'Repeats on completion: daily, weekdays, weekly or monthly. Null = one-off.';
COMMENT ON COLUMN public.tasks.series_id IS 'The first task of a repeating series; every repeat carries it.';
CREATE INDEX IF NOT EXISTS idx_tasks_series_open ON public.tasks(series_id) WHERE stage <> 'completed';

-- The next date in a schedule after p_from.
CREATE OR REPLACE FUNCTION private.next_occurrence(p_from DATE, p_repeat TEXT)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE d DATE;
BEGIN
  CASE p_repeat
    WHEN 'daily'   THEN d := p_from + 1;
    WHEN 'weekly'  THEN d := p_from + 7;
    WHEN 'monthly' THEN d := (p_from + interval '1 month')::date;
    WHEN 'weekdays' THEN
      d := p_from + 1;
      WHILE extract(isodow FROM d) > 5 LOOP d := d + 1; END LOOP;
    ELSE RETURN NULL;
  END CASE;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION private.create_next_repeat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_series UUID := coalesce(NEW.series_id, NEW.id);
  v_base   DATE := coalesce(NEW.due_date, current_date);
  v_due    DATE;
  v_shift  INT;
  v_new    UUID;
BEGIN
  IF NEW.repeat IS NULL OR NEW.archived_at IS NOT NULL
     OR NEW.stage IS DISTINCT FROM 'completed' OR OLD.stage = 'completed' THEN
    RETURN NEW;
  END IF;
  -- Reopening and re-completing must not create a second open copy.
  IF EXISTS (SELECT 1 FROM public.tasks WHERE series_id = v_series AND stage <> 'completed' AND archived_at IS NULL AND id <> NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Skip occurrences that are already in the past.
  v_due := private.next_occurrence(v_base, NEW.repeat);
  WHILE v_due <= current_date LOOP v_due := private.next_occurrence(v_due, NEW.repeat); END LOOP;
  v_shift := v_due - v_base;

  IF NEW.series_id IS NULL THEN
    UPDATE public.tasks SET series_id = NEW.id WHERE id = NEW.id;
  END IF;

  INSERT INTO public.tasks (title, description, project_id, company_id, assignee_id, created_by, priority,
                            stage, progress_percent, due_date, start_date, repeat, series_id,
                            acknowledged_at, acknowledged_by)
  VALUES (NEW.title, NEW.description, NEW.project_id, NEW.company_id, NEW.assignee_id, NEW.created_by, NEW.priority,
          'yet_to_start', 0, v_due, CASE WHEN NEW.start_date IS NOT NULL THEN NEW.start_date + v_shift END,
          NEW.repeat, v_series,
          CASE WHEN NEW.acknowledged_at IS NOT NULL THEN now() END,
          CASE WHEN NEW.acknowledged_at IS NOT NULL THEN NEW.acknowledged_by END)
  RETURNING id INTO v_new;

  INSERT INTO public.task_assignees (task_id, user_id)
  SELECT v_new, user_id FROM public.task_assignees WHERE task_id = NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.create_next_repeat() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS create_next_repeat_trigger ON public.tasks;
CREATE TRIGGER create_next_repeat_trigger
  AFTER UPDATE OF stage ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.create_next_repeat();

-- ── Dependencies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, depends_on),
  CHECK (task_id <> depends_on)
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on);
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.task_dependencies TO authenticated;

-- Seeing a link needs seeing both tasks (task RLS applies inside EXISTS).
DROP POLICY IF EXISTS "See links between visible tasks" ON public.task_dependencies;
CREATE POLICY "See links between visible tasks" ON public.task_dependencies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id)
     AND EXISTS (SELECT 1 FROM public.tasks WHERE id = depends_on));

-- Changing a link: coordinators and leads, or the owner of the waiting task.
-- Executives read only.
DROP POLICY IF EXISTS "Plan links between visible tasks" ON public.task_dependencies;
CREATE POLICY "Plan links between visible tasks" ON public.task_dependencies
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id) AND EXISTS (SELECT 1 FROM public.tasks WHERE id = depends_on)
    AND ((SELECT private.current_user_role()) IN ('admin', 'pa', 'lead')
         OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assignee_id = auth.uid())))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id) AND EXISTS (SELECT 1 FROM public.tasks WHERE id = depends_on)
    AND ((SELECT private.current_user_role()) IN ('admin', 'pa', 'lead')
         OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assignee_id = auth.uid())));

-- Same organisation only, for both ends.
DROP POLICY IF EXISTS "Same organisation only" ON public.task_dependencies;
CREATE POLICY "Same organisation only" ON public.task_dependencies
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.task_org(task_id) = (SELECT private.current_org_id())
     AND private.task_org(depends_on) = (SELECT private.current_org_id()))
  WITH CHECK (private.task_org(task_id) = (SELECT private.current_org_id())
     AND private.task_org(depends_on) = (SELECT private.current_org_id()));

-- No loops: B can't wait on A if A already (directly or not) waits on B.
CREATE OR REPLACE FUNCTION private.refuse_dependency_loop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE chain(id) AS (
      SELECT depends_on FROM public.task_dependencies WHERE task_id = NEW.depends_on
      UNION
      SELECT d.depends_on FROM public.task_dependencies d JOIN chain c ON d.task_id = c.id
    )
    SELECT 1 FROM chain WHERE id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'That would make a loop: the other task already waits on this one.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.refuse_dependency_loop() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS refuse_dependency_loop_trigger ON public.task_dependencies;
CREATE TRIGGER refuse_dependency_loop_trigger
  BEFORE INSERT ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION private.refuse_dependency_loop();

-- When the last thing a task waits on is done, tell its owner.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'assigned', 'stage_changed', 'blocked', 'blocking_you', 'progress', 'accepted', 'comment', 'nudge', 'mention', 'unblocked'
]));

CREATE OR REPLACE FUNCTION private.notify_dependents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM 'completed' OR OLD.stage = 'completed' THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
  SELECT w.assignee_id, w.id, auth.uid(), 'unblocked',
         'You can start: ' || w.title,
         '"' || NEW.title || '" is done, and nothing else is holding this up.'
    FROM public.task_dependencies d
    JOIN public.tasks w ON w.id = d.task_id
   WHERE d.depends_on = NEW.id
     AND w.stage <> 'completed' AND w.archived_at IS NULL AND w.assignee_id IS NOT NULL
     AND w.assignee_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.task_dependencies d2 JOIN public.tasks o ON o.id = d2.depends_on
                      WHERE d2.task_id = w.id AND o.id <> NEW.id AND o.stage <> 'completed');
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION private.notify_dependents() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_dependents_trigger ON public.tasks;
CREATE TRIGGER notify_dependents_trigger
  AFTER UPDATE OF stage ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.notify_dependents();

-- Live updates for links, like the other task tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_dependencies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_dependencies;
  END IF;
END $$;

COMMIT;
