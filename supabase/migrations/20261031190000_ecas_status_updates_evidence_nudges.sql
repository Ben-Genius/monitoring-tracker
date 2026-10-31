-- ECAS step 5: every status change carries an update; Done carries proof;
-- Mr Blay can leave an optional nudge.

-- 1. Updates live in task_comments so there is one feed per task.
ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'status_update', 'nudge')),
  ADD COLUMN IF NOT EXISTS from_stage TEXT,
  ADD COLUMN IF NOT EXISTS to_stage TEXT,
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER CHECK (progress_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.task_comments.evidence IS 'Proof attached to an update: [{kind:"file",path,name,type,size} | {kind:"link",url,name}]';
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON public.task_comments(task_id, created_at);

-- Anyone who can see a task can post on it: company members (including on
-- tasks without a project), and the global roles across all companies.
DROP POLICY IF EXISTS "Users can create comments on accessible tasks" ON public.task_comments;
CREATE POLICY "Users can create comments on accessible tasks" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.tasks t
      LEFT JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND (COALESCE(p.company_id, t.company_id) = (SELECT private.current_company_id())
             OR (SELECT private.has_global_access()))
    )
  );
DROP POLICY IF EXISTS "Users can view comments on accessible tasks" ON public.task_comments;
CREATE POLICY "Users can view comments on accessible tasks" ON public.task_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_comments.task_id
      AND COALESCE(p.company_id, t.company_id) = (SELECT private.current_company_id())
  ));

-- 2. Done needs proof. The app posts the update with evidence, then moves the
-- task; this refuses a move to Done without one. The Baserow sync has no
-- signed-in user and is exempt.
CREATE OR REPLACE FUNCTION private.require_completion_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.stage = 'completed' AND OLD.stage IS DISTINCT FROM 'completed'
     AND NOT EXISTS (
       SELECT 1 FROM public.task_comments c
       WHERE c.task_id = NEW.id AND c.to_stage = 'completed' AND c.kind = 'status_update'
         AND jsonb_array_length(c.evidence) > 0 AND c.created_at > now() - interval '30 minutes'
     ) THEN
    RAISE EXCEPTION 'Add proof of the finished work before marking this task done.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.require_completion_evidence() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS require_completion_evidence_trigger ON public.tasks;
CREATE TRIGGER require_completion_evidence_trigger
  BEFORE UPDATE OF stage ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.require_completion_evidence();

-- 3. Notifications for comments and nudges.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('assigned','stage_changed','blocked','blocking_you','progress','accepted','comment','nudge'));

CREATE OR REPLACE FUNCTION private.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_author TEXT;
BEGIN
  -- Status updates are already announced by the task trigger.
  IF NEW.kind = 'status_update' THEN RETURN NEW; END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  SELECT name INTO v_author FROM public.users WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, task_id, actor_id, type, title, body)
  SELECT DISTINCT r, NEW.task_id, NEW.user_id,
         CASE WHEN NEW.kind = 'nudge' THEN 'nudge' ELSE 'comment' END,
         CASE WHEN NEW.kind = 'nudge' THEN COALESCE(v_author, 'Mr Blay') || ' left a note on your task'
              ELSE COALESCE(v_author, 'Someone') || ' commented' END,
         v_task.title || ': ' || left(NEW.comment, 140)
  FROM (
    SELECT v_task.assignee_id AS r
    UNION SELECT v_task.created_by
    UNION SELECT id FROM public.users WHERE role = 'pa' AND NEW.kind = 'nudge'
  ) s
  WHERE r IS NOT NULL AND r <> NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.notify_task_comment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_task_comment_trigger ON public.task_comments;
CREATE TRIGGER notify_task_comment_trigger
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION private.notify_task_comment();

-- Only the executive's notes count as nudges.
CREATE OR REPLACE FUNCTION private.guard_comment_kind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kind = 'nudge' AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.user_id AND role = 'executive') THEN
    NEW.kind := 'comment';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.guard_comment_kind() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_comment_kind_trigger ON public.task_comments;
CREATE TRIGGER guard_comment_kind_trigger
  BEFORE INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION private.guard_comment_kind();

-- 4. Private bucket for evidence files: <task_id>/<file>. Access follows the
-- task: if you can read the task, you can read and add its evidence.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-evidence', 'task-evidence', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Read evidence for visible tasks" ON storage.objects;
CREATE POLICY "Read evidence for visible tasks" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-evidence' AND EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id::text = (storage.foldername(name))[1]));
DROP POLICY IF EXISTS "Upload evidence for visible tasks" ON storage.objects;
CREATE POLICY "Upload evidence for visible tasks" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-evidence' AND EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id::text = (storage.foldername(name))[1]));

-- 5. Private bucket for project documents (applied separately as project_files_bucket).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-files', 'project-files', false, 26214400)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;
DROP POLICY IF EXISTS "Read files for visible projects" ON storage.objects;
CREATE POLICY "Read files for visible projects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-files' AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1]));
DROP POLICY IF EXISTS "Upload files for visible projects" ON storage.objects;
CREATE POLICY "Upload files for visible projects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1]));
