-- WhatsApp updates: people report on their own tasks by messaging the
-- business WhatsApp number. The webhook (api/whatsapp-webhook.ts) runs with
-- the service role; everything it may do goes through the functions below,
-- which apply the same rules as the app:
--
--   * only the task's owner (assignee, or one of its assignees) can update it
--   * a progress, blocked or done update says what moved (a note is required)
--   * Done needs proof: the existing require_completion_evidence trigger
--     applies, because each update runs as the person (auth.uid() is set)
--   * the update lands in task_comments and moves the task exactly like the
--     app's update sheet, so notifications, the brief and the audit log follow
--
-- Phone numbers live in whatsapp_links, which only the service role can
-- read, so colleagues never see each other's WhatsApp numbers.

BEGIN;

-- ── Tables (service role only) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.whatsapp_links (
  user_id   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone     TEXT NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{8,15}$'),  -- E.164 digits, no "+"
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_link_codes (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  expires_at TIMESTAMPTZ NOT NULL
);

-- The numbered list a person last saw, so "2 done" means the right task.
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  task_ids   UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp may deliver the same message twice; each is handled once.
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound (
  message_id  TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_links', 'whatsapp_link_codes', 'whatsapp_sessions', 'whatsapp_inbound'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $$;

-- ── The app: link or unlink your own number ─────────────────────────────────

-- A fresh 6-digit code, valid for 15 minutes. The person sends "LINK <code>"
-- from their WhatsApp; the webhook matches it to them.
CREATE OR REPLACE FUNCTION public.create_whatsapp_link_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_code TEXT := lpad((floor(random() * 1000000))::int::text, 6, '0');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND deactivated_at IS NULL) THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  INSERT INTO public.whatsapp_link_codes (user_id, code, expires_at)
  VALUES (auth.uid(), v_code, now() + interval '15 minutes')
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at;
  RETURN v_code;
END $$;

-- Whether you are linked, with the number masked ("•••• 4821").
CREATE OR REPLACE FUNCTION public.my_whatsapp_link()
RETURNS TABLE (linked BOOLEAN, phone_hint TEXT, linked_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT true, '•••• ' || right(phone, 4), linked_at FROM public.whatsapp_links WHERE user_id = auth.uid()
  UNION ALL
  SELECT false, NULL, NULL WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_links WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.unlink_whatsapp()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM public.whatsapp_links WHERE user_id = auth.uid();
  DELETE FROM public.whatsapp_sessions WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.create_whatsapp_link_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_whatsapp_link() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlink_whatsapp() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_whatsapp_link_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_whatsapp_link() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_whatsapp() TO authenticated;

-- ── The webhook (service role) ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.whatsapp_claim_message(p_message_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.whatsapp_inbound (message_id) VALUES (p_message_id) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END $$;

-- Links the number that sent "LINK <code>". Returns the person's first name, or null.
CREATE OR REPLACE FUNCTION public.whatsapp_link(p_phone TEXT, p_code TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user UUID; v_name TEXT;
BEGIN
  SELECT c.user_id, u.name INTO v_user, v_name
    FROM public.whatsapp_link_codes c JOIN public.users u ON u.id = c.user_id
   WHERE c.code = p_code AND c.expires_at > now() AND u.deactivated_at IS NULL;
  IF v_user IS NULL THEN RETURN NULL; END IF;
  -- A number belongs to one person; relinking moves it.
  DELETE FROM public.whatsapp_links WHERE phone = p_phone OR user_id = v_user;
  INSERT INTO public.whatsapp_links (user_id, phone) VALUES (v_user, p_phone);
  DELETE FROM public.whatsapp_link_codes WHERE user_id = v_user;
  RETURN split_part(v_name, ' ', 1);
END $$;

-- Who a number belongs to (active people only).
CREATE OR REPLACE FUNCTION public.whatsapp_user(p_phone TEXT)
RETURNS TABLE (user_id UUID, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id, u.name FROM public.whatsapp_links l JOIN public.users u ON u.id = l.user_id
   WHERE l.phone = p_phone AND u.deactivated_at IS NULL AND u.organization_id IS NOT NULL;
$$;

-- The person's open tasks, waiting-on-you first, and remembers the numbering.
CREATE OR REPLACE FUNCTION public.whatsapp_my_tasks(p_user UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_list JSONB; v_ids UUID[];
BEGIN
  WITH mine AS (
    SELECT t.id, t.title, t.stage, coalesce(t.progress_percent, 0) AS progress, t.due_date,
           t.acknowledged_at IS NULL AS needs_accept, coalesce(t.is_urgent, false) AS urgent,
           p.name AS project
      FROM public.tasks t
      LEFT JOIN public.projects p ON p.id = t.project_id
     WHERE t.archived_at IS NULL AND t.stage <> 'completed'
       AND (t.assignee_id = p_user OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = t.id AND a.user_id = p_user))
       AND COALESCE(private.project_org(t.project_id), private.company_org(t.company_id)) = (SELECT organization_id FROM public.users WHERE id = p_user)
     ORDER BY urgent DESC, needs_accept DESC, (t.stage = 'blockers') DESC, t.due_date NULLS LAST, t.title
     LIMIT 15
  )
  SELECT coalesce(jsonb_agg(to_jsonb(mine)), '[]'), coalesce(array_agg(id), '{}') INTO v_list, v_ids FROM mine;
  INSERT INTO public.whatsapp_sessions (user_id, task_ids, updated_at) VALUES (p_user, v_ids, now())
  ON CONFLICT (user_id) DO UPDATE SET task_ids = EXCLUDED.task_ids, updated_at = now();
  RETURN v_list;
END $$;

-- The task behind number n in the person's last list (lists expire after a day).
CREATE OR REPLACE FUNCTION public.whatsapp_task_at(p_user UUID, p_index INT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT task_ids[p_index] FROM public.whatsapp_sessions
   WHERE user_id = p_user AND updated_at > now() - interval '1 day';
$$;

-- Applies one update as the person. Returns a short confirmation, or raises
-- an error whose message is safe to send back to them.
CREATE OR REPLACE FUNCTION public.whatsapp_apply_update(
  p_user UUID, p_task UUID, p_action TEXT, p_progress INT DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_evidence JSONB DEFAULT '[]'::jsonb
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_org  UUID;
  v_note TEXT := nullif(btrim(coalesce(p_note, '')), '');
  v_to   TEXT;
BEGIN
  SELECT organization_id INTO v_org FROM public.users WHERE id = p_user AND deactivated_at IS NULL;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task AND archived_at IS NULL;
  IF v_org IS NULL OR v_task.id IS NULL
     OR COALESCE(private.project_org(v_task.project_id), private.company_org(v_task.company_id)) IS DISTINCT FROM v_org
     OR NOT (v_task.assignee_id = p_user OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = p_task AND a.user_id = p_user)) THEN
    RAISE EXCEPTION 'That task isn''t one of yours. Send "tasks" to see your list.';
  END IF;
  IF v_task.stage = 'completed' THEN
    RAISE EXCEPTION '"%" is already done.', v_task.title;
  END IF;

  -- From here on the database sees this person as the one acting, so the
  -- proof-of-done rule, notifications and movement tracking all apply.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);

  IF p_action = 'accept' THEN
    IF v_task.acknowledged_at IS NOT NULL THEN RETURN format('You''d already accepted "%s".', v_task.title); END IF;
    UPDATE public.tasks SET acknowledged_at = now(), acknowledged_by = p_user WHERE id = p_task;
    INSERT INTO public.audit_log (entity_type, entity_id, action, field, summary, user_id)
    VALUES ('task', p_task, 'updated', 'acknowledged_at', format('Task "%s" was accepted by its owner (WhatsApp)', v_task.title), p_user);
    RETURN format('Accepted "%s".', v_task.title);
  END IF;

  IF p_action NOT IN ('progress', 'blocked', 'done') THEN
    RAISE EXCEPTION 'Unknown update.';
  END IF;
  IF v_note IS NULL THEN
    RAISE EXCEPTION 'Add a few words on what moved, for example "2 50%% slab poured".';
  END IF;
  IF p_action = 'progress' AND (p_progress IS NULL OR p_progress NOT IN (25, 50, 75)) THEN
    RAISE EXCEPTION 'Progress goes in steps: 25%%, 50%% or 75%%. Say "done" when it''s finished.';
  END IF;
  IF p_action = 'done' AND jsonb_array_length(coalesce(p_evidence, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Done needs proof: send a photo of the finished work with the caption "<number> done <what was delivered>", or include a link.';
  END IF;

  v_to := CASE p_action WHEN 'progress' THEN 'in_progress' WHEN 'blocked' THEN 'blockers' ELSE 'completed' END;

  INSERT INTO public.task_comments (task_id, user_id, comment, kind, from_stage, to_stage, progress_percent, evidence)
  VALUES (p_task, p_user, left(v_note, 2000), 'status_update', v_task.stage, v_to,
          CASE v_to WHEN 'completed' THEN 100 WHEN 'in_progress' THEN p_progress ELSE NULL END,
          coalesce(p_evidence, '[]'::jsonb));

  UPDATE public.tasks SET
    stage = v_to,
    progress_percent = CASE v_to WHEN 'completed' THEN 100 WHEN 'in_progress' THEN p_progress ELSE progress_percent END,
    completed_at = CASE WHEN v_to = 'completed' THEN now() ELSE NULL END,
    blocker_description = CASE WHEN v_to = 'blockers' THEN left(v_note, 500) ELSE blocker_description END,
    blocked_by = CASE WHEN v_to = 'blockers' THEN blocked_by ELSE NULL END,
    -- Starting work on a task you never accepted accepts it.
    acknowledged_at = coalesce(acknowledged_at, now()),
    acknowledged_by = coalesce(acknowledged_by, p_user)
  WHERE id = p_task;

  IF v_task.stage IS DISTINCT FROM v_to THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, field, old_value, new_value, summary, user_id)
    VALUES ('task', p_task, 'stage_changed', 'stage', v_task.stage, v_to,
            format('Task "%s" moved from %s to %s (WhatsApp)', v_task.title, replace(v_task.stage, '_', ' '), replace(v_to, '_', ' ')), p_user);
  END IF;

  RETURN CASE p_action
    WHEN 'progress' THEN format('"%s" is now %s%% done.', v_task.title, p_progress)
    WHEN 'blocked'  THEN format('"%s" is marked blocked. Your lead can see why.', v_task.title)
    ELSE format('"%s" is done. Well done.', v_task.title)
  END;
END $$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.whatsapp_claim_message(TEXT)', 'public.whatsapp_link(TEXT, TEXT)', 'public.whatsapp_user(TEXT)',
    'public.whatsapp_my_tasks(UUID)', 'public.whatsapp_task_at(UUID, INT)',
    'public.whatsapp_apply_update(UUID, UUID, TEXT, INT, TEXT, JSONB)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;
