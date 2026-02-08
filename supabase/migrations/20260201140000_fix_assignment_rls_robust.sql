-- Robust RLS policies for task assignees to support General Tasks and Admin overrides
-- Addresses 403 Forbidden error on task_assignees insert/update

-- Drop existing policies to ensure clean slate
drop policy if exists "Users can view assignees of tasks in their company" on task_assignees;
drop policy if exists "Users can add assignees to tasks in their company" on task_assignees;
drop policy if exists "Users can remove assignees from tasks in their company" on task_assignees;

-- 1. View policy
-- Allow if:
-- - User is Admin
-- - OR Task is in user's Project Company
-- - OR Task Creator is in user's Company (for General Tasks)
create policy "Users can view assignees of tasks in their company"
  on task_assignees for select
  using (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and (
        -- Admin Access (Bypass Company Check if needed, or strictly enforce company?)
        -- Assuming Admins can see everything in their instance/company
        (select role from users where id = auth.uid()) = 'admin'
        OR
        -- Standard Company Check
        coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
      )
    )
  );

-- 2. Insert policy
create policy "Users can add assignees to tasks in their company"
  on task_assignees for insert
  with check (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and (
        (select role from users where id = auth.uid()) = 'admin'
        OR
        coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
      )
    )
  );

-- 3. Delete policy
create policy "Users can remove assignees from tasks in their company"
  on task_assignees for delete
  using (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and (
        (select role from users where id = auth.uid()) = 'admin'
        OR
        coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
      )
    )
  );
