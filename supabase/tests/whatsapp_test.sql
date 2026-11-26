-- WhatsApp updates: linking, and that an update by message follows the same
-- rules as the app. Runs inside one transaction and rolls back.

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
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, service_role;

-- ── Fixtures ───────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, slug) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Elsewhere', 'elsewhere');
INSERT INTO companies (id, name, organization_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Home Co', '00000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'Other Co', 'e0000000-0000-4000-8000-00000000000e');
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('aa000000-0000-4000-8000-0000000000ad', 'lead@home.test', 'Lead Person', 'lead',     'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a1', 'ama@home.test',  'Ama Owusu',   'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('aa000000-0000-4000-8000-0000000000a2', 'kofi@home.test', 'Kofi Mensah', 'employee', 'a1000000-0000-4000-8000-000000000001'),
  ('ee000000-0000-4000-8000-0000000000e1', 'out@other.test', 'Outsider',    'employee', 'e1000000-0000-4000-8000-000000000001');
INSERT INTO projects (id, name, company_id) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'Home project', 'a1000000-0000-4000-8000-000000000001'),
  ('e2000000-0000-4000-8000-000000000001', 'Other project', 'e1000000-0000-4000-8000-000000000001');
INSERT INTO tasks (id, title, project_id, assignee_id, created_by, stage) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'Pour the slab',   'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a1', 'aa000000-0000-4000-8000-0000000000ad', 'yet_to_start'),
  ('a3000000-0000-4000-8000-000000000002', 'Kofi''s task',    'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-0000000000a2', 'aa000000-0000-4000-8000-0000000000ad', 'in_progress'),
  ('e3000000-0000-4000-8000-000000000001', 'Elsewhere task',  'e2000000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-0000000000e1', NULL, 'in_progress');

-- ── Linking, from the app ──────────────────────────────────────────────────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE code_holder AS SELECT create_whatsapp_link_code() AS code;
SELECT tests.check('a link code is six digits', (SELECT code FROM code_holder) ~ '^[0-9]{6}$');
SELECT tests.check('not linked yet', NOT (SELECT linked FROM my_whatsapp_link()));
SELECT tests.refused('the app cannot read WhatsApp numbers', $$SELECT * FROM whatsapp_links$$);
SELECT tests.refused('the app cannot apply WhatsApp updates',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'accept')$$);
RESET ROLE;
GRANT SELECT ON code_holder TO service_role;

-- ── The webhook ────────────────────────────────────────────────────────────

SET LOCAL ROLE service_role;
SELECT tests.check('a wrong code links nobody', whatsapp_link('233200000001', '000000') IS NULL OR (SELECT code FROM code_holder) = '000000');
SELECT tests.check('the right code links the sender and returns their first name',
  whatsapp_link('233200000001', (SELECT code FROM code_holder)) = 'Ama');
SELECT tests.check('a code works once', whatsapp_link('233200000009', (SELECT code FROM code_holder)) IS NULL);
SELECT tests.check('the number now identifies Ama',
  (SELECT user_id FROM whatsapp_user('233200000001')) = 'aa000000-0000-4000-8000-0000000000a1');

SELECT tests.check('her list holds only her own tasks',
  (SELECT jsonb_agg(x->>'title') FROM jsonb_array_elements(whatsapp_my_tasks('aa000000-0000-4000-8000-0000000000a1')) x) = '["Pour the slab"]');
SELECT tests.check('number 1 means that task',
  whatsapp_task_at('aa000000-0000-4000-8000-0000000000a1', 1) = 'a3000000-0000-4000-8000-000000000001');

SELECT tests.check('accept works and says so',
  whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'accept') = 'Accepted "Pour the slab".');
SELECT tests.check('the task is accepted by her',
  (SELECT acknowledged_by FROM tasks WHERE id = 'a3000000-0000-4000-8000-000000000001') = 'aa000000-0000-4000-8000-0000000000a1');

SELECT tests.refused('a progress update needs a note',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'progress', 50, '  ')$$);
SELECT tests.refused('progress goes in 25% steps',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'progress', 40, 'some')$$);
SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'progress', 50, 'Formwork up, pour on Friday');
SELECT tests.check('progress moves the task like the app does',
  (SELECT stage = 'in_progress' AND progress_percent = 50 FROM tasks WHERE id = 'a3000000-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM task_comments WHERE task_id = 'a3000000-0000-4000-8000-000000000001' AND kind = 'status_update'
              AND user_id = 'aa000000-0000-4000-8000-0000000000a1' AND progress_percent = 50 AND comment = 'Formwork up, pour on Friday'));
SELECT tests.check('the lead is notified, from Ama (the update ran as her)',
  EXISTS (SELECT 1 FROM notifications WHERE user_id = 'aa000000-0000-4000-8000-0000000000ad'
          AND actor_id = 'aa000000-0000-4000-8000-0000000000a1' AND type = 'stage_changed'));
SELECT tests.check('the move is in the audit log as hers',
  EXISTS (SELECT 1 FROM audit_log WHERE entity_id = 'a3000000-0000-4000-8000-000000000001' AND action = 'stage_changed'
          AND user_id = 'aa000000-0000-4000-8000-0000000000a1'));

SELECT tests.refused('someone else''s task is refused',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000002', 'progress', 50, 'not mine')$$);
SELECT tests.refused('another organisation''s task is refused',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'e3000000-0000-4000-8000-000000000001', 'accept')$$);

SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'blocked', NULL, 'Waiting on cement delivery');
SELECT tests.check('blocked records the reason',
  (SELECT stage = 'blockers' AND blocker_description = 'Waiting on cement delivery' FROM tasks WHERE id = 'a3000000-0000-4000-8000-000000000001'));

SELECT tests.refused('done without proof is refused',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'done', NULL, 'Poured')$$);
SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'done', NULL, 'Slab poured and cured',
  '[{"kind":"file","path":"a3000000-0000-4000-8000-000000000001/wa-1.jpg","name":"WhatsApp photo","type":"image/jpeg","size":1000}]');
SELECT tests.check('done with a photo completes it at 100%',
  (SELECT stage = 'completed' AND progress_percent = 100 AND completed_at IS NOT NULL FROM tasks WHERE id = 'a3000000-0000-4000-8000-000000000001'));
SELECT tests.refused('a finished task cannot be updated again',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a1', 'a3000000-0000-4000-8000-000000000001', 'progress', 75, 'again')$$);

SELECT tests.check('the same message is handled once',
  whatsapp_claim_message('wamid.1') AND NOT whatsapp_claim_message('wamid.1'));
RESET ROLE;

-- ── Unlinking and deactivation ─────────────────────────────────────────────

SELECT tests.sign_in('aa000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
SELECT tests.check('she sees she is linked, masked', (SELECT linked AND phone_hint = '•••• 0001' FROM my_whatsapp_link()));
SELECT unlink_whatsapp();
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT tests.check('after unlinking the number is nobody', NOT EXISTS (SELECT 1 FROM whatsapp_user('233200000001')));
RESET ROLE;

UPDATE users SET deactivated_at = now() WHERE id = 'aa000000-0000-4000-8000-0000000000a2';
SET LOCAL ROLE service_role;
SELECT tests.refused('a deactivated person cannot update by WhatsApp',
  $$SELECT whatsapp_apply_update('aa000000-0000-4000-8000-0000000000a2', 'a3000000-0000-4000-8000-000000000002', 'progress', 75, 'still here')$$);
RESET ROLE;

ROLLBACK;
