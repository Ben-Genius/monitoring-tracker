-- Create task_assignees table for multi-select support
create table if not exists task_assignees (
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (task_id, user_id)
);

-- Enable Row Level Security
alter table task_assignees enable row level security;

-- Policies
-- 1. View policy: Users can view assignees if they have access to the project via company_id
create policy "Users can view assignees of tasks in their company"
  on task_assignees for select
  using (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = task_assignees.task_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

-- 2. Insert policy: Users can assign users if they can create tasks (same company check)
create policy "Users can add assignees to tasks in their company"
  on task_assignees for insert
  with check (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = task_assignees.task_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

-- 3. Delete policy: Users can remove assignees if they can edit tasks
create policy "Users can remove assignees from tasks in their company"
  on task_assignees for delete
  using (
    exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = task_assignees.task_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );
