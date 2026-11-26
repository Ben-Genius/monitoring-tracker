-- Self-serve sign-up: create_organization() and clear_sample_data().
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
-- A brand-new login: an auth user with no profile row yet.
CREATE FUNCTION tests.sign_in_new(p_user UUID, p_email TEXT) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'email', p_email)::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

-- An existing customer, to prove the new one cannot see it.
INSERT INTO companies (id, name, organization_id) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'Existing Co', '00000000-0000-4000-8000-000000000001');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('e0000000-0000-4000-8000-0000000000e1', 'existing@test', 'Existing Person', 'lead', 'e1000000-0000-4000-8000-000000000001');
INSERT INTO projects (name, company_id) VALUES ('Existing project', 'e1000000-0000-4000-8000-000000000001');

-- ── A new founder signs up ─────────────────────────────────────────────────

SELECT tests.sign_in_new('f0000000-0000-4000-8000-0000000000f1', 'founder@newco.test');
SET LOCAL ROLE authenticated;

SELECT tests.refused('names are required',
  $$SELECT create_organization('  ', 'Co', 'Me')$$);
SELECT create_organization('Asante Holdings', 'Asante Builders', 'Akua Asante', true);

SELECT tests.check('founder is an admin of their new company',
  (SELECT role FROM users WHERE id = 'f0000000-0000-4000-8000-0000000000f1') = 'admin'
  AND (SELECT c.name FROM users u JOIN companies c ON c.id = u.company_id WHERE u.id = 'f0000000-0000-4000-8000-0000000000f1') = 'Asante Builders');
SELECT tests.check('founder sees their organisation by name',
  (SELECT array_agg(name) FROM organizations) = ARRAY['Asante Holdings']);
SELECT tests.check('slug is readable and unique-suffixed',
  (SELECT slug FROM organizations) ~ '^asante-holdings-[0-9a-f]{6}$');
SELECT tests.check('founder sees the sample project and seven tasks',
  (SELECT count(*) FROM projects WHERE is_sample) = 1 AND (SELECT count(*) FROM tasks) = 7);
SELECT tests.check('three sample teammates, marked as samples',
  (SELECT count(*) FROM users WHERE is_sample) = 3);
SELECT tests.check('sample tasks cover urgent, blocked, done and not-accepted',
  EXISTS (SELECT 1 FROM tasks WHERE is_urgent)
  AND EXISTS (SELECT 1 FROM tasks WHERE stage = 'blockers')
  AND EXISTS (SELECT 1 FROM tasks WHERE stage = 'completed')
  AND EXISTS (SELECT 1 FROM tasks WHERE acknowledged_at IS NULL AND assignee_id IS NOT NULL));
SELECT tests.check('founder cannot see the existing customer',
  NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Existing project')
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'existing@test')
  AND NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Existing Co'));
INSERT INTO projects (name, company_id)
SELECT 'Real project', company_id FROM users WHERE id = 'f0000000-0000-4000-8000-0000000000f1';
SELECT tests.check('founder can create a real project in their company',
  EXISTS (SELECT 1 FROM projects WHERE name = 'Real project'));
SELECT tests.refused('a second organisation for the same login is refused',
  $$SELECT create_organization('Another', 'Another Co', 'Akua')$$);
RESET ROLE;

-- ── Someone already in a team cannot start a separate organisation ─────────

SELECT tests.sign_in_new('f0000000-0000-4000-8000-0000000000f2', 'EXISTING@test');
SET LOCAL ROLE authenticated;
SELECT tests.refused('an email already in a team is sent to their admin',
  $$SELECT create_organization('Breakaway', 'Breakaway Co', 'Existing Person')$$);
RESET ROLE;

-- ── Without sample data ────────────────────────────────────────────────────

SELECT tests.sign_in_new('f0000000-0000-4000-8000-0000000000f3', 'plain@other.test');
SET LOCAL ROLE authenticated;
SELECT create_organization('Plain Group', 'Plain Co', 'Kwame Plain', false);
SELECT tests.check('no sample data when not asked for',
  NOT EXISTS (SELECT 1 FROM projects) AND (SELECT count(*) FROM users) = 1);
SELECT tests.check('second founder cannot see the first',
  NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Asante Holdings'));
RESET ROLE;

-- ── Removing the sample data ───────────────────────────────────────────────

-- The sample lead's real task in a real project must survive the clean-up.
INSERT INTO tasks (title, project_id, assignee_id)
SELECT 'Real task for a sample person', p.id, u.id
  FROM projects p, users u
 WHERE p.name = 'Real project' AND u.name = 'Kofi Mensah (sample)';

SELECT tests.sign_in_new('e0000000-0000-4000-8000-0000000000e1', 'existing@test');
SET LOCAL ROLE authenticated;
SELECT tests.refused('a lead cannot clear sample data', $$SELECT clear_sample_data()$$);
RESET ROLE;

SELECT tests.sign_in_new('f0000000-0000-4000-8000-0000000000f1', 'founder@newco.test');
SET LOCAL ROLE authenticated;
SELECT clear_sample_data();
SELECT tests.check('sample project and teammates are gone',
  NOT EXISTS (SELECT 1 FROM projects WHERE is_sample) AND NOT EXISTS (SELECT 1 FROM users WHERE is_sample));
SELECT tests.check('real work is kept, now unassigned',
  (SELECT assignee_id FROM tasks WHERE title = 'Real task for a sample person') IS NULL
  AND EXISTS (SELECT 1 FROM projects WHERE name = 'Real project'));
RESET ROLE;

SELECT tests.check('the other organisation still has its own data',
  EXISTS (SELECT 1 FROM projects WHERE name = 'Existing project'));

ROLLBACK;
