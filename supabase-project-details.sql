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

-- 4. Basic RLS Policies (Adjust as needed based on your specific security model)
-- For project_comments
CREATE POLICY "Allow authenticated users to read project_comments" ON project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users to insert their own comments" ON project_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- For project_attachments
CREATE POLICY "Allow authenticated users to read project_attachments" ON project_attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert attachments" ON project_attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
