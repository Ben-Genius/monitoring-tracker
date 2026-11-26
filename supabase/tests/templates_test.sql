-- Project templates: save a project's plan, start a new project from it.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated;
CREATE FUNCTION tests.check(label TEXT, ok BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;
CREATE FUNCTION tests.refused(label TEXT, stmt TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok  % (refused: %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: % (was allowed)', label;
END $$;
CREATE FUNCTION tests.sign_in(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'lead@home.test', 'Lead',  'lead',      'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a1', 'ama@home.test',  'Ama',   'employee',  'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000ec', 'exec@home.test', 'Exec',  'executive', 'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'out@other.test', 'Out',   'lead',      'e1000000-0000-4000-8000-000000000001');

-- A finished project to learn from: starts 1 Mar; three tasks; one waits on another; one milestone.
INSERT INTO projects (id, name, company_id, contract_value, start_date, expected_handover) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'Warehouse A', 'a1000000-0000-4000-8000-000000000001', 100, '2026-03-01', '2026-04-30');
INSERT INTO tasks (id, title, project_id, company_id, assignee_id, stage, priority, start_date, due_date) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'Site survey', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'completed', 'high', '2026-03-01', '2026-03-05'),
  ('a3000000-0000-4000-8000-000000000002', 'Foundations', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'completed', 'medium', '2026-03-06', '2026-03-20'),
  ('a3000000-0000-4000-8000-000000000003', 'Roof', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, 'completed', 'medium', '2026-03-21', NULL);
INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001');
INSERT INTO milestones (project_id, name, due_date) VALUES ('a2000000-0000-4000-8000-000000000001', 'Handover inspection', '2026-04-15');

-- ── Saving ─────────────────────────────────────────────────────────────────
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
SELECT tests.refused('staff cannot save templates',
  $$SELECT save_project_as_template('a2000000-0000-4000-8000-000000000001', 'Nope')$$);
RESET ROLE;
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.refused('executives cannot save templates',
  $$SELECT save_project_as_template('a2000000-0000-4000-8000-000000000001', 'Nope')$$);
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE t_id AS SELECT save_project_as_template('a2000000-0000-4000-8000-000000000001', 'Standard warehouse', 'Our usual plan') AS id;
SELECT tests.check('the template holds three tasks in order, as offsets from the start',
  (SELECT jsonb_agg(x->>'title') FROM project_templates t, jsonb_array_elements(t.tasks) x WHERE t.id = (SELECT id FROM t_id)) = '["Site survey", "Foundations", "Roof"]'
  AND (SELECT tasks->1->>'start_offset' FROM project_templates WHERE id = (SELECT id FROM t_id)) = '5'
  AND (SELECT tasks->1->>'duration' FROM project_templates WHERE id = (SELECT id FROM t_id)) = '14');
SELECT tests.check('a task with no deadline keeps no duration',
  (SELECT tasks->2->'duration' FROM project_templates WHERE id = (SELECT id FROM t_id)) = 'null');
SELECT tests.check('the milestone and the dependency are kept',
  (SELECT milestones->0->>'offset' FROM project_templates WHERE id = (SELECT id FROM t_id)) = '45'
  AND (SELECT dependencies FROM project_templates WHERE id = (SELECT id FROM t_id)) = '[[1, 0]]');
SELECT tests.check('owners and progress are not copied into the template',
  NOT EXISTS (SELECT 1 FROM project_templates t, jsonb_array_elements(t.tasks) x WHERE x ? 'assignee_id' OR x ? 'stage'));

-- ── Starting a new project from it ─────────────────────────────────────────
CREATE TEMP TABLE p_id AS SELECT create_project_from_template((SELECT id FROM t_id), 'Warehouse B', 'a1000000-0000-4000-8000-000000000001', '2027-01-10', 250000) AS id;
SELECT tests.check('the new project starts on its own date, handover at the last milestone',
  (SELECT start_date = '2027-01-10' AND expected_handover = '2027-02-24' AND contract_value = 250000 FROM projects WHERE id = (SELECT id FROM p_id)));
SELECT tests.check('tasks are shifted to the new dates, unassigned and not started',
  (SELECT jsonb_agg(jsonb_build_array(title, start_date, due_date) ORDER BY start_date) FROM tasks WHERE project_id = (SELECT id FROM p_id))
    = '[["Site survey", "2027-01-10", "2027-01-14"], ["Foundations", "2027-01-15", "2027-01-29"], ["Roof", "2027-01-30", null]]'
  AND NOT EXISTS (SELECT 1 FROM tasks WHERE project_id = (SELECT id FROM p_id) AND (assignee_id IS NOT NULL OR stage <> 'yet_to_start')));
SELECT tests.check('the dependency links the new tasks',
  EXISTS (SELECT 1 FROM task_dependencies d JOIN tasks a ON a.id = d.task_id JOIN tasks b ON b.id = d.depends_on
           WHERE a.project_id = (SELECT id FROM p_id) AND a.title = 'Foundations' AND b.title = 'Site survey'));
SELECT tests.check('the milestone lands on the new date',
  (SELECT due_date FROM milestones WHERE project_id = (SELECT id FROM p_id)) = '2027-02-24');
RESET ROLE;

-- ── Other organisations ────────────────────────────────────────────────────
GRANT SELECT ON t_id TO authenticated;
SELECT tests.sign_in('ee000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
SELECT tests.check('another organisation cannot see the template',
  NOT EXISTS (SELECT 1 FROM project_templates));
SELECT tests.refused('another organisation cannot use it',
  $$SELECT create_project_from_template((SELECT id FROM t_id), 'Stolen', 'e1000000-0000-4000-8000-000000000001', '2027-01-01')$$);
RESET ROLE;

-- ── A synced project whose recorded start is long before its tasks ────────
INSERT INTO projects (id, name, company_id, contract_value, start_date) VALUES
  ('a2000000-0000-4000-8000-000000000009', 'Synced', 'a1000000-0000-4000-8000-000000000001', 0, '2025-01-01');
INSERT INTO tasks (title, project_id, company_id, stage, start_date, due_date) VALUES
  ('First job', 'a2000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000001', 'completed', '2026-06-01', '2026-06-03');
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE t2 AS SELECT save_project_as_template('a2000000-0000-4000-8000-000000000009', 'Synced plan') AS id;
CREATE TEMP TABLE p2 AS SELECT create_project_from_template((SELECT id FROM t2), 'From synced', 'a1000000-0000-4000-8000-000000000001', '2027-03-01') AS id;
SELECT tests.check('the first task starts on the new project''s start, not months later',
  (SELECT start_date FROM tasks WHERE project_id = (SELECT id FROM p2)) = '2027-03-01');
RESET ROLE;

ROLLBACK;
