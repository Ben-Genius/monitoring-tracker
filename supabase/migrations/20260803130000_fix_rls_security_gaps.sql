-- =====================================================
-- Migration: Fix RLS Security Gaps
-- =====================================================
-- Fixes:
--   1. Replace deprecated auth.role() with TO authenticated
--   2. Add company-scoped policies for project_comments and project_attachments
--   3. Migrate helper functions from public to private schema
--   4. Fix overly permissive task_comments policies
--   5. Add TO authenticated to all policies
-- =====================================================

-- ---------------------------------------------------------------------------
-- 1. Migrate helper functions to private schema
-- ---------------------------------------------------------------------------

create schema if not exists private;

drop function if exists public.get_auth_company_id();
drop function if exists public.get_auth_role();

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where id = auth.uid();
$$;

revoke execute on function private.current_company_id() from public, anon;
revoke execute on function private.current_user_role() from public, anon;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fix project_comments policies (replace auth.role() with company-scoped)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow authenticated users to read project_comments" on project_comments;
drop policy if exists "Allow users to insert their own comments" on project_comments;

create policy "Company members can read project_comments"
  on project_comments for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_comments.project_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert their own comments"
  on project_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from projects p
      where p.id = project_comments.project_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update their own comments"
  on project_comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on project_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Fix project_attachments policies (replace auth.role() with company-scoped)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow authenticated users to read project_attachments" on project_attachments;
drop policy if exists "Allow authenticated users to insert attachments" on project_attachments;

create policy "Company members can read project_attachments"
  on project_attachments for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_attachments.project_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert attachments in their company"
  on project_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = project_attachments.project_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update attachments in their company"
  on project_attachments for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
      and exists (
        select 1 from projects p
        where p.id = project_attachments.project_id
          and p.company_id = u.company_id
      )
    )
  )
  with check (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
      and exists (
        select 1 from projects p
        where p.id = project_attachments.project_id
          and p.company_id = u.company_id
      )
    )
  );

create policy "Users can delete attachments in their company"
  on project_attachments for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
      and exists (
        select 1 from projects p
        where p.id = project_attachments.project_id
          and p.company_id = u.company_id
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Fix task_comments policies to be company-scoped
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view comments on accessible tasks" on task_comments;
drop policy if exists "Users can create comments" on task_comments;

create policy "Users can view comments on accessible tasks"
  on task_comments for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = task_comments.task_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can create comments on accessible tasks"
  on task_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = task_comments.task_id
        and p.company_id = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update their own comments"
  on task_comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own comments"
  on task_comments for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Fix companies policy to be company-scoped (was USING (true))
-- ---------------------------------------------------------------------------

drop policy if exists "Companies are viewable by everyone" on companies;

create policy "Users can view their own company"
  on companies for select
  to authenticated
  using (id = (select company_id from public.users where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Fix task_assignees policies to use TO authenticated
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view assignees of tasks in their company" on task_assignees;
drop policy if exists "Users can add assignees to tasks in their company" on task_assignees;
drop policy if exists "Users can remove assignees from tasks in their company" on task_assignees;

create policy "Users can view assignees of tasks in their company"
  on task_assignees for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and coalesce(p.company_id, creator.company_id) = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can add assignees to tasks in their company"
  on task_assignees for insert
  to authenticated
  with check (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and coalesce(p.company_id, creator.company_id) = (select company_id from public.users where id = auth.uid())
    )
  );

create policy "Users can remove assignees from tasks in their company"
  on task_assignees for delete
  to authenticated
  using (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and coalesce(p.company_id, creator.company_id) = (select company_id from public.users where id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Ensure all other existing policies use TO authenticated
-- ---------------------------------------------------------------------------

-- approvals policies (from migration 20260803120000) already use TO authenticated
-- and are company-scoped. They are safe.

-- milestones, subtasks policies (from migration 20260803120000) already use
-- TO authenticated and are company-scoped. They are safe.