-- Escalation when work goes silent. The daily job is run at simulated times.
-- Runs inside one transaction and rolls back.

BEGIN;

CREATE SCHEMA tests;
CREATE FUNCTION tests.check(label TEXT, ok BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;
-- Escalations sent to a person.
CREATE FUNCTION tests.esc(p_user UUID) RETURNS BIGINT LANGUAGE sql AS $$
  SELECT count(*) FROM public.notifications WHERE user_id = p_user AND type = 'escalation';
$$;

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000a1', 'owner@home.test',  'Owner',    'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000ad', 'lead@home.test',   'Lead',     'lead',     'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000c1', 'admin@home.test',  'Assigner', 'admin',    'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000aa', 'pa@home.test',     'The PA',   'pa',       'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a9', 'gone@home.test',   'Gone',     'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'lead@other.test',  'Out lead', 'lead',     'e1000000-0000-4000-8000-000000000001');
UPDATE users SET deactivated_at = now() WHERE id = 'aa000000-0000-4000-8000-0000000000a9';
INSERT INTO projects (id, name, company_id) VALUES ('a2000000-0000-4000-8000-000000000001', 'Home project', 'a1000000-0000-4000-8000-000000000001');

-- S: in progress, last moved 1 June 09:00. D: deadline 1 June. U: never accepted, created 1 June. G: owner deactivated.
INSERT INTO tasks (id, title, project_id, assignee_id, created_by, stage, progress_percent, acknowledged_at, last_movement_at, created_at, due_date) VALUES
  ('a3000000-0000-4000-8000-0000000000a1', 'Silent task',   'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'aa000000-0000-4000-8000-0000000000c1', 'in_progress', 25, '2026-05-20', '2026-06-01 09:00+00', '2026-05-20', NULL),
  ('a3000000-0000-4000-8000-0000000000d1', 'Late task',     'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', NULL, 'yet_to_start', 0, '2026-05-20', '2026-06-20 09:00+00', '2026-05-20', '2026-06-01'),
  ('a3000000-0000-4000-8000-0000000000b1', 'Unaccepted',    'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', NULL, 'yet_to_start', 0, NULL, '2026-06-01 09:00+00', '2026-06-01 09:00+00', NULL),
  ('a3000000-0000-4000-8000-0000000000e1', 'Ownerless now', 'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a9', NULL, 'in_progress', 25, '2026-05-20', '2026-06-01 09:00+00', '2026-05-20', NULL);

-- ── Silence ────────────────────────────────────────────────────────────────
SELECT public.run_escalations('2026-06-02 10:00+00');
SELECT tests.check('one day of silence: nothing yet', NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'escalation' AND title LIKE '%Silent task%'));

SELECT public.run_escalations('2026-06-03 10:00+00');
SELECT tests.check('day 2: the owner is nudged',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'escalation' AND title = 'No update for 2 days: Silent task'));
SELECT public.run_escalations('2026-06-03 18:00+00');
SELECT tests.check('running again the same day sends nothing new',
  (SELECT count(*) FROM notifications WHERE type = 'escalation' AND title LIKE '%Silent task%') = 1);

SELECT public.run_escalations('2026-06-05 10:00+00');
SELECT tests.check('day 4: the lead and whoever assigned it are told, not the owner again',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000ad' AND title = 'Gone quiet (4 days): Silent task')
  AND EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000c1' AND title = 'Gone quiet (4 days): Silent task')
  AND (SELECT count(*) FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND title LIKE '%Silent task%') = 1);

SELECT public.run_escalations('2026-06-08 10:00+00');
SELECT tests.check('day 7: the PA is told',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000aa' AND title = 'Gone quiet (7 days): Silent task'));
SELECT tests.check('a lead in another organisation never hears about it',
  tests.esc('ee000000-0000-4000-8000-0000000000e1') = 0);
SELECT tests.check('a deactivated owner''s task does not escalate',
  NOT EXISTS (SELECT 1 FROM notifications WHERE title LIKE '%Ownerless now%'));

-- Movement resets the ladder.
UPDATE tasks SET progress_percent = 50 WHERE id = 'a3000000-0000-4000-8000-0000000000a1';
SELECT tests.check('moving the task clears its silence steps',
  NOT EXISTS (SELECT 1 FROM task_escalations WHERE task_id = 'a3000000-0000-4000-8000-0000000000a1' AND rule = 'silent'));
SELECT public.run_escalations(now() + interval '2 days 1 hour');
SELECT tests.check('if it goes quiet again, the owner is nudged again',
  (SELECT count(*) FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND title LIKE 'No update for%Silent task') = 2);

-- ── Deadlines and acceptance ───────────────────────────────────────────────
SELECT tests.check('a day past the deadline: the owner was told',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND title = 'Past its deadline: Late task'));
SELECT tests.check('three days late: the lead was told',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000ad' AND title LIKE '% days late: Late task'));
SELECT tests.check('not accepted after 2 days, then 4: owner first, then lead',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000a1' AND title = 'Waiting for you to accept: Unaccepted')
  AND EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000ad' AND title LIKE 'Not accepted after % days: Unaccepted'));

-- ── Record-only (the first run in production) ──────────────────────────────
INSERT INTO tasks (id, title, project_id, assignee_id, stage, progress_percent, acknowledged_at, last_movement_at, created_at) VALUES
  ('a3000000-0000-4000-8000-0000000000f1', 'Old silence', 'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'in_progress', 25, now() - interval '60 days', now() - interval '30 days', now() - interval '60 days');
SELECT public.run_escalations(now(), true);
SELECT public.run_escalations(now());
SELECT tests.check('work already quiet when this started is noted, not announced',
  NOT EXISTS (SELECT 1 FROM notifications WHERE title LIKE '%Old silence%')
  AND EXISTS (SELECT 1 FROM task_escalations WHERE task_id = 'a3000000-0000-4000-8000-0000000000f1'));

ROLLBACK;
