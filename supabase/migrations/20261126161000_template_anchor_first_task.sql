-- Templates: count offsets from when the first task starts, not from the
-- project's recorded start date. Synced and imported projects often have a
-- start date months before their tasks, which pushed every task in a new
-- project far past its start. Milestones before the first task land on day 0.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_project_as_template(p_project UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_anchor DATE;
  v_ids    UUID[];
  v_tasks  JSONB;
  v_ms     JSONB;
  v_deps   JSONB;
  v_id     UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project) THEN
    RAISE EXCEPTION 'That project isn''t available.';
  END IF;

  -- Offsets count from when the first task starts. A project's recorded
  -- start can be months before its tasks (imported or synced projects), which
  -- would push every task far past the new project's start.
  SELECT coalesce((SELECT min(coalesce(t.start_date, t.created_at::date)) FROM public.tasks t
                    WHERE t.project_id = p.id AND t.archived_at IS NULL),
                  p.start_date, p.created_at::date)
    INTO v_anchor FROM public.projects p WHERE p.id = p_project;

  SELECT array_agg(id ORDER BY ord), jsonb_agg(item ORDER BY ord) INTO v_ids, v_tasks FROM (
    SELECT t.id,
           row_number() OVER (ORDER BY coalesce(t.start_date, t.created_at::date), t.due_date NULLS LAST, t.title) AS ord,
           jsonb_build_object(
             'title', t.title, 'description', t.description, 'priority', t.priority, 'repeat', t.repeat,
             'start_offset', coalesce(t.start_date, t.created_at::date) - v_anchor,
             'duration', CASE WHEN t.due_date IS NOT NULL THEN greatest(0, t.due_date - coalesce(t.start_date, t.created_at::date)) END
           ) AS item
      FROM public.tasks t
     WHERE t.project_id = p_project AND t.archived_at IS NULL
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'description', m.description, 'offset', greatest(0, m.due_date - v_anchor))
                            ORDER BY m.due_date), '[]')
    INTO v_ms FROM public.milestones m
   WHERE m.project_id = p_project AND m.due_date IS NOT NULL AND m.archived_at IS NULL;

  SELECT coalesce(jsonb_agg(jsonb_build_array(array_position(v_ids, d.task_id) - 1, array_position(v_ids, d.depends_on) - 1)), '[]')
    INTO v_deps FROM public.task_dependencies d
   WHERE d.task_id = ANY (v_ids) AND d.depends_on = ANY (v_ids);

  INSERT INTO public.project_templates (name, description, tasks, milestones, dependencies)
  VALUES (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), coalesce(v_tasks, '[]'), v_ms, v_deps)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

COMMIT;
