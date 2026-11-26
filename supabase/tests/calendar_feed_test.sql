-- Calendar feed: your own private link, only your own dated open tasks,
-- resetting kills the old link, and nothing is reachable without the token.
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
CREATE TABLE tests.saved (k TEXT PRIMARY KEY, v TEXT);
GRANT ALL ON tests.saved TO authenticated, service_role;

INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000e1', 'ama@home.test',  'Ama',  'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000e2', 'kojo@home.test', 'Kojo', 'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000e3', 'gone@home.test', 'Gone', 'employee', 'a1000000-0000-4000-8000-000000000001');
INSERT INTO projects (id, name, company_id) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'Tema Site', 'a1000000-0000-4000-8000-000000000001');
INSERT INTO tasks (title, project_id, stage, due_date, archived_at, assignee_id) VALUES
  ('Ama dated open',   'a2000000-0000-4000-8000-000000000001', 'in_progress', current_date + 3, NULL,  'aa000000-0000-4000-8000-0000000000e1'),
  ('Ama no date',      'a2000000-0000-4000-8000-000000000001', 'in_progress', NULL,             NULL,  'aa000000-0000-4000-8000-0000000000e1'),
  ('Ama done',         'a2000000-0000-4000-8000-000000000001', 'completed',   current_date,     NULL,  'aa000000-0000-4000-8000-0000000000e1'),
  ('Ama archived',     'a2000000-0000-4000-8000-000000000001', 'in_progress', current_date,     now(), 'aa000000-0000-4000-8000-0000000000e1'),
  ('Kojo dated open',  'a2000000-0000-4000-8000-000000000001', 'blockers',    current_date + 1, NULL,  'aa000000-0000-4000-8000-0000000000e2');

-- Signed out: no link, no feed.
SET LOCAL ROLE anon;
SELECT tests.refused('anonymous callers cannot get a link', $$SELECT calendar_feed_token()$$);
SELECT tests.refused('anonymous callers cannot read a feed', $$SELECT calendar_feed('x')$$);
RESET ROLE;

-- Ama gets a link; asking again returns the same one.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
INSERT INTO tests.saved VALUES ('ama1', calendar_feed_token());
SELECT tests.check('asking again returns the same link',
  calendar_feed_token() = (SELECT v FROM tests.saved WHERE k = 'ama1'));
SELECT tests.check('the token is long and random-looking',
  (SELECT v FROM tests.saved WHERE k = 'ama1') ~ '^[0-9a-f]{64}$');
SELECT tests.refused('the app cannot read the feed table', $$SELECT * FROM calendar_feeds$$);
SELECT tests.refused('the app cannot read a feed directly',
  $$SELECT calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama1'))$$);
RESET ROLE;

-- Kojo gets his own, different link.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e2');
SET LOCAL ROLE authenticated;
INSERT INTO tests.saved VALUES ('kojo', calendar_feed_token());
RESET ROLE;
SELECT tests.check('each person has their own link',
  (SELECT v FROM tests.saved WHERE k = 'kojo') <> (SELECT v FROM tests.saved WHERE k = 'ama1'));

-- The feed endpoint (service role) sees only Ama's dated, open, live tasks.
SET LOCAL ROLE service_role;
SELECT tests.check('Ama''s feed has only her dated open task',
  (SELECT jsonb_agg(x->>'title') FROM jsonb_array_elements(calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama1'))->'tasks') x)
    = '["Ama dated open"]'::jsonb);
SELECT tests.check('the feed names its owner and project',
  calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama1'))->>'name' = 'Ama'
  AND calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama1'))->'tasks'->0->>'project' = 'Tema Site');
SELECT tests.check('an unknown token gives nothing', calendar_feed('nope') IS NULL);
RESET ROLE;

-- Resetting replaces the link; the old one stops working.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e1');
SET LOCAL ROLE authenticated;
INSERT INTO tests.saved VALUES ('ama2', calendar_feed_token(true));
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT tests.check('reset gives a new link',
  (SELECT v FROM tests.saved WHERE k = 'ama2') <> (SELECT v FROM tests.saved WHERE k = 'ama1'));
SELECT tests.check('the old link stops working',
  calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama1')) IS NULL);
SELECT tests.check('the new link works',
  calendar_feed((SELECT v FROM tests.saved WHERE k = 'ama2')) IS NOT NULL);
SELECT tests.check('Kojo''s link is untouched by Ama''s reset',
  jsonb_array_length(calendar_feed((SELECT v FROM tests.saved WHERE k = 'kojo'))->'tasks') = 1);
RESET ROLE;

-- Deactivated people: no new link, and an existing one goes dark.
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000e3');
SET LOCAL ROLE authenticated;
INSERT INTO tests.saved VALUES ('gone', calendar_feed_token());
RESET ROLE;
UPDATE users SET deactivated_at = now() WHERE id = 'aa000000-0000-4000-8000-0000000000e3';
SET LOCAL ROLE service_role;
SELECT tests.check('a deactivated person''s link stops working',
  calendar_feed((SELECT v FROM tests.saved WHERE k = 'gone')) IS NULL);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT tests.refused('a deactivated person cannot get a link', $$SELECT calendar_feed_token()$$);
RESET ROLE;

ROLLBACK;
