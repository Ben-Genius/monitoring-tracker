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

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
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
CREATE POLICY "Global roles can view all companies" ON companies
  FOR SELECT TO authenticated USING (private.has_global_access());

CREATE POLICY "Global roles can view all users" ON users
  FOR SELECT TO authenticated USING (private.has_global_access());

CREATE POLICY "Global roles can view all projects" ON projects
  FOR SELECT TO authenticated USING (private.has_global_access());

CREATE POLICY "Global roles can view all tasks" ON tasks
  FOR SELECT TO authenticated USING (private.has_global_access());

CREATE POLICY "Global roles can view all task comments" ON task_comments
  FOR SELECT TO authenticated USING (private.has_global_access());

CREATE POLICY "Global roles can view all pipeline projects" ON pipeline_projects
  FOR SELECT TO authenticated USING (private.has_global_access());

-- The PA creates commitments for people in any company; the executive does not.
CREATE POLICY "PA and admin can create tasks in any company" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce(
      (select role in ('admin', 'pa') from public.users where id = auth.uid()),
      false
    )
  );

COMMIT;
