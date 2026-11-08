-- Prepare milestones and subtasks to mirror Baserow "Phases" (1044515) and
-- "Sub Tasks" (1045541).

-- ---------------------------------------------------------------------------
-- milestones  <- Baserow Phases
-- ---------------------------------------------------------------------------
alter table milestones
  add column if not exists baserow_id integer,
  -- Baserow "Estimated Budget" / "Actual Budget" / "Progress Budget".
  add column if not exists estimated_budget numeric(14,2),
  add column if not exists actual_budget numeric(14,2),
  -- Baserow "Progress Tasks": completed tasks / total tasks, computed there.
  add column if not exists progress_percent numeric(5,2),
  -- Baserow "Start Date" is a rollup: min(Tasks.Start Date). Read-only.
  add column if not exists start_date date;

alter table milestones drop constraint if exists milestones_baserow_id_key;
alter table milestones add constraint milestones_baserow_id_key unique (baserow_id);

-- ---------------------------------------------------------------------------
-- subtasks  <- Baserow Sub Tasks
-- ---------------------------------------------------------------------------
alter table subtasks
  add column if not exists baserow_id integer,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists completed_date date;

alter table subtasks drop constraint if exists subtasks_baserow_id_key;
alter table subtasks add constraint subtasks_baserow_id_key unique (baserow_id);

create index if not exists idx_subtasks_baserow_id on subtasks(baserow_id);

-- ---------------------------------------------------------------------------
-- Fix subtask visibility for project-less parent tasks
-- ---------------------------------------------------------------------------
-- The policies from 20260803120000 reach the company by joining
-- subtasks -> tasks -> projects. When the parent task has no project that join
-- produces no row, so the subtask is invisible to everyone — the same blind
-- spot that hid 33 tasks (see 20260805120000). Tasks now carry their own
-- company_id, so the fallback is available here too.

drop policy if exists "Company members can read subtasks" on subtasks;
create policy "Company members can read subtasks"
  on subtasks for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
      where t.id = subtasks.task_id
        and (
          exists (
            select 1 from projects p
            where p.id = t.project_id
              and p.company_id = (select private.current_company_id())
          )
          or (
            t.project_id is null
            and t.company_id = (select private.current_company_id())
          )
        )
    )
  );

drop policy if exists "Company members can write subtasks" on subtasks;
create policy "Company members can write subtasks"
  on subtasks for all
  to authenticated
  using (
    exists (
      select 1 from tasks t
      where t.id = subtasks.task_id
        and (
          exists (
            select 1 from projects p
            where p.id = t.project_id
              and p.company_id = (select private.current_company_id())
          )
          or (
            t.project_id is null
            and t.company_id = (select private.current_company_id())
          )
        )
    )
  )
  with check (
    exists (
      select 1 from tasks t
      where t.id = subtasks.task_id
        and (
          exists (
            select 1 from projects p
            where p.id = t.project_id
              and p.company_id = (select private.current_company_id())
          )
          or (
            t.project_id is null
            and t.company_id = (select private.current_company_id())
          )
        )
    )
  );

comment on column milestones.progress_percent is
  'Mirrored from the Baserow Progress Tasks formula; computed there.';
