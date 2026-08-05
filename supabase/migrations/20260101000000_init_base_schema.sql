-- Base schema for monitoring-tracker.
--
-- These tables were originally created through the Supabase dashboard in a
-- project shared with unrelated applications, so they were never captured as
-- migrations. This file reproduces them exactly (columns, defaults, checks,
-- foreign keys and indexes were introspected from that database) so the
-- dedicated monitoring-tracker project can be built from version control.
--
-- It is timestamped ahead of the 20260201* migrations, which patch these
-- tables and therefore must run afterwards.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists companies (
  id uuid default uuid_generate_v4() not null,
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint companies_pkey PRIMARY KEY (id),
  constraint companies_name_key UNIQUE (name)
);
create table if not exists users (
  id uuid not null,
  email text not null,
  name text not null,
  role text not null,
  company_id uuid,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  auth_id text,
  constraint users_pkey PRIMARY KEY (id),
  constraint users_auth_id_key UNIQUE (auth_id),
  constraint users_email_key UNIQUE (email),
  constraint users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'lead'::text, 'employee'::text, 'superuser'::text, 'minta'::text, 'mintah'::text, 'sam'::text, 'finance'::text])))
);
create table if not exists projects (
  id uuid default uuid_generate_v4() not null,
  name text not null,
  description text,
  company_id uuid not null,
  status text default 'active'::text,
  contract_value numeric(12,2) not null,
  actual_cost numeric(12,2) default 0,
  expected_handover date,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  start_date date,
  service_type text,
  constraint projects_pkey PRIMARY KEY (id),
  constraint projects_service_type_check CHECK ((service_type = ANY (ARRAY['construction'::text, 'logistics'::text, 'technical'::text, 'manpower'::text, 'energy'::text, 'mining'::text, 'infrastructure'::text, 'consulting'::text, 'other'::text]))),
  constraint projects_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'on_hold'::text])))
);
create table if not exists pipeline_projects (
  id uuid default uuid_generate_v4() not null,
  name text not null,
  client_name text not null,
  company_id uuid not null,
  estimated_value numeric(12,2) not null,
  probability integer,
  stage text default 'lead'::text,
  expected_close_date date,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint pipeline_projects_pkey PRIMARY KEY (id),
  constraint pipeline_projects_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
  constraint pipeline_projects_stage_check CHECK ((stage = ANY (ARRAY['lead'::text, 'qualified'::text, 'proposal'::text, 'negotiation'::text, 'contract'::text])))
);
create table if not exists milestones (
  id uuid default uuid_generate_v4() not null,
  project_id uuid not null,
  name text not null,
  description text,
  due_date date,
  completed_date date,
  status text default 'pending'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint milestones_pkey PRIMARY KEY (id),
  constraint milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text, 'cancelled'::text])))
);
create table if not exists tasks (
  id uuid default uuid_generate_v4() not null,
  title text not null,
  description text,
  project_id uuid not null,
  assignee_id uuid not null,
  stage text default 'yet_to_start'::text,
  priority text default 'medium'::text,
  due_date date,
  estimated_hours numeric(5,2),
  actual_hours numeric(5,2),
  tags text[],
  blocker_description text,
  created_by uuid not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  constraint tasks_pkey PRIMARY KEY (id),
  constraint tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
  constraint tasks_stage_check CHECK ((stage = ANY (ARRAY['talking_stage'::text, 'yet_to_start'::text, 'in_progress'::text, 'blockers'::text, 'completed'::text])))
);
create table if not exists subtasks (
  id uuid default uuid_generate_v4() not null,
  task_id uuid not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default now(),
  constraint subtasks_pkey PRIMARY KEY (id)
);
create table if not exists task_comments (
  id uuid default uuid_generate_v4() not null,
  task_id uuid not null,
  user_id uuid not null,
  comment text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint task_comments_pkey PRIMARY KEY (id)
);
create table if not exists task_assignees (
  id uuid default uuid_generate_v4() not null,
  task_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint task_assignees_pkey PRIMARY KEY (id),
  constraint task_assignees_task_id_user_id_key UNIQUE (task_id, user_id)
);
create table if not exists project_comments (
  id uuid default uuid_generate_v4() not null,
  project_id uuid not null,
  user_id uuid not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint project_comments_pkey PRIMARY KEY (id)
);
create table if not exists project_attachments (
  id uuid default uuid_generate_v4() not null,
  project_id uuid not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  url text not null,
  uploaded_by uuid not null,
  created_at timestamp with time zone default now(),
  constraint project_attachments_pkey PRIMARY KEY (id)
);
create table if not exists approvals (
  id uuid default uuid_generate_v4() not null,
  project_id uuid not null,
  requester_id uuid not null,
  approved_by uuid,
  lead_id uuid,
  type text not null,
  title text,
  content text not null,
  entity_type text not null,
  entity_id uuid not null,
  status text default 'pending'::text not null,
  comments text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint approvals_pkey PRIMARY KEY (id),
  constraint approvals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);
