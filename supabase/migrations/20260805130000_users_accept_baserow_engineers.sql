-- Allow Baserow engineers to live in the users table.
--
-- Engineers arrive from Baserow with no auth account, so their users row gets
-- a generated uuid. When that person later accepts an invite, their row must
-- adopt auth.uid() as its primary key, because the whole app resolves the
-- current user with `users.id = auth.uid()`.
--
-- Changing a primary key is only safe if every reference follows it, so all
-- foreign keys into users(id) gain ON UPDATE CASCADE. Existing ON DELETE
-- behaviour is preserved exactly.

-- ---------------------------------------------------------------------------
-- Link column
-- ---------------------------------------------------------------------------
alter table users
  add column if not exists baserow_id integer;

alter table users
  drop constraint if exists users_baserow_id_key;

alter table users
  add constraint users_baserow_id_key unique (baserow_id);

alter table users
  add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- ON UPDATE CASCADE on every reference to users(id)
-- ---------------------------------------------------------------------------
alter table approvals drop constraint if exists approvals_approved_by_fkey;
alter table approvals add constraint approvals_approved_by_fkey
  foreign key (approved_by) references users(id) on update cascade on delete set null;

alter table approvals drop constraint if exists approvals_lead_id_fkey;
alter table approvals add constraint approvals_lead_id_fkey
  foreign key (lead_id) references users(id) on update cascade on delete set null;

alter table approvals drop constraint if exists approvals_requester_id_fkey;
alter table approvals add constraint approvals_requester_id_fkey
  foreign key (requester_id) references users(id) on update cascade on delete cascade;

alter table audit_log drop constraint if exists audit_log_user_id_fkey;
alter table audit_log add constraint audit_log_user_id_fkey
  foreign key (user_id) references users(id) on update cascade on delete set null;

alter table milestones drop constraint if exists milestones_created_by_fkey;
alter table milestones add constraint milestones_created_by_fkey
  foreign key (created_by) references users(id) on update cascade on delete set null;

alter table pending_invites drop constraint if exists pending_invites_invited_by_fkey;
alter table pending_invites add constraint pending_invites_invited_by_fkey
  foreign key (invited_by) references users(id) on update cascade on delete set null;

alter table pipeline_projects drop constraint if exists pipeline_projects_created_by_fkey;
alter table pipeline_projects add constraint pipeline_projects_created_by_fkey
  foreign key (created_by) references users(id) on update cascade;

alter table project_attachments drop constraint if exists project_attachments_uploaded_by_fkey;
alter table project_attachments add constraint project_attachments_uploaded_by_fkey
  foreign key (uploaded_by) references users(id) on update cascade on delete cascade;

alter table project_comments drop constraint if exists project_comments_user_id_fkey;
alter table project_comments add constraint project_comments_user_id_fkey
  foreign key (user_id) references users(id) on update cascade on delete cascade;

alter table projects drop constraint if exists projects_created_by_fkey;
alter table projects add constraint projects_created_by_fkey
  foreign key (created_by) references users(id) on update cascade;

alter table task_assignees drop constraint if exists task_assignees_user_id_fkey;
alter table task_assignees add constraint task_assignees_user_id_fkey
  foreign key (user_id) references users(id) on update cascade on delete cascade;

alter table task_comments drop constraint if exists task_comments_user_id_fkey;
alter table task_comments add constraint task_comments_user_id_fkey
  foreign key (user_id) references users(id) on update cascade;

alter table tasks drop constraint if exists tasks_assignee_id_fkey;
alter table tasks add constraint tasks_assignee_id_fkey
  foreign key (assignee_id) references users(id) on update cascade;

alter table tasks drop constraint if exists tasks_created_by_fkey;
alter table tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references users(id) on update cascade;

-- ---------------------------------------------------------------------------
-- Claiming a pre-existing profile at signup
-- ---------------------------------------------------------------------------
-- When an invited engineer signs up, their users row already exists (synced
-- from Baserow) but is keyed by a placeholder uuid. This repoints it at their
-- real auth id; the cascades above carry every reference along.
--
-- SECURITY: the row is matched against the email in the caller's own verified
-- JWT, never against a parameter. Without that, anyone could claim any
-- colleague's profile — including an admin's — simply by naming their address.
create or replace function public.claim_user_profile(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_id    uuid;
begin
  if v_uid is null or v_email is null then
    raise exception 'not authenticated';
  end if;

  -- Already claimed (or created normally) — nothing to do.
  select id into v_id from public.users where id = v_uid;
  if found then
    return v_id;
  end if;

  update public.users
     set id = v_uid,
         name = coalesce(p_name, name),
         updated_at = now()
   where lower(email) = lower(v_email)
   returning id into v_id;

  return v_id;  -- null when there was no profile to claim
end;
$$;

revoke execute on function public.claim_user_profile(text) from public, anon;
grant execute on function public.claim_user_profile(text) to authenticated;

comment on column users.baserow_id is
  'Baserow Engineers (table 1044018) row id. Null for tracker-native accounts.';
