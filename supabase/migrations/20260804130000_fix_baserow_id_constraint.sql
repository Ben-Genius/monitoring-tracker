-- Make projects.baserow_id usable as an ON CONFLICT target.
--
-- 20260803140000 created a partial unique index:
--   create unique index ... on projects(baserow_id) where baserow_id is not null
--
-- Postgres will only use a partial index for ON CONFLICT if the statement
-- repeats the same WHERE predicate, which PostgREST cannot express. So the
-- sync's upsert failed with "no unique or exclusion constraint matching the
-- ON CONFLICT specification".
--
-- A plain unique constraint is the right tool: Postgres treats NULLs as
-- distinct, so rows created in the tracker (baserow_id null) are still
-- unconstrained, while mirrored rows stay unique per Baserow row.

drop index if exists idx_projects_baserow_id;

alter table projects
  drop constraint if exists projects_baserow_id_key;

alter table projects
  add constraint projects_baserow_id_key unique (baserow_id);
