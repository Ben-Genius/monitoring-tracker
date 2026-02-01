-- Fix RLS policies for task assignees to support General Tasks (project_id IS NULL)
-- Previous policies relied on project_id to determine company. For general tasks, we must fallback to created_by user's company.

-- Drop existing policies
drop policy if exists "Users can view assignees of tasks in their company" on task_assignees;
drop policy if exists "Users can add assignees to tasks in their company" on task_assignees;
drop policy if exists "Users can remove assignees from tasks in their company" on task_assignees;

-- 1. View policy
create policy "Users can view assignees of tasks in their company"
  on task_assignees for select
  using (
    exists (
      select 1 from tasks t
      left join projects p on p.id = t.project_id
      left join users creator on creator.id = t.created_by
      where t.id = task_assignees.task_id
      and coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
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
      and coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
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
      and coalesce(p.company_id, creator.company_id) = (select company_id from users where id = auth.uid())
    )
  );
