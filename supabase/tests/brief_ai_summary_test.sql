-- AI summary: off by default, only admins switch it, only brief readers in the
-- same organisation see it, turning it off deletes it, and the app can't write it.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated, anon, service_role;
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
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, anon, service_role;

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'admin@home.test', 'Admin', 'admin',     'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000ec', 'exec@home.test',  'Exec',  'executive', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000e1', 'staff@home.test', 'Staff', 'employee',  'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000ad', 'adm@other.test',  'Out',   'admin',     'e1000000-0000-4000-8000-000000000001');

SELECT tests.check('off by default for every organisation', NOT EXISTS (SELECT 1 FROM organizations WHERE ai_summary));

-- Only admins switch it.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.refused('an executive cannot turn it on', $$SELECT set_ai_summary(true)$$);
SELECT tests.check('an executive can see it is off', get_ai_summary() = false);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT tests.refused('signed-out callers cannot turn it on', $$SELECT set_ai_summary(true)$$);
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
SELECT set_ai_summary(true);
SELECT tests.refused('the app cannot write summaries',
  $$INSERT INTO brief_summaries (organization_id, brief_date, summary, model) VALUES ('00000000-0000-4000-8000-000000000001', current_date, 'x', 'm')$$);
SELECT tests.refused('the app cannot read the table directly', $$SELECT * FROM brief_summaries$$);
RESET ROLE;
SELECT tests.check('the admin turned on only their own organisation',
  (SELECT ai_summary FROM organizations WHERE id = '00000000-0000-4000-8000-000000000001')
  AND NOT (SELECT ai_summary FROM organizations WHERE id = 'e0000000-0000-4000-8000-00000000000e'));

-- The job (service role) writes today's summary for both organisations.
SET LOCAL ROLE service_role;
INSERT INTO brief_summaries (organization_id, brief_date, summary, model) VALUES
  ('00000000-0000-4000-8000-000000000001', current_date, 'Home summary', 'claude-opus-5-5'),
  ('e0000000-0000-4000-8000-00000000000e', current_date, 'Other summary', 'claude-opus-5-5');
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.check('the executive sees their own organisation''s summary',
  (SELECT summary FROM todays_brief_summary()) = 'Home summary');
RESET ROLE;

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
SELECT tests.check('staff who don''t read the brief see nothing', NOT EXISTS (SELECT 1 FROM todays_brief_summary()));
RESET ROLE;

SELECT tests.sign_in('ee000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
SELECT tests.check('an organisation that hasn''t turned it on sees nothing, even if a row exists',
  NOT EXISTS (SELECT 1 FROM todays_brief_summary()));
RESET ROLE;

-- Old summaries don't show as today's.
UPDATE brief_summaries SET created_at = now() - interval '1 day' WHERE organization_id = '00000000-0000-4000-8000-000000000001';
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ec');
SET LOCAL ROLE authenticated;
SELECT tests.check('yesterday''s summary is not shown', NOT EXISTS (SELECT 1 FROM todays_brief_summary()));
RESET ROLE;

-- Turning it off deletes what was written.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
SELECT set_ai_summary(false);
RESET ROLE;
SELECT tests.check('turning it off deletes the organisation''s summaries',
  NOT EXISTS (SELECT 1 FROM brief_summaries WHERE organization_id = '00000000-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM brief_summaries WHERE organization_id = 'e0000000-0000-4000-8000-00000000000e'));

ROLLBACK;
