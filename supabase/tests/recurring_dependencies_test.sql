-- Recurring tasks and dependencies. Runs inside one transaction and rolls back.

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
-- Finish a task the way the app does: an update with proof, then the move.
CREATE FUNCTION tests.finish(p_task UUID, p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  INSERT INTO public.task_comments (task_id, user_id, comment, kind, from_stage, to_stage, progress_percent, evidence)
  VALUES (p_task, p_user, 'Done', 'status_update', 'in_progress', 'completed', 100, '[{"kind":"link","url":"https://example.com","name":"example.com"}]');
  UPDATE public.tasks SET stage = 'completed', progress_percent = 100, completed_at = now() WHERE id = p_task;
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

-- ── Fixtures ───────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'lead@home.test', 'Lead Person', 'lead',      'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a1', 'ama@home.test',  'Ama Owusu',   'employee',  'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a2', 'kofi@home.test', 'Kofi Mensah', 'employee',  'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000ec', 'exec@home.test', 'The Exec',    'executive', 'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'out@other.test', 'Outsider',    'lead',      'e1000000-0000-4000-8000-000000000001');
INSERT INTO projects (id, name, company_id) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'Home project', 'a1000000-0000-4000-8000-000000000001'),
  ('e2000000-0000-4000-8000-000000000001', 'Other project', 'e1000000-0000-4000-8000-000000000001');

-- ── Schedules ──────────────────────────────────────────────────────────────

SELECT tests.check('weekdays: Friday is followed by Monday', private.next_occurrence('2026-11-27', 'weekdays') = '2026-11-30');
SELECT tests.check('monthly: 31 January is followed by 28 February', private.next_occurrence('2027-01-31', 'monthly') = '2027-02-28');
SELECT tests.check('weekly adds seven days', private.next_occurrence('2026-11-26', 'weekly') = '2026-12-03');

-- ── A weekly task repeats when it is done ──────────────────────────────────

INSERT INTO tasks (id, title, project_id, assignee_id, created_by, stage, due_date, start_date, repeat, acknowledged_at, acknowledged_by) VALUES
  ('a3000000-0000-4000-8000-0000000000d1', 'Weekly site safety walk', 'a2000000-0000-4000-8000-000000000001',
   'aa000000-0000-4000-8000-0000000000a2', 'aa000000-0000-4000-8000-0000000000ad', 'in_progress',
   current_date - 3, current_date - 4, 'weekly', now() - interval '10 days', 'aa000000-0000-4000-8000-0000000000a2'),
  ('a3000000-0000-4000-8000-0000000000d2', 'One-off task', 'a2000000-0000-4000-8000-000000000001',
   'aa000000-0000-4000-8000-0000000000a2', NULL, 'in_progress', current_date, NULL, NULL, now(), 'aa000000-0000-4000-8000-0000000000a2');

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a2');
SET LOCAL ROLE authenticated;
SELECT tests.finish('a3000000-0000-4000-8000-0000000000d1', 'aa000000-0000-4000-8000-0000000000a2');
SELECT tests.finish('a3000000-0000-4000-8000-0000000000d2', 'aa000000-0000-4000-8000-0000000000a2');
RESET ROLE;

SELECT tests.check('finishing a weekly task creates the next one, after today, for the same owner',
  (SELECT count(*) = 1 AND bool_and(due_date = current_date + 4 AND assignee_id = 'aa000000-0000-4000-8000-0000000000a2'
          AND stage = 'yet_to_start' AND progress_percent = 0 AND repeat = 'weekly')
     FROM tasks WHERE series_id = 'a3000000-0000-4000-8000-0000000000d1' AND id <> 'a3000000-0000-4000-8000-0000000000d1'));
SELECT tests.check('its planned start moves by the same amount',
  (SELECT start_date FROM tasks WHERE series_id = 'a3000000-0000-4000-8000-0000000000d1' AND stage = 'yet_to_start') = current_date + 3);
SELECT tests.check('an accepted repeat stays accepted',
  (SELECT acknowledged_by FROM tasks WHERE series_id = 'a3000000-0000-4000-8000-0000000000d1' AND stage = 'yet_to_start') = 'aa000000-0000-4000-8000-0000000000a2');
