-- Complete approvals table schema fix
-- Add all missing columns to the approvals table

alter table approvals 
add column if not exists entity_type text,
add column if not exists entity_id text,
add column if not exists comments text,
add column if not exists requester_id uuid references users(id);

-- Ensure the table has proper indexes for performance
create index if not exists idx_approvals_project_id on approvals(project_id);
create index if not exists idx_approvals_requester_id on approvals(requester_id);
create index if not exists idx_approvals_status on approvals(status);
