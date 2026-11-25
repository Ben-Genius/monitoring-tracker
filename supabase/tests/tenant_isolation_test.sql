-- Tenant isolation: nobody can read or write another organisation's data.
-- Runs inside one transaction and rolls back, so it leaves nothing behind.
-- Any failed check raises and stops the run (ON_ERROR_STOP in test-db.sh).

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

CREATE FUNCTION tests.check(label TEXT, ok BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

-- Runs a statement that must be refused.
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

-- Runs a statement whose outcome is checked afterwards: being refused and
-- being quietly ignored are both acceptable.
CREATE FUNCTION tests.attempt(stmt TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Signs in as a user for the rest of the transaction, the way PostgREST does.
CREATE FUNCTION tests.sign_in(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated',
                      'email', (SELECT email FROM public.users WHERE id = p_user))::text, true);
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

-- ── Fixtures (as the migration owner, so RLS does not apply) ───────────────
-- Org A is the default organisation every existing row was moved into.
-- Org B is a second customer.

INSERT INTO organizations (id, name, slug) VALUES
  ('b0000000-0000-4000-8000-00000000000b', 'Second Customer', 'second-customer');

INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'A Construction', '00000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'A Energy',       '00000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'B Mining',       'b0000000-0000-4000-8000-00000000000b');

INSERT INTO users (id, email, name, role, company_id, organization_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'admin.a@test', 'Admin A', 'admin', NULL, '00000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000aa', 'pa.a@test',    'PA A',    'pa',    NULL, '00000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000e1', 'lead.a@test',  'Lead A',  'lead',  'a1000000-0000-4000-8000-000000000001', NULL),
  ('bb000000-0000-4000-8000-0000000000ad', 'admin.b@test', 'Admin B', 'admin', NULL, 'b0000000-0000-4000-8000-00000000000b'),
  ('bb000000-0000-4000-8000-0000000000aa', 'pa.b@test',    'PA B',    'pa',    NULL, 'b0000000-0000-4000-8000-00000000000b'),
  ('bb000000-0000-4000-8000-0000000000ec', 'exec.b@test',  'Exec B',  'executive', NULL, 'b0000000-0000-4000-8000-00000000000b');

INSERT INTO projects (id, name, company_id, created_by) VALUES
  ('a0000000-0000-4000-8000-0000000000a1', 'Project A1', 'a1000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000ad'),
  ('a0000000-0000-4000-8000-0000000000a2', 'Project A2', 'a2000000-0000-4000-8000-000000000002', 'aa000000-0000-4000-8000-0000000000ad'),
  ('b0000000-0000-4000-8000-0000000000b1', 'Project B1', 'b1000000-0000-4000-8000-000000000001', 'bb000000-0000-4000-8000-0000000000ad');

INSERT INTO tasks (id, title, project_id, company_id, created_by, assignee_id) VALUES
  ('a0000000-0000-4000-8000-00000000a7a1', 'Task A1', 'a0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000ad', 'aa000000-0000-4000-8000-0000000000e1'),
  ('b0000000-0000-4000-8000-00000000b7b1', 'Task B1', 'b0000000-0000-4000-8000-0000000000b1', 'b1000000-0000-4000-8000-000000000001', 'bb000000-0000-4000-8000-0000000000ad', NULL),
  -- A task with no project belongs to its own company.
  ('b0000000-0000-4000-8000-00000000b7b2', 'Loose task B', NULL, 'b1000000-0000-4000-8000-000000000001', 'bb000000-0000-4000-8000-0000000000ad', NULL);

INSERT INTO subtasks (task_id, title) VALUES
  ('a0000000-0000-4000-8000-00000000a7a1', 'Sub A'), ('b0000000-0000-4000-8000-00000000b7b1', 'Sub B');
INSERT INTO task_comments (task_id, user_id, comment) VALUES
  ('a0000000-0000-4000-8000-00000000a7a1', 'aa000000-0000-4000-8000-0000000000ad', 'Comment A'),
  ('b0000000-0000-4000-8000-00000000b7b1', 'bb000000-0000-4000-8000-0000000000ad', 'Comment B');
INSERT INTO brief_items (task_id, note) VALUES
  ('a0000000-0000-4000-8000-00000000a7a1', 'Brief A'), ('b0000000-0000-4000-8000-00000000b7b1', 'Brief B');
INSERT INTO brief_days (organization_id, brief_date, ready_at) VALUES
  ('00000000-0000-4000-8000-000000000001', CURRENT_DATE, now()),
  ('b0000000-0000-4000-8000-00000000000b', CURRENT_DATE, now());
