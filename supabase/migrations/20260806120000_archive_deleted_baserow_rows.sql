-- Track rows that have disappeared from Baserow.
--
-- The syncs upsert but never reconcile: delete a project or task in Baserow and
-- its mirror lives on in the tracker forever. Baserow row ids are already
-- sparse (25 and 28-39 were deleted before the first sync), so this is a real
-- ongoing divergence, not a hypothetical.
--
-- Archiving rather than deleting, deliberately:
--   * deleting a mirrored project cascades to its tasks, milestones and
--     subtasks, destroying tracker-only state (blockers, comments, audit
--     history, manual assignees) that Baserow never held and cannot restore;
--   * a row removed from Baserow by accident is recoverable;
--   * "deleted upstream" and "irrelevant to us" are different decisions, and
--     the second one belongs to a person.

alter table projects   add column if not exists archived_at timestamptz;
alter table tasks      add column if not exists archived_at timestamptz;
alter table milestones add column if not exists archived_at timestamptz;
alter table subtasks   add column if not exists archived_at timestamptz;

-- Partial indexes: the common query is "everything still live", so only the
-- archived minority needs indexing.
create index if not exists idx_projects_archived_at
  on projects(archived_at) where archived_at is not null;
create index if not exists idx_tasks_archived_at
  on tasks(archived_at) where archived_at is not null;
create index if not exists idx_milestones_archived_at
  on milestones(archived_at) where archived_at is not null;
create index if not exists idx_subtasks_archived_at
  on subtasks(archived_at) where archived_at is not null;

comment on column projects.archived_at is
  'Set when the mirrored Baserow row no longer exists. Cleared automatically '
  'if it reappears. Rows created in the tracker (baserow_id null) are never '
  'archived by the sync.';
