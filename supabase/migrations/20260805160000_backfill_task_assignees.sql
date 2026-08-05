-- Seed the assignee for tasks that were mirrored before projects carried an
-- engineer.
--
-- The task sync only defaults the assignee on insert, so tasks synced earlier
-- kept a null assignee. This backfill is one-time and deliberately restricted
-- to rows where assignee_id is still null, so it cannot overwrite an
-- assignment made in the tracker.

update tasks t
   set assignee_id = p.engineer_id,
       updated_at  = now()
  from projects p
 where p.id = t.project_id
   and t.assignee_id is null
   and t.baserow_id is not null
   and p.engineer_id is not null;