INSERT INTO pending_invites (email, name, role, company_id) VALUES
  ('new.a@test', 'New A', 'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('new.b@test', 'New B', 'employee', 'b1000000-0000-4000-8000-000000000001');
INSERT INTO pipeline_projects (name, client_name, estimated_value, company_id) VALUES
  ('Lead A', 'Client A', 1, 'a1000000-0000-4000-8000-000000000001'),
  ('Lead B', 'Client B', 1, 'b1000000-0000-4000-8000-000000000001');
INSERT INTO audit_log (entity_type, entity_id, action, summary, user_id) VALUES
  ('task', 'a0000000-0000-4000-8000-00000000a7a1', 'created', 'A did a thing', 'aa000000-0000-4000-8000-0000000000ad'),
  ('task', 'b0000000-0000-4000-8000-00000000b7b1', 'created', 'B did a thing', 'bb000000-0000-4000-8000-0000000000ad');

SELECT tests.check('lead A got org A from their company',
  (SELECT organization_id FROM users WHERE id = 'aa000000-0000-4000-8000-0000000000e1') = '00000000-0000-4000-8000-000000000001');

-- ── Admin A: a global role, so the old policies let them see everything ────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;

SELECT tests.check('admin A sees only their organisation', (SELECT array_agg(slug) FROM organizations) = ARRAY['default']);
SELECT tests.check('admin A sees both A companies, no B company',
  (SELECT count(*) FROM companies WHERE name LIKE 'A %') = 2 AND NOT EXISTS (SELECT 1 FROM companies WHERE name = 'B Mining'));
SELECT tests.check('admin A sees no B users',       NOT EXISTS (SELECT 1 FROM users WHERE email LIKE '%.b@test'));
SELECT tests.check('admin A sees A projects',       (SELECT count(*) FROM projects WHERE name LIKE 'Project A%') = 2);
SELECT tests.check('admin A sees no B project',     NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project B1'));
SELECT tests.check('admin A sees task A1',          EXISTS (SELECT 1 FROM tasks WHERE title = 'Task A1'));
SELECT tests.check('admin A sees no B task (with or without project)',
  NOT EXISTS (SELECT 1 FROM tasks WHERE title IN ('Task B1', 'Loose task B')));
SELECT tests.check('admin A sees no B subtasks',    NOT EXISTS (SELECT 1 FROM subtasks WHERE title = 'Sub B'));
SELECT tests.check('admin A sees no B comments',    NOT EXISTS (SELECT 1 FROM task_comments WHERE comment = 'Comment B'));
SELECT tests.check('admin A sees no B brief items', NOT EXISTS (SELECT 1 FROM brief_items WHERE note = 'Brief B'));
SELECT tests.check('admin A sees one brief day',    (SELECT count(*) FROM brief_days) = 1);
SELECT tests.check('admin A sees no B invites',     NOT EXISTS (SELECT 1 FROM pending_invites WHERE email = 'new.b@test'));
SELECT tests.check('admin A sees no B pipeline',    NOT EXISTS (SELECT 1 FROM pipeline_projects WHERE name = 'Lead B'));
SELECT tests.check('admin A sees no B audit rows',  NOT EXISTS (SELECT 1 FROM audit_log WHERE summary = 'B did a thing'));
SELECT tests.check('people_access lists no B users',
  NOT EXISTS (SELECT 1 FROM people_access() pa WHERE pa.user_id::text LIKE 'bb%'));

SELECT tests.refused('admin A cannot add a project to a B company',
  $$INSERT INTO projects (name, company_id) VALUES ('Sneaky', 'b1000000-0000-4000-8000-000000000001')$$);
SELECT tests.refused('admin A cannot add a task to a B project',
  $$INSERT INTO tasks (title, project_id) VALUES ('Sneaky', 'b0000000-0000-4000-8000-0000000000b1')$$);
SELECT tests.refused('admin A cannot comment on a B task',
  $$INSERT INTO task_comments (task_id, user_id, comment) VALUES ('b0000000-0000-4000-8000-00000000b7b1', 'aa000000-0000-4000-8000-0000000000ad', 'hi')$$);
SELECT tests.refused('admin A cannot invite someone into a B company',
  $$INSERT INTO pending_invites (email, name, role, company_id) VALUES ('x@test', 'X', 'employee', 'b1000000-0000-4000-8000-000000000001')$$);
SELECT tests.refused('admin A cannot create a company in org B',
  $$INSERT INTO companies (name, organization_id) VALUES ('Sneaky', 'b0000000-0000-4000-8000-00000000000b')$$);
-- Updates that RLS filters out affect no rows rather than raising, so these
-- are checked by reading the rows back after RESET ROLE below.
SELECT tests.attempt($$UPDATE users SET company_id = 'b1000000-0000-4000-8000-000000000001' WHERE id = 'aa000000-0000-4000-8000-0000000000e1'$$);
SELECT tests.refused('admin A cannot deactivate admin B',
  $$SELECT set_user_access('bb000000-0000-4000-8000-0000000000ad', false)$$);

UPDATE tasks SET title = 'hacked' WHERE id = 'b0000000-0000-4000-8000-00000000b7b1';
DELETE FROM projects WHERE id = 'b0000000-0000-4000-8000-0000000000b1';

-- Trying to move yourself to another organisation is refused or ignored.
SELECT tests.attempt($$UPDATE users SET organization_id = 'b0000000-0000-4000-8000-00000000000b' WHERE id = 'aa000000-0000-4000-8000-0000000000ad'$$);
SELECT tests.check('admin A is still in org A',
  (SELECT organization_id FROM users WHERE id = 'aa000000-0000-4000-8000-0000000000ad') = '00000000-0000-4000-8000-000000000001');

RESET ROLE;
SELECT tests.check('B task was not renamed or deleted',
  (SELECT title FROM tasks WHERE id = 'b0000000-0000-4000-8000-00000000b7b1') = 'Task B1'
  AND EXISTS (SELECT 1 FROM projects WHERE id = 'b0000000-0000-4000-8000-0000000000b1'));
SELECT tests.check('lead A was not moved into a B company',
  (SELECT company_id FROM users WHERE id = 'aa000000-0000-4000-8000-0000000000e1') = 'a1000000-0000-4000-8000-000000000001');

-- ── Executive B sees their own organisation, not A ─────────────────────────

SELECT tests.sign_in('bb000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.check('exec B sees both B tasks', (SELECT count(*) FROM tasks WHERE title IN ('Task B1', 'Loose task B')) = 2);
SELECT tests.check('exec B sees no A task',    NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Task A1'));
SELECT tests.check('exec B sees B brief only', (SELECT array_agg(note) FROM brief_items) = ARRAY['Brief B']);
RESET ROLE;

-- ── PA notifications stay inside the organisation ──────────────────────────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
UPDATE tasks SET stage = 'in_progress' WHERE id = 'a0000000-0000-4000-8000-00000000a7a1';
RESET ROLE;
SELECT tests.check('PA A was notified of the A stage change',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000aa' AND type = 'stage_changed'));
SELECT tests.check('PA B was not notified of an A task',
  NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 'bb000000-0000-4000-8000-0000000000aa'));

-- ── Brief days: each organisation has its own "ready" flag per day ──────────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000aa');
SET LOCAL ROLE authenticated;
INSERT INTO brief_days (brief_date, ready_at) VALUES (CURRENT_DATE, NULL)
  ON CONFLICT (organization_id, brief_date) DO UPDATE SET ready_at = EXCLUDED.ready_at;
RESET ROLE;
SELECT tests.check('PA A reopened A''s brief and left B''s ready',
  (SELECT ready_at FROM brief_days WHERE organization_id = '00000000-0000-4000-8000-000000000001') IS NULL
  AND (SELECT ready_at FROM brief_days WHERE organization_id = 'b0000000-0000-4000-8000-00000000000b') IS NOT NULL);

-- ── Someone with no organisation sees nothing but themselves ───────────────

INSERT INTO users (id, email, name, role) VALUES
  ('cc000000-0000-4000-8000-0000000000cc', 'orphan@test', 'Orphan', 'employee');
UPDATE users SET organization_id = NULL WHERE id = 'cc000000-0000-4000-8000-0000000000cc';
SELECT tests.sign_in('cc000000-0000-4000-8000-0000000000cc');
SET LOCAL ROLE authenticated;
SELECT tests.check('orphan sees nobody else', NOT EXISTS (SELECT 1 FROM users WHERE email <> 'orphan@test'));
SELECT tests.check('orphan sees no tasks or companies',
  NOT EXISTS (SELECT 1 FROM tasks) AND NOT EXISTS (SELECT 1 FROM companies));
RESET ROLE;

-- ── Deactivated users lose their organisation ──────────────────────────────

UPDATE users SET deactivated_at = now() WHERE id = 'aa000000-0000-4000-8000-0000000000e1';
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
SELECT tests.check('a deactivated lead sees no tasks', NOT EXISTS (SELECT 1 FROM tasks));
RESET ROLE;

ROLLBACK;