create table if not exists audit_log (
  id uuid default uuid_generate_v4() not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  field text,
  old_value text,
  new_value text,
  summary text not null,
  user_id uuid,
  created_at timestamp with time zone default now(),
  constraint audit_log_pkey PRIMARY KEY (id),
  constraint audit_log_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text, 'stage_changed'::text, 'status_changed'::text, 'imported'::text]))),
  constraint audit_log_entity_type_check CHECK ((entity_type = ANY (ARRAY['project'::text, 'task'::text, 'milestone'::text, 'approval'::text, 'import'::text])))
);

-- Foreign keys (added after all tables exist)
alter table users drop constraint if exists users_company_id_fkey;
alter table users add constraint users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
alter table projects drop constraint if exists projects_company_id_fkey;
alter table projects add constraint projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
alter table projects drop constraint if exists projects_created_by_fkey;
alter table projects add constraint projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
alter table pipeline_projects drop constraint if exists pipeline_projects_company_id_fkey;
alter table pipeline_projects add constraint pipeline_projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
alter table pipeline_projects drop constraint if exists pipeline_projects_created_by_fkey;
alter table pipeline_projects add constraint pipeline_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
alter table milestones drop constraint if exists milestones_created_by_fkey;
alter table milestones add constraint milestones_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
alter table milestones drop constraint if exists milestones_project_id_fkey;
alter table milestones add constraint milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table tasks drop constraint if exists tasks_assignee_id_fkey;
alter table tasks add constraint tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id);
alter table tasks drop constraint if exists tasks_created_by_fkey;
alter table tasks add constraint tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
alter table tasks drop constraint if exists tasks_project_id_fkey;
alter table tasks add constraint tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table subtasks drop constraint if exists subtasks_task_id_fkey;
alter table subtasks add constraint subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
alter table task_comments drop constraint if exists task_comments_task_id_fkey;
alter table task_comments add constraint task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
alter table task_comments drop constraint if exists task_comments_user_id_fkey;
alter table task_comments add constraint task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
alter table task_assignees drop constraint if exists task_assignees_task_id_fkey;
alter table task_assignees add constraint task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
alter table task_assignees drop constraint if exists task_assignees_user_id_fkey;
alter table task_assignees add constraint task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table project_comments drop constraint if exists project_comments_project_id_fkey;
alter table project_comments add constraint project_comments_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table project_comments drop constraint if exists project_comments_user_id_fkey;
alter table project_comments add constraint project_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table project_attachments drop constraint if exists project_attachments_project_id_fkey;
alter table project_attachments add constraint project_attachments_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table project_attachments drop constraint if exists project_attachments_uploaded_by_fkey;
alter table project_attachments add constraint project_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;
alter table approvals drop constraint if exists approvals_approved_by_fkey;
alter table approvals add constraint approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
alter table approvals drop constraint if exists approvals_lead_id_fkey;
alter table approvals add constraint approvals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL;
alter table approvals drop constraint if exists approvals_project_id_fkey;
alter table approvals add constraint approvals_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table approvals drop constraint if exists approvals_requester_id_fkey;
alter table approvals add constraint approvals_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
alter table audit_log drop constraint if exists audit_log_user_id_fkey;
alter table audit_log add constraint audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_company_id ON public.pipeline_projects USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_stage ON public.pipeline_projects USING btree (stage);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON public.tasks USING btree (stage);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks USING btree (updated_at);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);

