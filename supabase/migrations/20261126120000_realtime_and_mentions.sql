-- Live updates and @mentions.
--
-- 1. Realtime: the tables the app shows are added to Supabase's realtime
--    publication, so open screens refresh when someone else changes
--    something. Realtime applies each subscriber's row-level security, so
--    the "Same organisation only" policies keep every customer's changes
--    private to them.
--
-- 2. Mentions: a comment or update can mention people as @[Name](user-id).
--    Each mentioned person in the same organisation gets a "mention"
--    notification (instead of the generic comment one). Ids from another
--    organisation, deactivated people and sample teammates are ignored, so a
--    hand-written id can't reach anyone outside the team.

BEGIN;

-- ── Realtime ────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['tasks', 'task_comments', 'subtasks', 'notifications', 'projects',
                           'milestones', 'approvals', 'brief_items', 'brief_days'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ── Mentions ────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'assigned', 'stage_changed', 'blocked', 'blocking_you', 'progress', 'accepted', 'comment', 'nudge', 'mention'
]));

-- "@[Ama Owusu](uuid) please check" -> "@Ama Owusu please check"
CREATE OR REPLACE FUNCTION private.plain_mentions(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT regexp_replace(p_text, '@\[([^\]]{1,120})\]\([0-9a-fA-F-]{36}\)', '@\1', 'g');
$$;

-- Everyone a comment mentions who may hear about it: same organisation,
-- active, real (not a sample), and not the author.
CREATE OR REPLACE FUNCTION private.mentioned_users(p_text TEXT, p_org UUID, p_author UUID)
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(array_agg(DISTINCT u.id), '{}')
    FROM regexp_matches(p_text, '@\[[^\]]{1,120}\]\(([0-9a-fA-F-]{36})\)', 'g') AS m(id)
    JOIN public.users u ON u.id = m.id[1]::uuid
   WHERE u.organization_id = p_org
     AND u.deactivated_at IS NULL
     AND NOT u.is_sample
     AND u.id IS DISTINCT FROM p_author;
$$;
REVOKE EXECUTE ON FUNCTION private.mentioned_users(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_task      public.tasks%ROWTYPE;
  v_author    TEXT;
  v_org       UUID;
  v_text      TEXT := private.plain_mentions(NEW.comment);
  v_mentioned UUID[];
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  SELECT name INTO v_author FROM public.users WHERE id = NEW.user_id;
  v_org := private.task_org(NEW.task_id);
  v_mentioned := private.mentioned_users(NEW.comment, v_org, NEW.user_id);

  -- Mentioned people hear about it directly, in any kind of comment or update.
  INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
  SELECT r, NEW.task_id, NEW.user_id, 'mention',
         COALESCE(v_author, 'Someone') || ' mentioned you',
         v_task.title || ': ' || left(v_text, 140)
    FROM unnest(v_mentioned) r;

  -- Status updates notify through the task trigger already.
  IF NEW.kind = 'status_update' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
  SELECT DISTINCT r, NEW.task_id, NEW.user_id,
         CASE WHEN NEW.kind = 'nudge' THEN 'nudge' ELSE 'comment' END,
         CASE WHEN NEW.kind = 'nudge' THEN COALESCE(v_author, 'The executive') || ' left a note on your task'
              ELSE COALESCE(v_author, 'Someone') || ' commented' END,
         v_task.title || ': ' || left(v_text, 140)
  FROM (
    SELECT v_task.assignee_id AS r
    UNION SELECT v_task.created_by
    UNION SELECT id FROM public.users
           WHERE role = 'pa' AND NEW.kind = 'nudge' AND organization_id = v_org
  ) s
  WHERE r IS NOT NULL AND r <> NEW.user_id AND NOT (r = ANY (v_mentioned));
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.notify_task_comment() FROM PUBLIC, anon, authenticated;

COMMIT;
