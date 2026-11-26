-- Access-rule tune-up (Supabase performance advisor, 26 Nov 2026).
-- See docs/audits/2026-11-26-db-performance-plan.md.
--
-- Who can see and do what is unchanged, except one fix (step 3). Merges are
-- built from each rule's current definition, read from pg_policies, so the
-- merged rule is exactly the OR of the rules it replaces.
--
--   1. Duplicate permissive rules are merged into one per table and action,
--      so Postgres evaluates one rule per row instead of several.
--   2. auth.uid(), auth.jwt() and auth.role() are wrapped in (select ...), so
--      they are worked out once per query instead of once per row.
--   3. Fix: the loose insert rules on project comments and project files let a
--      signed-in person post under someone else's id. The strict rules, which
--      require the author to be the signed-in person, stay.
--   4. Every foreign key gets an index.

BEGIN;

-- Merges the named permissive rules on a table into one rule for p_cmd,
-- keeping exactly their combined meaning. Rules that don't exist are skipped.
-- A rule's missing WITH CHECK means "same as USING", which is kept.
CREATE OR REPLACE FUNCTION pg_temp.merge_rules(p_table TEXT, p_cmd TEXT, p_names TEXT[], p_new TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD; v_using TEXT[] := '{}'; v_check TEXT[] := '{}'; v_sql TEXT; v_found INT := 0;
BEGIN
  FOR r IN SELECT policyname, qual, with_check FROM pg_policies
            WHERE schemaname = 'public' AND tablename = p_table AND permissive = 'PERMISSIVE'
              AND policyname = ANY (p_names) LOOP
    v_found := v_found + 1;
    IF r.qual IS NOT NULL THEN v_using := v_using || ('(' || r.qual || ')'); END IF;
    IF coalesce(r.with_check, r.qual) IS NOT NULL THEN v_check := v_check || ('(' || coalesce(r.with_check, r.qual) || ')'); END IF;
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, p_table);
  END LOOP;
  IF v_found = 0 THEN RETURN; END IF;
  v_sql := format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated', p_new, p_table, p_cmd);
  IF p_cmd IN ('SELECT', 'DELETE', 'UPDATE', 'ALL') AND array_length(v_using, 1) > 0 THEN
    v_sql := v_sql || ' USING (' || array_to_string(v_using, ' OR ') || ')';
  END IF;
  IF p_cmd IN ('INSERT', 'UPDATE', 'ALL') AND array_length(v_check, 1) > 0 THEN
    v_sql := v_sql || ' WITH CHECK (' || array_to_string(v_check, ' OR ') || ')';
  END IF;
  EXECUTE v_sql;
END $$;

-- Splits a FOR ALL rule into INSERT, UPDATE and DELETE rules, so it stops
-- also granting reads that another rule already grants.
CREATE OR REPLACE FUNCTION pg_temp.split_write_rule(p_table TEXT, p_name TEXT, p_cmds TEXT[])
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r RECORD; c TEXT; v_sql TEXT;
BEGIN
  SELECT qual, with_check INTO r FROM pg_policies
   WHERE schemaname = 'public' AND tablename = p_table AND policyname = p_name AND cmd = 'ALL';
  IF NOT FOUND THEN RETURN; END IF;
  EXECUTE format('DROP POLICY %I ON public.%I', p_name, p_table);
  FOREACH c IN ARRAY p_cmds LOOP
    v_sql := format('CREATE POLICY %I ON public.%I FOR %s TO authenticated', p_name || ' (' || lower(c) || ')', p_table, c);
    IF c IN ('UPDATE', 'DELETE') THEN v_sql := v_sql || ' USING (' || r.qual || ')'; END IF;
    IF c IN ('INSERT', 'UPDATE') THEN v_sql := v_sql || ' WITH CHECK (' || coalesce(r.with_check, r.qual) || ')'; END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;

-- ── 3. Fix first: drop the loose insert rules (author spoofing) ─────────────
DROP POLICY IF EXISTS "Users can create comments on projects in their company" ON public.project_comments;
DROP POLICY IF EXISTS "Users can upload attachments to projects in their company" ON public.project_attachments;

-- ── 1. Merge duplicates ─────────────────────────────────────────────────────

