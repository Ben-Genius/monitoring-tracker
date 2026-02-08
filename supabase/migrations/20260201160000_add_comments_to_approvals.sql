
-- Add comments column to approvals table
alter table approvals 
add column if not exists comments text;

-- Fix project_comments query issue (ensure it's not ambiguous)
-- The 400 error for project_comments might be due to user role permissions or invalid query param
-- But let's verify RLS policies for project_comments again just in case (already did in previous migration, but double check)
-- Actually, the 400 bad request for project_comments might be because of a 'select' syntax error or property matching.
-- Let's just focus on approvals first as that is the explicit PGRST204 error.
