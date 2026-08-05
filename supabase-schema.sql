-- =====================================================
-- Monitoring Tracker Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert seed data for 3 companies
INSERT INTO companies (name, description) VALUES
  ('MacWest', 'MacWest Construction and Engineering'),
  ('CypressEnergy', 'CypressEnergy Infrastructure Development'),
  ('Northbrook LRD', 'Northbrook LRD Property Development');

-- =====================================================
-- 2. USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'lead', 'employee')),
  company_id UUID REFERENCES companies(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PROJECTS TABLE
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES companies(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  contract_value DECIMAL(12,2) NOT NULL,
  actual_cost DECIMAL(12,2) DEFAULT 0,
  expected_handover DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TASKS TABLE
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id),
  stage TEXT DEFAULT 'yet_to_start' CHECK (stage IN ('talking_stage', 'yet_to_start', 'in_progress', 'blockers', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  tags TEXT[],
  blocker_description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- 5. TASK COMMENTS TABLE
-- =====================================================
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. PIPELINE PROJECTS TABLE
-- =====================================================
CREATE TABLE pipeline_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  estimated_value DECIMAL(12,2) NOT NULL,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'contract')),
  expected_close_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('idle_task', 'profitability_alert', 'task_assigned', 'mention')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

-- Projects
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_stage ON tasks(stage);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);

-- Task Comments
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);

-- Pipeline Projects
CREATE INDEX idx_pipeline_projects_company_id ON pipeline_projects(company_id);
CREATE INDEX idx_pipeline_projects_stage ON pipeline_projects(stage);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_projects_updated_at BEFORE UPDATE ON pipeline_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update task timestamps based on stage
CREATE OR REPLACE FUNCTION update_task_stage_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when moving to in_progress
  IF NEW.stage = 'in_progress' AND OLD.stage != 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Set completed_at when moving to completed
  IF NEW.stage = 'completed' AND OLD.stage != 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Clear completed_at if moving away from completed
  IF NEW.stage != 'completed' AND OLD.stage = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_stage_timestamps_trigger BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_task_stage_timestamps();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Helper functions in private schema to avoid infinite recursion in RLS
create schema if not exists private;

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where id = auth.uid();
$$;

revoke execute on function private.current_company_id() from public, anon;
revoke execute on function private.current_user_role() from public, anon;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Companies: Members can read their own company
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT TO authenticated
  USING (id = private.current_company_id());

-- Companies: Admins can update their own company
CREATE POLICY "Admins can update their own company" ON companies
  FOR UPDATE TO authenticated
  USING (
    id = private.current_company_id()
    AND private.current_user_role() = 'admin'
  )
  WITH CHECK (
    id = private.current_company_id()
    AND private.current_user_role() = 'admin'
  );

-- Companies: Admins can delete their own company
CREATE POLICY "Admins can delete their own company" ON companies
  FOR DELETE TO authenticated
  USING (
    id = private.current_company_id()
    AND private.current_user_role() = 'admin'
  );

-- Users: Can view users in their company (or all if admin)
CREATE POLICY "Users can view users in their company" ON users
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id OR
    company_id = private.current_company_id() OR
    private.current_user_role() = 'admin'
  );

-- Users: Users can create their own profile
CREATE POLICY "Users can create their own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users: Users can update themselves, admins update their own company
CREATE POLICY "Users can update themselves, admins update their company" ON users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      company_id = private.current_company_id()
      AND private.current_user_role() = 'admin'
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      company_id = private.current_company_id()
      AND private.current_user_role() = 'admin'
    )
  );

-- Users: Admins can delete users in their company
CREATE POLICY "Admins can delete users in their company" ON users
  FOR DELETE TO authenticated
  USING (
    company_id = private.current_company_id()
    AND private.current_user_role() = 'admin'
  );

-- Projects: Can view projects in their company (or all if admin)
CREATE POLICY "Users can view projects in their company" ON projects
  FOR SELECT TO authenticated
  USING (
    company_id = private.current_company_id() OR
    private.current_user_role() = 'admin'
  );

CREATE POLICY "Users can create projects in their company" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = private.current_company_id()
  );

CREATE POLICY "Leads and admins can update their company projects" ON projects
  FOR UPDATE TO authenticated
  USING (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  )
  WITH CHECK (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  );

CREATE POLICY "Leads and admins can delete their company projects" ON projects
  FOR DELETE TO authenticated
  USING (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  );

-- Tasks: Can view tasks in their company's projects
CREATE POLICY "Users can view tasks in their company" ON tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND p.company_id = private.current_company_id()
    ) OR
    private.current_user_role() = 'admin'
  );

CREATE POLICY "Users can create tasks in their company" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND p.company_id = private.current_company_id()
    )
  );

CREATE POLICY "Users can update their assigned tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR private.current_user_role() IN ('lead', 'admin')
  )
  WITH CHECK (
    assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR private.current_user_role() IN ('lead', 'admin')
  );

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR private.current_user_role() = 'admin'
  );

-- Task Comments: Can view comments on tasks in their company
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND p.company_id = private.current_company_id()
    ) OR
    private.current_user_role() = 'admin'
  );

CREATE POLICY "Users can create comments on accessible tasks" ON task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND p.company_id = private.current_company_id()
    )
  );

CREATE POLICY "Users can update their own comments" ON task_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Pipeline Projects: Same as projects
CREATE POLICY "Users can view pipeline in their company" ON pipeline_projects
  FOR SELECT TO authenticated
  USING (
    company_id = private.current_company_id() OR
    private.current_user_role() = 'admin'
  );

CREATE POLICY "Users can create pipeline projects in their company" ON pipeline_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = private.current_company_id()
  );

CREATE POLICY "Leads and admins can update pipeline projects" ON pipeline_projects
  FOR UPDATE TO authenticated
  USING (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  )
  WITH CHECK (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  );

CREATE POLICY "Leads and admins can delete pipeline projects" ON pipeline_projects
  FOR DELETE TO authenticated
  USING (
    company_id = private.current_company_id()
    AND private.current_user_role() IN ('lead', 'admin')
  );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- Note: You'll need to create users through Supabase Auth first,
-- then insert their profiles here with the correct auth.users ID

-- Example: After creating a user in Supabase Auth Dashboard
-- INSERT INTO users (id, email, name, role, company_id) VALUES
--   ('auth-user-uuid-here', 'admin@example.com', 'Admin User', 'admin', (SELECT id FROM companies WHERE name = 'Macwest'));
