-- Enable Row Level Security on core tables.
--
-- Context: these tables were created via the Supabase dashboard and shipped without
-- RLS. Because VITE_SUPABASE_ANON_KEY is public by design (it is bundled into the
-- browser build), an unprotected table is readable and writable by anyone. This
-- migration closes that hole with company-scoped policies.
--
-- Tables already covered by earlier migrations and intentionally untouched here:
--   task_assignees, project_comments, project_attachments

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
-- These are SECURITY DEFINER so they bypass RLS on `users`. Without that, any
-- policy on `users` that needs the caller's company would query `users` and
-- recurse infinitely.

create schema if not exists private;

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
-- companies
-- ---------------------------------------------------------------------------
alter table companies enable row level security;

-- The SELECT policy for companies is created by 20260803130000, which replaces
-- the old "Companies are viewable by everyone". Creating it here too would make
-- that migration fail with "policy already exists".

drop policy if exists "Admins can update their own company" on companies;
create policy "Admins can update their own company"
  on companies for update
  to authenticated
  using (
    id = (select private.current_company_id())
    and (select private.current_user_role()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
alter table users enable row level security;

drop policy if exists "Users can view members of their company" on users;
create policy "Users can view members of their company"
  on users for select
  to authenticated
  using (company_id = (select private.current_company_id()));

-- Required for signup: the profile row is created immediately after the auth
-- account exists, so auth.uid() is already populated at insert time.
drop policy if exists "Users can create their own profile" on users;
create policy "Users can create their own profile"
  on users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update themselves, admins update anyone" on users;
create policy "Users can update themselves, admins update anyone"
  on users for update
  to authenticated
  using (
    id = auth.uid()
    or (
      company_id = (select private.current_company_id())
      and (select private.current_user_role()) = 'admin'
    )
  );

drop policy if exists "Admins can delete users in their company" on users;
create policy "Admins can delete users in their company"
  on users for delete
  to authenticated
  using (
    company_id = (select private.current_company_id())
    and (select private.current_user_role()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
alter table projects enable row level security;

drop policy if exists "Company members can read projects" on projects;
create policy "Company members can read projects"
  on projects for select
  to authenticated
  using (company_id = (select private.current_company_id()));

drop policy if exists "Company members can insert projects" on projects;
create policy "Company members can insert projects"
  on projects for insert
  to authenticated
  with check (company_id = (select private.current_company_id()));

drop policy if exists "Company members can update projects" on projects;
create policy "Company members can update projects"
  on projects for update
  to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));

drop policy if exists "Company members can delete projects" on projects;
create policy "Company members can delete projects"
  on projects for delete
  to authenticated
  using (company_id = (select private.current_company_id()));

-- ---------------------------------------------------------------------------
-- tasks  (scoped through the parent project)
-- ---------------------------------------------------------------------------
alter table tasks enable row level security;

drop policy if exists "Company members can read tasks" on tasks;
create policy "Company members can read tasks"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Company members can insert tasks" on tasks;
create policy "Company members can insert tasks"
  on tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Company members can update tasks" on tasks;
create policy "Company members can update tasks"
  on tasks for update
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Company members can delete tasks" on tasks;
create policy "Company members can delete tasks"
  on tasks for delete
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- milestones  (scoped through the parent project)
-- ---------------------------------------------------------------------------
alter table milestones enable row level security;

drop policy if exists "Company members can read milestones" on milestones;
create policy "Company members can read milestones"
  on milestones for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = milestones.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Company members can write milestones" on milestones;
create policy "Company members can write milestones"
  on milestones for all
  to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = milestones.project_id
        and p.company_id = (select private.current_company_id())
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = milestones.project_id
        and p.company_id = (select private.current_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- subtasks  (scoped through task -> project)
-- ---------------------------------------------------------------------------
alter table subtasks enable row level security;

drop policy if exists "Company members can read subtasks" on subtasks;
create policy "Company members can read subtasks"
  on subtasks for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = subtasks.task_id
        and p.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Company members can write subtasks" on subtasks;
create policy "Company members can write subtasks"
  on subtasks for all
  to authenticated
  using (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = subtasks.task_id
        and p.company_id = (select private.current_company_id())
    )
  )
  with check (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = subtasks.task_id
        and p.company_id = (select private.current_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------
-- project_id may be null (approvals can reference other entity types via
-- entity_type/entity_id), so fall back to the requester's company.
alter table approvals enable row level security;

drop policy if exists "Company members can read approvals" on approvals;
create policy "Company members can read approvals"
  on approvals for select
  to authenticated
  using (
    (
      project_id is not null
      and exists (
        select 1 from projects p
        where p.id = approvals.project_id
          and p.company_id = (select private.current_company_id())
      )
    )
    or (
      project_id is null
      and exists (
        select 1 from users u
        where u.id = approvals.requester_id
          and u.company_id = (select private.current_company_id())
      )
    )
  );

drop policy if exists "Company members can write approvals" on approvals;
create policy "Company members can write approvals"
  on approvals for all
  to authenticated
  using (
    (
      project_id is not null
      and exists (
        select 1 from projects p
        where p.id = approvals.project_id
          and p.company_id = (select private.current_company_id())
      )
    )
    or (
      project_id is null
      and exists (
        select 1 from users u
        where u.id = approvals.requester_id
          and u.company_id = (select private.current_company_id())
      )
    )
  )
  with check (
    (
      project_id is not null
      and exists (
        select 1 from projects p
        where p.id = approvals.project_id
          and p.company_id = (select private.current_company_id())
      )
    )
    or (
      project_id is null
      and exists (
        select 1 from users u
        where u.id = approvals.requester_id
          and u.company_id = (select private.current_company_id())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
-- Append-only: no update or delete policies, so the trail cannot be rewritten
-- through the API.
alter table audit_log enable row level security;

drop policy if exists "Company members can read the audit log" on audit_log;
create policy "Company members can read the audit log"
  on audit_log for select
  to authenticated
  using (
    exists (
      select 1 from users u
      where u.id = audit_log.user_id
        and u.company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Authenticated users can append to the audit log" on audit_log;
create policy "Authenticated users can append to the audit log"
  on audit_log for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);

-- ---------------------------------------------------------------------------
-- pipeline_projects  (carries company_id directly)
-- ---------------------------------------------------------------------------
alter table pipeline_projects enable row level security;

drop policy if exists "Company members can read pipeline projects" on pipeline_projects;
create policy "Company members can read pipeline projects"
  on pipeline_projects for select
  to authenticated
  using (company_id = (select private.current_company_id()));

drop policy if exists "Company members can write pipeline projects" on pipeline_projects;
create policy "Company members can write pipeline projects"
  on pipeline_projects for all
  to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));

-- ---------------------------------------------------------------------------
-- task_comments
-- ---------------------------------------------------------------------------
-- RLS is switched on here because nothing else does it, but the four policies
-- (view/create/update/delete) belong to 20260803130000.
alter table task_comments enable row level security;

-- ---------------------------------------------------------------------------
-- Supporting indexes
-- ---------------------------------------------------------------------------
-- Every policy above filters on these columns, so they are now on the hot path
-- for reads as well as joins.
create index if not exists idx_projects_company_id on projects(company_id);
create index if not exists idx_users_company_id on users(company_id);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_milestones_project_id on milestones(project_id);
create index if not exists idx_subtasks_task_id on subtasks(task_id);
create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_pipeline_projects_company_id on pipeline_projects(company_id);
create index if not exists idx_task_comments_task_id on task_comments(task_id);
