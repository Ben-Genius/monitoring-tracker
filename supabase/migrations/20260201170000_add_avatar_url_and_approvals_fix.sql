
-- Add avatar_url to users table if it doesn't exist
alter table users 
add column if not exists avatar_url text;

-- Add comments column to approvals table (re-applying in case previous missed)
alter table approvals 
add column if not exists comments text;
