-- Create project_comments table
create table if not exists project_comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references users(id) on delete set null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for project_comments
alter table project_comments enable row level security;

-- Policies for project_comments
create policy "Users can view comments on projects in their company"
  on project_comments for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_comments.project_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

create policy "Users can create comments on projects in their company"
  on project_comments for insert
  with check (
    exists (
      select 1 from projects p
      where p.id = project_comments.project_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

-- Create project_attachments table
create table if not exists project_attachments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references users(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz default now()
);

-- Enable RLS for project_attachments
alter table project_attachments enable row level security;

-- Policies for project_attachments
create policy "Users can view attachments on projects in their company"
  on project_attachments for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_attachments.project_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

create policy "Users can upload attachments to projects in their company"
  on project_attachments for insert
  with check (
    exists (
      select 1 from projects p
      where p.id = project_attachments.project_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );

create policy "Users can delete attachments from projects in their company"
  on project_attachments for delete
  using (
    exists (
      select 1 from projects p
      where p.id = project_attachments.project_id
      and p.company_id = (select company_id from users where id = auth.uid())
    )
  );
