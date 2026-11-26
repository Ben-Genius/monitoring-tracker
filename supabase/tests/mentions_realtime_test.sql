-- @mentions notify the right people, and only them; the realtime
-- publication carries the tables the app refreshes live.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO authenticated;
CREATE FUNCTION tests.check(label TEXT, ok BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;
CREATE FUNCTION tests.sign_in(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated',
                      'email', (SELECT email FROM public.users WHERE id = p_user))::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

-- ── Fixtures ───────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug) VALUES
  ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'admin@home.test',   'Home Admin',   'admin',    'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a1', 'ama@home.test',     'Ama Owusu',    'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a2', 'kofi@home.test',    'Kofi Mensah',  'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a3', 'gone@home.test',    'Gone Person',  'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a4', 'yaw@sample.invalid','Yaw (sample)', 'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'out@other.test',    'Outsider',     'employee', 'e1000000-0000-4000-8000-000000000001');
UPDATE users SET deactivated_at = now() WHERE id = 'aa000000-0000-4000-8000-0000000000a3';
UPDATE users SET is_sample = true WHERE id = 'aa000000-0000-4000-8000-0000000000a4';

INSERT INTO projects (id, name, company_id) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'Home project', 'a1000000-0000-4000-8000-000000000001');
-- Kofi owns the task; Ama does not.
INSERT INTO tasks (id, title, project_id, assignee_id) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'Pour the slab', 'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2');

-- ── A comment that mentions five people ────────────────────────────────────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
INSERT INTO task_comments (task_id, user_id, comment, kind) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000ad',
   '@[Ama Owusu](aa000000-0000-4000-8000-0000000000a1) and @[Kofi Mensah](aa000000-0000-4000-8000-0000000000a2) please check. '
   || 'Also @[Outsider](ee000000-0000-4000-8000-0000000000e1) @[Gone Person](aa000000-0000-4000-8000-0000000000a3) '
   || '@[Yaw](aa000000-0000-4000-8000-0000000000a4) @[Me](aa000000-0000-4000-8000-0000000000ad)',
   'comment');
RESET ROLE;

SELECT tests.check('a mentioned teammate gets a mention notification',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'mention'
          AND title = 'Home Admin mentioned you'));
SELECT tests.check('the notification shows names, not ids',
  (SELECT body FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'mention')
    LIKE 'Pour the slab: @Ama Owusu and @Kofi Mensah please check.%'
  AND (SELECT body FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'mention') NOT LIKE '%aa000000%');
SELECT tests.check('a mentioned owner gets one mention, not a mention and a comment',
  (SELECT array_agg(type) FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a2') = ARRAY['mention']);
SELECT tests.check('someone in another organisation is never notified',
  NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 'ee000000-0000-4000-8000-0000000000e1'));
SELECT tests.check('deactivated and sample people are not notified',
  NOT EXISTS (SELECT 1 FROM notifications WHERE user_id IN ('aa000000-0000-4000-8000-0000000000a3', 'aa000000-0000-4000-8000-0000000000a4')));
SELECT tests.check('the author is not notified about their own mention',
  NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000ad'));

-- ── Mentions in a progress update ──────────────────────────────────────────

DELETE FROM notifications;
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a2');
SET LOCAL ROLE authenticated;
INSERT INTO task_comments (task_id, user_id, comment, kind, from_stage, to_stage, progress_percent) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2',
   'Half done. @[Ama Owusu](aa000000-0000-4000-8000-0000000000a1) can you bring the mixer?', 'status_update', 'in_progress', 'in_progress', 50);
RESET ROLE;
SELECT tests.check('a mention in a progress update reaches the person mentioned',
  (SELECT count(*) FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'mention') = 1);
SELECT tests.check('a progress update still sends no comment notifications',
  NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'comment'));

-- ── A plain comment still works as before ──────────────────────────────────

DELETE FROM notifications;
SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000ad');
SET LOCAL ROLE authenticated;
INSERT INTO task_comments (task_id, user_id, comment, kind) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000ad', 'No mentions here.', 'comment');
RESET ROLE;
SELECT tests.check('without mentions the owner gets the usual comment notification',
  (SELECT array_agg(type) FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a2') = ARRAY['comment']);

-- ── Realtime ───────────────────────────────────────────────────────────────

SELECT tests.check('the tables the app refreshes are published for realtime',
  (SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
     AND tablename IN ('tasks','task_comments','subtasks','notifications','projects','milestones','approvals','brief_items','brief_days')) = 9);
SELECT tests.check('private tables are not published',
  NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
     AND tablename IN ('users','pending_invites','brief_emails_sent','audit_log')));

ROLLBACK;
