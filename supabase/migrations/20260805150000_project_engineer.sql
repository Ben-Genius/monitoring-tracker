-- Record the Baserow "Project Engineer" on projects.
--
-- Baserow assigns an engineer to the project, not to individual tasks. Storing
-- it here makes the engineer visible in the tracker and gives the task sync a
-- sensible default assignee for newly mirrored tasks.

alter table projects
  -- Raw Baserow Engineers row id, kept so the link survives even when the
  -- engineer has not been synced into users yet.
  add column if not exists baserow_engineer_id integer,
  -- Resolved tracker user. ON UPDATE CASCADE so it follows an engineer's id
  -- when they accept an invite (see 20260805130000).
  add column if not exists engineer_id uuid
    references users(id) on update cascade on delete set null;

create index if not exists idx_projects_engineer_id on projects(engineer_id);

comment on column projects.engineer_id is
  'Baserow Project Engineer, resolved to a users row. Used as the default '
  'assignee for newly synced tasks; existing task assignments are never '
  'overwritten by the sync.';