-- Exact duplicates and read rules already covered by an identical write rule.
DROP POLICY IF EXISTS "Company members can read project_attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Company members can read project_comments" ON public.project_comments;
DO $$
DECLARE pair TEXT[];
BEGIN
  -- Only drop a read rule when a FOR ALL rule on the table has the same condition.
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['approvals', 'Company members can read approvals', 'Company members can write approvals'],
    ['milestones', 'Company members can read milestones', 'Company members can write milestones'],
    ['subtasks', 'Company members can read subtasks', 'Company members can write subtasks']
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_policies r JOIN pg_policies w ON w.tablename = r.tablename AND w.schemaname = r.schemaname
                WHERE r.schemaname = 'public' AND r.tablename = pair[1] AND r.policyname = pair[2] AND r.cmd = 'SELECT'
                  AND w.policyname = pair[3] AND w.cmd = 'ALL' AND w.qual = r.qual) THEN
      EXECUTE format('DROP POLICY %I ON public.%I', pair[2], pair[1]);
    END IF;
  END LOOP;
END $$;

-- Reads: one rule per table.
SELECT pg_temp.merge_rules('tasks', 'SELECT', ARRAY['Company members can read tasks', 'Global roles can view all tasks'], 'Read tasks');
SELECT pg_temp.merge_rules('projects', 'SELECT', ARRAY['Company members can read projects', 'Global roles can view all projects'], 'Read projects');
SELECT pg_temp.merge_rules('users', 'SELECT', ARRAY['Users can view members of their company', 'Global roles can view all users'], 'Read people');
SELECT pg_temp.merge_rules('companies', 'SELECT', ARRAY['Users can view their own company', 'Global roles can view all companies'], 'Read companies');
SELECT pg_temp.merge_rules('task_comments', 'SELECT', ARRAY['Users can view comments on accessible tasks', 'Global roles can view all task comments'], 'Read task comments');

-- Pipeline: the write rule also granted reads; split it, then merge the reads.
SELECT pg_temp.split_write_rule('pipeline_projects', 'Company members can write pipeline projects', ARRAY['INSERT', 'UPDATE', 'DELETE']);
SELECT pg_temp.merge_rules('pipeline_projects', 'SELECT', ARRAY['Company members can read pipeline projects', 'Global roles can view all pipeline projects'], 'Read pipeline projects');

-- Writes on tasks: company members, or PA/admin in any company.
SELECT pg_temp.merge_rules('tasks', 'INSERT', ARRAY['Company members can insert tasks', 'PA and admin can create tasks in any company'], 'Create tasks');
SELECT pg_temp.merge_rules('tasks', 'UPDATE', ARRAY['Company members can update tasks', 'PA and admin can update tasks in any company'], 'Update tasks');

-- Project files: two delete rules become one with the same meaning.
SELECT pg_temp.merge_rules('project_attachments', 'DELETE', ARRAY['Users can delete attachments from projects in their company', 'Users can delete attachments in their company'], 'Delete project files');

-- Brief and dependencies: the write rules also granted reads, which the read
-- rules already grant (admin and PA are global roles; links you may change
-- are links you can see).
SELECT pg_temp.split_write_rule('brief_days', 'PA and admin write brief days', ARRAY['INSERT', 'UPDATE', 'DELETE']);
SELECT pg_temp.split_write_rule('brief_items', 'PA and admin write the brief', ARRAY['INSERT', 'UPDATE', 'DELETE']);
SELECT pg_temp.split_write_rule('task_dependencies', 'Plan links between visible tasks', ARRAY['INSERT', 'DELETE']);

-- ── 2. Work out the signed-in user once per query ───────────────────────────
DO $$
DECLARE
  r RECORD; v_using TEXT; v_check TEXT; v_sql TEXT;
  -- auth.uid() etc. not already inside "( SELECT auth.uid() AS uid)".
  pat CONSTANT TEXT := '(?<!SELECT )(auth\.(uid|jwt|role)\(\))';
BEGIN
  FOR r IN SELECT tablename, policyname, qual, with_check FROM pg_policies
            WHERE schemaname = 'public'
              AND (qual ~ pat OR with_check ~ pat) LOOP
    v_using := regexp_replace(r.qual, pat, '(SELECT \1)', 'g');
    v_check := regexp_replace(r.with_check, pat, '(SELECT \1)', 'g');
    v_sql := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
    IF v_using IS NOT NULL THEN v_sql := v_sql || ' USING (' || v_using || ')'; END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || ' WITH CHECK (' || v_check || ')'; END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;

-- ── 4. Index every foreign key ──────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname, a.attname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey, 1) = 1
       AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%I)', 'idx_fk_' || left(r.conname, 50), r.tbl, r.attname);
  END LOOP;
END $$;

COMMIT;
