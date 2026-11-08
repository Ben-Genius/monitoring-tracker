-- Create pending_invites.
--
-- The application has queried this table since before the migrations existed,
-- but it was never created in any project — so every invite flow (signup,
-- user management) currently throws at runtime.
--
-- Security note: the signup page reads an invite BEFORE the user has an
-- account, i.e. as the anon role. A plain select policy for anon would let
-- anyone enumerate every pending invite — email, role and token — and redeem
-- one as an admin. So anon gets no table access; lookup goes through
-- get_invite(), which returns only the row matching a token the caller
-- already holds.

create table if not exists pending_invites (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  name text not null,
  role text not null,
  company_id uuid not null references companies(id) on delete cascade,
  -- Read back by the client immediately after insert to build the invite link.
  token text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  used boolean not null default false,
  invited_by uuid references users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now(),
  constraint pending_invites_role_check
    check (role in ('admin', 'lead', 'employee'))
);

create index if not exists idx_pending_invites_company_id on pending_invites(company_id);
create index if not exists idx_pending_invites_used on pending_invites(used);

-- ---------------------------------------------------------------------------
-- RLS: authenticated staff only. No anon access whatsoever.
-- ---------------------------------------------------------------------------
alter table pending_invites enable row level security;

drop policy if exists "Staff can view invites in their company" on pending_invites;
create policy "Staff can view invites in their company"
  on pending_invites for select
  to authenticated
  using (
    company_id = (select private.current_company_id())
    and (select private.current_user_role()) in ('admin', 'lead')
  );

drop policy if exists "Staff can create invites in their company" on pending_invites;
create policy "Staff can create invites in their company"
  on pending_invites for insert
  to authenticated
  with check (
    company_id = (select private.current_company_id())
    and (select private.current_user_role()) in ('admin', 'lead')
  );

drop policy if exists "Staff can delete invites in their company" on pending_invites;
create policy "Staff can delete invites in their company"
  on pending_invites for delete
  to authenticated
  using (
    company_id = (select private.current_company_id())
    and (select private.current_user_role()) in ('admin', 'lead')
  );

-- ---------------------------------------------------------------------------
-- Token redemption
-- ---------------------------------------------------------------------------

-- Returns the invite matching an exact token, or null. SECURITY DEFINER so it
-- can read past RLS, but it can only ever return one row and requires the
-- caller to already know the token — enumeration is not possible.
create or replace function public.get_invite(p_token text)
returns table (
  id uuid,
  email text,
  name text,
  role text,
  company_id uuid,
  company_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.email, i.name, i.role, i.company_id, c.name
  from public.pending_invites i
  join public.companies c on c.id = i.company_id
  where i.token = p_token
    and i.used = false
    and i.expires_at > now();
$$;

-- Marks an invite consumed. Called immediately after signup, so the caller is
-- authenticated by then. Requiring the token means one account cannot burn
-- another company's invite.
create or replace function public.mark_invite_used(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.pending_invites
     set used = true
   where token = p_token
     and used = false
     and expires_at > now();
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke execute on function public.get_invite(text) from public;
revoke execute on function public.mark_invite_used(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.mark_invite_used(text) to authenticated;

comment on table pending_invites is
  'Invitation tokens. Never exposed to anon directly — see get_invite().';