SELECT tests.check('a one-off task does not repeat',
  NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'One-off task' AND id <> 'a3000000-0000-4000-8000-0000000000d2'));

-- Reopen and finish again: still one open copy.
UPDATE tasks SET stage = 'in_progress', completed_at = NULL WHERE id = 'a3000000-0000-4000-8000-0000000000d1';
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a2');
SET LOCAL ROLE authenticated;
SELECT tests.finish('a3000000-0000-4000-8000-0000000000d1', 'aa000000-0000-4000-8000-0000000000a2');
RESET ROLE;
SELECT tests.check('finishing twice never makes two open copies',
  (SELECT count(*) FROM tasks WHERE series_id = 'a3000000-0000-4000-8000-0000000000d1' AND stage <> 'completed') = 1);

-- ── Dependencies ───────────────────────────────────────────────────────────

INSERT INTO tasks (id, title, project_id, assignee_id, stage, acknowledged_at) VALUES
  ('a3000000-0000-4000-8000-0000000000aa', 'Formwork up',  'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'in_progress', now()),
  ('a3000000-0000-4000-8000-0000000000bb', 'Pour slab',    'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2', 'yet_to_start', now()),
  ('a3000000-0000-4000-8000-0000000000cc', 'Rebar check',  'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'in_progress', now()),
  ('e3000000-0000-4000-8000-0000000000ee', 'Elsewhere',    'e2000000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-0000000000e1', 'in_progress', now());

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000bb', 'a3000000-0000-4000-8000-0000000000aa');
SELECT tests.check('a lead can make the slab wait on the formwork',
  EXISTS (SELECT 1 FROM task_dependencies WHERE task_id = 'a3000000-0000-4000-8000-0000000000bb'));
SELECT tests.refused('a direct loop is refused',
  $$INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000aa', 'a3000000-0000-4000-8000-0000000000bb')$$);
INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000cc', 'a3000000-0000-4000-8000-0000000000bb');
SELECT tests.refused('an indirect loop is refused',
  $$INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000aa', 'a3000000-0000-4000-8000-0000000000cc')$$);
DELETE FROM task_dependencies WHERE task_id = 'a3000000-0000-4000-8000-0000000000cc';
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
SELECT tests.refused('staff cannot add links to a task they do not own',
  $$INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000bb', 'a3000000-0000-4000-8000-0000000000cc')$$);
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a2');
SET LOCAL ROLE authenticated;
INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000bb', 'a3000000-0000-4000-8000-0000000000cc');
SELECT tests.check('the owner of the waiting task can add what it waits on',
  (SELECT count(*) FROM task_dependencies WHERE task_id = 'a3000000-0000-4000-8000-0000000000bb') = 2);
SELECT tests.refused('a task in another organisation cannot be linked',
  $$INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000bb', 'e3000000-0000-4000-8000-0000000000ee')$$);
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.refused('an executive cannot change links',
  $$INSERT INTO task_dependencies (task_id, depends_on) VALUES ('a3000000-0000-4000-8000-0000000000cc', 'a3000000-0000-4000-8000-0000000000aa')$$);
RESET ROLE;

-- Finishing one of two blockers says nothing; finishing the last one tells Kofi.
DELETE FROM notifications;
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
SELECT tests.finish('a3000000-0000-4000-8000-0000000000aa', 'aa000000-0000-4000-8000-0000000000a1');
RESET ROLE;
SELECT tests.check('while something else is still pending, no "you can start"',
  NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'unblocked'));
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
SELECT tests.finish('a3000000-0000-4000-8000-0000000000cc', 'aa000000-0000-4000-8000-0000000000a1');
RESET ROLE;
SELECT tests.check('when the last one is done, the owner is told they can start',
  (SELECT count(*) FROM notifications WHERE type = 'unblocked' AND user_id = 'aa000000-0000-4000-8000-0000000000a2'
     AND title = 'You can start: Pour slab') = 1);

SELECT tests.check('links are published for live updates',
  EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_dependencies'));

ROLLBACK;
