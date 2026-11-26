-- The 7am morning email: who gets it, which tasks go in, sent once a day,
-- and that none of it is reachable from the app.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated, service_role;
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
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated',
                      'email', (SELECT email FROM public.users WHERE id = p_user))::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, service_role;

-- ── Fixtures: two customers ────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug, timezone) VALUES
  ('c0000000-0000-4000-8000-00000000000c', 'Coastal Group', 'coastal', 'Africa/Lagos'),
  ('d0000000-0000-4000-8000-00000000000d', 'Delta Group',   'delta',   'Africa/Accra');
INSERT INTO companies (id, name, organization_id) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Coastal Builders', 'c0000000-0000-4000-8000-00000000000c'),
  ('d1000000-0000-4000-8000-000000000001', 'Delta Mining',     'd0000000-0000-4000-8000-00000000000d');

INSERT INTO users (id, email, name, role, company_id) VALUES
  ('c0000000-0000-4000-8000-0000000000ad', 'admin@coastal.test',  'Coastal Admin', 'admin',     'c1000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-0000000000ec', 'exec@coastal.test',   'Coastal Exec',  'executive', 'c1000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-0000000000aa', 'pa@coastal.test',     'Coastal PA',    'pa',        'c1000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-0000000000e1', 'lead@coastal.test',   'Coastal Lead',  'lead',      'c1000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-0000000000e5', 'kofi.x@sample.invalid','Kofi (sample)','admin',     'c1000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-0000000000ad', 'admin@delta.test',    'Delta Admin',   'admin',     'd1000000-0000-4000-8000-000000000001');
UPDATE users SET brief_email = false WHERE id = 'c0000000-0000-4000-8000-0000000000ec';
UPDATE users SET deactivated_at = now() WHERE id = 'c0000000-0000-4000-8000-0000000000aa';
UPDATE users SET is_sample = true WHERE id = 'c0000000-0000-4000-8000-0000000000e5';

INSERT INTO projects (id, name, company_id) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'Coastal Road',  'c1000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000001', 'Delta Shaft',   'd1000000-0000-4000-8000-000000000001');

INSERT INTO tasks (title, project_id, stage, completed_at, archived_at, assignee_id, blocked_by) VALUES
  ('Open and blocked',  'c2000000-0000-4000-8000-000000000001', 'blockers',  NULL, NULL,
     'c0000000-0000-4000-8000-0000000000e1', 'c0000000-0000-4000-8000-0000000000ad'),
  ('Done this morning', 'c2000000-0000-4000-8000-000000000001', 'completed', now() - interval '2 hours', NULL, NULL, NULL),
  ('Done last week',    'c2000000-0000-4000-8000-000000000001', 'completed', now() - interval '7 days', NULL, NULL, NULL),
  ('Archived',          'c2000000-0000-4000-8000-000000000001', 'in_progress', NULL, now(), NULL, NULL),
  ('Delta secret',      'd2000000-0000-4000-8000-000000000001', 'in_progress', NULL, NULL, NULL, NULL);

-- ── Not reachable from the app ─────────────────────────────────────────────

SELECT tests.sign_in('c0000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
SELECT tests.refused('the app cannot list recipients',   $$SELECT * FROM brief_email_recipients()$$);
SELECT tests.refused('the app cannot read another org''s brief',
  $$SELECT brief_email_tasks('d0000000-0000-4000-8000-00000000000d')$$);
SELECT tests.refused('the app cannot mark emails sent',
  $$SELECT claim_brief_email('c0000000-0000-4000-8000-0000000000ad', current_date)$$);
SELECT tests.refused('the app cannot unsubscribe someone else',
  $$SELECT unsubscribe_brief_email('d0000000-0000-4000-8000-0000000000ad')$$);
SELECT tests.refused('the app cannot read the sent log', $$SELECT * FROM brief_emails_sent$$);

-- ── Turning your own email off and on ──────────────────────────────────────

SELECT set_brief_email(false);
RESET ROLE;
SELECT tests.check('set_brief_email changes only your own row',
  (SELECT brief_email FROM users WHERE id = 'c0000000-0000-4000-8000-0000000000ad') = false
  AND (SELECT brief_email FROM users WHERE id = 'd0000000-0000-4000-8000-0000000000ad') = true);
SET LOCAL ROLE authenticated;
SELECT set_brief_email(true);
RESET ROLE;
SELECT tests.check('and back on',
  (SELECT brief_email FROM users WHERE id = 'c0000000-0000-4000-8000-0000000000ad'));

-- ── The job ────────────────────────────────────────────────────────────────

SET LOCAL ROLE service_role;
SELECT tests.check('Coastal: only the active, opted-in, real overseer gets it',
  (SELECT array_agg(email) FROM brief_email_recipients()
    WHERE organization_id = 'c0000000-0000-4000-8000-00000000000c') = ARRAY['admin@coastal.test']);
SELECT tests.check('recipient carries the org name and time zone',
  EXISTS (SELECT 1 FROM brief_email_recipients()
           WHERE email = 'admin@coastal.test' AND org_name = 'Coastal Group' AND timezone = 'Africa/Lagos'));
SELECT tests.check('Delta admin gets Delta''s',
  EXISTS (SELECT 1 FROM brief_email_recipients()
           WHERE email = 'admin@delta.test' AND organization_id = 'd0000000-0000-4000-8000-00000000000d'));

SELECT tests.check('brief has the open task and today''s done, not old, archived or other orgs',
  (SELECT array_agg(x->>'title' ORDER BY x->>'title')
     FROM jsonb_array_elements(brief_email_tasks('c0000000-0000-4000-8000-00000000000c')) x)
  = ARRAY['Done this morning', 'Open and blocked']);
SELECT tests.check('tasks carry project, owner and blocker names',
  (SELECT x->'project'->>'name' = 'Coastal Road' AND x->'owner'->>'name' = 'Coastal Lead' AND x->'blocker'->>'name' = 'Coastal Admin'
     FROM jsonb_array_elements(brief_email_tasks('c0000000-0000-4000-8000-00000000000c')) x
    WHERE x->>'title' = 'Open and blocked'));

SELECT tests.check('first claim wins',
  claim_brief_email('c0000000-0000-4000-8000-0000000000ad', '2026-11-25'));
SELECT tests.check('a second run the same day does not send again',
  NOT claim_brief_email('c0000000-0000-4000-8000-0000000000ad', '2026-11-25'));
SELECT release_brief_email('c0000000-0000-4000-8000-0000000000ad', '2026-11-25');
SELECT tests.check('after a failed send it can be tried again',
  claim_brief_email('c0000000-0000-4000-8000-0000000000ad', '2026-11-25'));
SELECT tests.check('the next day is a new email',
  claim_brief_email('c0000000-0000-4000-8000-0000000000ad', '2026-11-26'));

SELECT unsubscribe_brief_email('d0000000-0000-4000-8000-0000000000ad');
SELECT tests.check('unsubscribe link stops the email',
  NOT EXISTS (SELECT 1 FROM brief_email_recipients() WHERE email = 'admin@delta.test'));
RESET ROLE;

ROLLBACK;
