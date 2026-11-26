-- Project templates: save a project's tasks, milestones and dependencies as
-- a reusable plan, then start new projects from it.
--
-- A template stores dates as offsets in days from the project's start, so a
-- new project gets the same shape on its own dates. Tasks start unassigned
-- and not started; ownership is decided for each new project.
--
-- Both functions run with the caller's own permissions (SECURITY INVOKER), so
-- the existing rules decide who may create projects, tasks and links where.
-- Templates belong to one organisation; admins, PAs and leads make them.

BEGIN;

CREATE TABLE IF NOT EXISTS public.project_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT private.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description     TEXT,
  -- [{title, description, priority, repeat, start_offset, duration}]
  tasks           JSONB NOT NULL DEFAULT '[]',
  -- [{name, description, offset}]
  milestones      JSONB NOT NULL DEFAULT '[]',
  -- [[task index, index of the task it waits on], ...]
  dependencies    JSONB NOT NULL DEFAULT '[]',
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_templates_org ON public.project_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON public.project_templates(created_by);
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.project_templates TO authenticated;

DROP POLICY IF EXISTS "Same organisation only" ON public.project_templates;
CREATE POLICY "Same organisation only" ON public.project_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organization_id = (SELECT private.current_org_id()))
  WITH CHECK (organization_id = (SELECT private.current_org_id()));

DROP POLICY IF EXISTS "Read templates" ON public.project_templates;
CREATE POLICY "Read templates" ON public.project_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Planners create templates" ON public.project_templates;
CREATE POLICY "Planners create templates" ON public.project_templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'pa', 'lead'));

DROP POLICY IF EXISTS "Creator or admin deletes templates" ON public.project_templates;
CREATE POLICY "Creator or admin deletes templates" ON public.project_templates
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT private.current_user_role()) = 'admin');

-- ── Save a project as a template ────────────────────────────────────────────
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

  -- Offsets count from the project's start, or its earliest task.
  SELECT coalesce(p.start_date,
                  (SELECT min(coalesce(t.start_date, t.created_at::date)) FROM public.tasks t
                    WHERE t.project_id = p.id AND t.archived_at IS NULL),
                  p.created_at::date)
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

  SELECT coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'description', m.description, 'offset', m.due_date - v_anchor)
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

-- ── Start a project from a template ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_project_from_template(
  p_template UUID, p_name TEXT, p_company UUID, p_start DATE,
  p_contract_value NUMERIC DEFAULT 0, p_handover DATE DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_t       public.project_templates%ROWTYPE;
  v_project UUID;
  v_ids     UUID[] := '{}';
  v_task    JSONB;
  v_new     UUID;
  v_dep     JSONB;
  v_end     INT;
BEGIN
  SELECT * INTO v_t FROM public.project_templates WHERE id = p_template;
  IF NOT FOUND THEN RAISE EXCEPTION 'That template isn''t available.'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'Give the project a name.'; END IF;
  IF p_start IS NULL THEN RAISE EXCEPTION 'Choose a start date.'; END IF;

  -- Handover defaults to the end of the latest task or milestone.
  SELECT greatest(
           coalesce((SELECT max((x->>'start_offset')::int + coalesce((x->>'duration')::int, 0)) FROM jsonb_array_elements(v_t.tasks) x), 0),
           coalesce((SELECT max((x->>'offset')::int) FROM jsonb_array_elements(v_t.milestones) x), 0))
    INTO v_end;

  INSERT INTO public.projects (name, description, company_id, status, contract_value, start_date, expected_handover, created_by)
  VALUES (btrim(p_name), v_t.description, p_company, 'active', coalesce(p_contract_value, 0), p_start,
          coalesce(p_handover, p_start + v_end), auth.uid())
  RETURNING id INTO v_project;

  FOR v_task IN SELECT x FROM jsonb_array_elements(v_t.tasks) x LOOP
    INSERT INTO public.tasks (title, description, project_id, company_id, priority, repeat, stage, progress_percent,
                              start_date, due_date, created_by)
    VALUES (v_task->>'title', v_task->>'description', v_project, p_company,
            coalesce(v_task->>'priority', 'medium'), v_task->>'repeat', 'yet_to_start', 0,
            p_start + (v_task->>'start_offset')::int,
            CASE WHEN v_task->>'duration' IS NOT NULL THEN p_start + (v_task->>'start_offset')::int + (v_task->>'duration')::int END,
            auth.uid())
    RETURNING id INTO v_new;
    v_ids := v_ids || v_new;
  END LOOP;

  INSERT INTO public.milestones (project_id, name, description, due_date, status, created_by)
  SELECT v_project, x->>'name', x->>'description', p_start + (x->>'offset')::int, 'pending', auth.uid()
    FROM jsonb_array_elements(v_t.milestones) x;

  FOR v_dep IN SELECT x FROM jsonb_array_elements(v_t.dependencies) x LOOP
    INSERT INTO public.task_dependencies (task_id, depends_on)
    VALUES (v_ids[(v_dep->>0)::int + 1], v_ids[(v_dep->>1)::int + 1])
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_project;
END $$;

REVOKE ALL ON FUNCTION public.save_project_as_template(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_project_from_template(UUID, TEXT, UUID, DATE, NUMERIC, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_project_as_template(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_from_template(UUID, TEXT, UUID, DATE, NUMERIC, DATE) TO authenticated;

COMMIT;
