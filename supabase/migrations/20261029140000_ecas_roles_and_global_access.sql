-- ECAS accountability loop, step 1: the people in the loop.
--
-- The brief needs two roles the app does not have:
--   executive — Mr Blay. Sees all three companies, changes nothing.
--   pa        — Japhet. Sees all three companies, creates and chases on his
--               behalf, but is not his substitute line manager.
--
-- Neither gets user management or company administration; that stays with
-- admin. Global read is granted by ADDING permissive SELECT policies rather
-- than rewriting the existing ones, so the assignment and visibility fixes in
-- the August migrations stay exactly as they are.

BEGIN;

-- Drop whatever the existing role CHECK is called. Naming it outright risks
-- leaving an older constraint in place that still rejects the two new roles.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'executive', 'pa', 'lead', 'employee'));

create or replace function private.has_global_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('admin', 'executive', 'pa') from public.users where id = auth.uid()),
    false
  );
$$;

revoke execute on function private.has_global_access() from public, anon;
grant execute on function private.has_global_access() to authenticated;

-- Permissive SELECT policies are OR'd with the existing ones, so these widen
-- read access for the three global roles and touch nothing else.
DROP POLICY IF EXISTS "Global roles can view all companies" ON companies;
CREATE POLICY "Global roles can view all companies" ON companies
  FOR SELECT TO authenticated USING (private.has_global_access());

DROP POLICY IF EXISTS "Global roles can view all users" ON users;
CREATE POLICY "Global roles can view all users" ON users
  FOR SELECT TO authenticated USING (private.has_global_access());

DROP POLICY IF EXISTS "Global roles can view all projects" ON projects;
CREATE POLICY "Global roles can view all projects" ON projects
  FOR SELECT TO authenticated USING (private.has_global_access());

DROP POLICY IF EXISTS "Global roles can view all tasks" ON tasks;
CREATE POLICY "Global roles can view all tasks" ON tasks
  FOR SELECT TO authenticated USING (private.has_global_access());

DROP POLICY IF EXISTS "Global roles can view all task comments" ON task_comments;
CREATE POLICY "Global roles can view all task comments" ON task_comments
  FOR SELECT TO authenticated USING (private.has_global_access());

DROP POLICY IF EXISTS "Global roles can view all pipeline projects" ON pipeline_projects;
CREATE POLICY "Global roles can view all pipeline projects" ON pipeline_projects
  FOR SELECT TO authenticated USING (private.has_global_access());

-- The PA creates commitments for people in any company; the executive does not.
DROP POLICY IF EXISTS "PA and admin can create tasks in any company" ON tasks;
CREATE POLICY "PA and admin can create tasks in any company" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce(
      (select role in ('admin', 'pa') from public.users where id = auth.uid()),
      false
    )
  );

COMMIT;
