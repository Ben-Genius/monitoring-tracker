-- The access-rule tune-up: one permissive rule per table and action where
-- duplicates were merged, the signed-in user worked out once per query,
-- every foreign key indexed, and no posting under someone else's name.
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

-- ── Shape of the rules ─────────────────────────────────────────────────────

SELECT tests.check('merged tables have one permissive rule per action',
  NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
       AND tablename IN ('tasks', 'projects', 'users', 'companies', 'task_comments', 'pipeline_projects', 'approvals',
                         'milestones', 'subtasks', 'project_attachments', 'project_comments', 'brief_days', 'brief_items', 'task_dependencies')
     GROUP BY tablename, cmd HAVING count(*) > 1));
SELECT tests.check('reads are not also granted by FOR ALL rules on top of a read rule',
  NOT EXISTS (
    SELECT 1 FROM pg_policies a JOIN pg_policies s ON s.tablename = a.tablename AND s.schemaname = a.schemaname
     WHERE a.schemaname = 'public' AND a.cmd = 'ALL' AND s.cmd = 'SELECT'
       AND a.permissive = 'PERMISSIVE' AND s.permissive = 'PERMISSIVE'));
SELECT tests.check('the signed-in user is worked out once per query in every rule',
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
               AND (qual ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)' OR with_check ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)')));
SELECT tests.check('every single-column foreign key has an index',
  NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey, 1) = 1
       AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])));

-- ── Posting under someone else's name ──────────────────────────────────────

INSERT INTO companies (id, name, organization_id) VALUES ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000a1', 'ama@home.test',  'Ama',  'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a2', 'kofi@home.test', 'Kofi', 'employee', 'a1000000-0000-4000-8000-000000000001');
INSERT INTO projects (id, name, company_id) VALUES ('a2000000-0000-4000-8000-000000000001', 'Home project', 'a1000000-0000-4000-8000-000000000001');

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
INSERT INTO project_comments (project_id, user_id, content) VALUES ('a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'Mine');
SELECT tests.check('a project comment in your own name still works',
  EXISTS (SELECT 1 FROM project_comments WHERE content = 'Mine'));
SELECT tests.refused('a project comment in someone else''s name is refused',
  $$INSERT INTO project_comments (project_id, user_id, content) VALUES ('a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2', 'Spoofed')$$);
SELECT tests.refused('a project file in someone else''s name is refused',
  $$INSERT INTO project_attachments (project_id, uploaded_by, file_name, file_type, file_size, url) VALUES ('a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2', 'x.pdf', 'application/pdf', 10, 'storage://project-files/x.pdf')$$);
RESET ROLE;

ROLLBACK;
