-- =====================================================
-- Migration: Add Project Details and Task Categories
-- =====================================================

-- 1. Add category column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Create project_comments table
CREATE TABLE IF NOT EXISTS project_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for project_comments
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

-- 3. Create project_attachments table
CREATE TABLE IF NOT EXISTS project_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for project_attachments
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies scoped by company
-- For project_comments
CREATE POLICY "Company members can read project_comments" ON project_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_comments.project_id
        AND p.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own comments" ON project_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_comments.project_id
        AND p.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments" ON project_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON project_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- For project_attachments
CREATE POLICY "Company members can read project_attachments" ON project_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_attachments.project_id
        AND p.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert attachments in their company" ON project_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_attachments.project_id
        AND p.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update attachments in their company" ON project_attachments
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_attachments.project_id
          AND p.company_id = u.company_id
      )
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_attachments.project_id
          AND p.company_id = u.company_id
      )
    )
  );

CREATE POLICY "Users can delete attachments in their company" ON project_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_attachments.project_id
          AND p.company_id = u.company_id
      )
    )
  );
