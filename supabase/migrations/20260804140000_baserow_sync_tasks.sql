-- Prepare `tasks` to mirror the Baserow "Tasks" table (1044512).

-- ---------------------------------------------------------------------------
-- Link column
-- ---------------------------------------------------------------------------
-- A plain unique constraint, not a partial index: ON CONFLICT cannot target a
-- partial index through PostgREST (see 20260804130000). NULLs are distinct in
-- Postgres, so tracker-created tasks are unaffected.
alter table tasks
  add column if not exists baserow_id integer;

alter table tasks
  drop constraint if exists tasks_baserow_id_key;

alter table tasks
  add constraint tasks_baserow_id_key unique (baserow_id);

-- ---------------------------------------------------------------------------
-- Columns present in Baserow with no home here
-- ---------------------------------------------------------------------------
alter table tasks
  -- Baserow "Start Date" is a planned start, distinct from started_at, which
  -- records when work actually began.
  add column if not exists start_date date,
  -- Baserow "Estimated Budget" / "Actual Expenses" are money, unrelated to the
  -- existing estimated_hours / actual_hours.
  add column if not exists estimated_budget numeric(14,2),
  add column if not exists actual_expenses numeric(14,2);

-- ---------------------------------------------------------------------------
-- assignee_id / created_by must accept null
-- ---------------------------------------------------------------------------
-- Baserow assigns an engineer to the PROJECT ("Project Engineer"), not to
-- individual tasks, and mirrored rows have no author. Forcing a value would
-- mean attributing 180 tasks to an arbitrary user, which is worse than an
-- honest null. The UI should render these as "Unassigned".
alter table tasks alter column assignee_id drop not null;
alter table tasks alter column created_by  drop not null;

create index if not exists idx_tasks_baserow_id on tasks(baserow_id);

comment on column tasks.baserow_id is
  'Baserow Tasks (table 1044512) row id. Null for tracker-created tasks.';
comment on column tasks.stage is
  'talking_stage and blockers are tracker-only states with no Baserow '
  'equivalent; the Baserow sync preserves them instead of overwriting.';
