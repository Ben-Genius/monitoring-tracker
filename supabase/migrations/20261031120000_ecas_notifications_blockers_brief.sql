-- ECAS accountability loop, step 4: the loop from the 29 Oct meeting.
--
--   Mr Blay -> Japhet (PA) turns it into tasks -> owner is notified ->
--   owner moves the task -> assigner and PA are alerted, and whoever is
--   blocking it is named and notified -> PA filters it into the morning brief.

-- 1. Who a blocked task is waiting on ("so you know who's delaying").
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.tasks.blocked_by IS 'The person a blocked task is waiting on. Notified when named.';

-- 2. In-app notifications, written only by the trigger below.
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id    UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type       TEXT NOT NULL CHECK (type IN ('assigned','stage_changed','blocked','blocking_you','progress','accepted')),
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own notifications" ON public.notifications;
CREATE POLICY "Users read their own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users mark their own notifications read" ON public.notifications;
CREATE POLICY "Users mark their own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. The trigger that writes them.
CREATE OR REPLACE FUNCTION private.notify_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_name TEXT;
  v_stage_label TEXT;
  v_recipients UUID[];
  v_title TEXT := NEW.title;
BEGIN
  -- Changes made by the Baserow sync or the service role have no signed-in
  -- actor. They are not someone moving their task, so they don't notify.
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_actor_name FROM public.users WHERE id = v_actor;
  v_actor_name := COALESCE(v_actor_name, 'Someone');

  -- People who follow every movement: whoever assigned it, plus the PA(s).
  SELECT array_agg(DISTINCT r) INTO v_recipients FROM (
    SELECT NEW.created_by AS r
    UNION SELECT id FROM public.users WHERE role = 'pa'
  ) s WHERE r IS NOT NULL AND r <> v_actor;

  -- New assignee (on insert, or when the owner changes).
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id <> v_actor
     AND (TG_OP = 'INSERT' OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    VALUES (NEW.assignee_id, NEW.id, v_actor, 'assigned',
            v_actor_name || ' assigned you a task', v_title);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Stage moves.
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    v_stage_label := CASE NEW.stage
      WHEN 'yet_to_start' THEN 'Yet to start' WHEN 'in_progress' THEN 'In progress'
      WHEN 'blockers' THEN 'Blocked' WHEN 'completed' THEN 'Done' ELSE NEW.stage END;

    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor,
           CASE WHEN NEW.stage = 'blockers' THEN 'blocked' ELSE 'stage_changed' END,
           v_actor_name || ' moved a task to ' || v_stage_label,
           v_title || CASE WHEN NEW.stage = 'blockers' AND NEW.blocker_description IS NOT NULL
                           THEN ' — ' || NEW.blocker_description ELSE '' END
    FROM unnest(v_recipients) r;
  END IF;

  -- Whoever is named as the blocker.
  IF NEW.stage = 'blockers' AND NEW.blocked_by IS NOT NULL AND NEW.blocked_by <> v_actor
     AND (NEW.blocked_by IS DISTINCT FROM OLD.blocked_by OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    VALUES (NEW.blocked_by, NEW.id, v_actor, 'blocking_you',
            v_actor_name || ' is waiting on you',
            v_title || COALESCE(' — ' || NEW.blocker_description, ''));
  END IF;

  -- Progress steps (only when the stage didn't also change, to avoid two alerts).
  IF NEW.progress_percent IS DISTINCT FROM OLD.progress_percent AND NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor, 'progress',
           v_actor_name || ' updated progress to ' || NEW.progress_percent || '%', v_title
    FROM unnest(v_recipients) r;
  END IF;

  -- Owner accepted the task.
  IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
    INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
    SELECT r, NEW.id, v_actor, 'accepted', v_actor_name || ' accepted a task', v_title
    FROM unnest(v_recipients) r;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.notify_task_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_task_change_trigger ON public.tasks;
CREATE TRIGGER notify_task_change_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.notify_task_change();

-- 4. The PA's daily selection for Mr Blay.
CREATE TABLE IF NOT EXISTS public.brief_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  brief_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  added_by    UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, brief_date)
);
CREATE INDEX IF NOT EXISTS idx_brief_items_date ON public.brief_items(brief_date DESC);
ALTER TABLE public.brief_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global roles read the brief" ON public.brief_items;
CREATE POLICY "Global roles read the brief" ON public.brief_items
  FOR SELECT TO authenticated USING ((SELECT private.has_global_access()));

DROP POLICY IF EXISTS "PA and admin write the brief" ON public.brief_items;
CREATE POLICY "PA and admin write the brief" ON public.brief_items
  FOR ALL TO authenticated
  USING (COALESCE((SELECT u.role IN ('admin','pa') FROM public.users u WHERE u.id = auth.uid()), false))
  WITH CHECK (COALESCE((SELECT u.role IN ('admin','pa') FROM public.users u WHERE u.id = auth.uid()), false));
