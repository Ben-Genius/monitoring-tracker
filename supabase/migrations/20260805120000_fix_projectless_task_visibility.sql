-- Make project-less tasks visible under RLS.
--
-- The tasks policies from 20260803120000 scope every row through its parent
-- project:
--
--   exists (select 1 from projects p
--            where p.id = tasks.project_id
--              and p.company_id = private.current_company_id())
--
-- When project_id is null that EXISTS is false, so the row is invisible to
-- everyone. The app explicitly supports project-less "general" tasks
-- (20260201110000 made project_id nullable), and 33 such tasks arrived with
-- the Baserow sync — all of them unreachable.
--
-- Fix: give tasks their own company_id, used only when there is no project to
-- inherit from. Tasks that do have a project keep inheriting, so moving a
-- project between companies still moves its tasks.

alter table tasks
  add column if not exists company_id uuid references companies(id) on delete set null;

-- Backfill: inherit from the project where there is one, otherwise attribute
-- to the company that owns the mirrored Baserow data.
update tasks t
   set company_id = p.company_id
  from projects p
 where p.id = t.project_id
   and t.company_id is null;

update tasks
   set company_id = '6e015878-fe4a-421f-81e6-4293df3dfd12'  -- MacWest
 where company_id is null
   and project_id is null
   and baserow_id is not null;

create index if not exists idx_tasks_company_id on tasks(company_id);

-- ---------------------------------------------------------------------------
-- Replace the four task policies
-- ---------------------------------------------------------------------------
-- Same company scope as before, with an explicit branch for project-less rows.

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
    or (
      project_id is null
      and company_id = (select private.current_company_id())
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
    or (
      project_id is null
      and company_id = (select private.current_company_id())
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
    or (
      project_id is null
      and company_id = (select private.current_company_id())
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
    or (
      project_id is null
      and company_id = (select private.current_company_id())
    )
  );

comment on column tasks.company_id is
  'Company scope for project-less tasks. Tasks with a project inherit from it; '
  'this column is the RLS fallback when project_id is null.';
