-- Atomic invite acceptance, plus closing a privilege-escalation hole.
--
-- Two problems solved here:
--
-- 1. An invited engineer already has a users row (synced from Baserow), so the
--    plain insert in SignupPage fails on users_email_key. The row must instead
--    be claimed — see 20260805130000 for why every FK cascades on update.
--
-- 2. The users UPDATE policy allowed a user to modify their own row with no
--    restriction on WHICH columns, so anyone could run
--        update users set role = 'admin' where id = auth.uid()
--    and escalate. Roles now come from the invite, server-side, and the policy
--    forbids self-service role or company changes.

-- ---------------------------------------------------------------------------
-- accept_invite: claim-or-create the profile, then consume the invite
-- ---------------------------------------------------------------------------
-- Replaces the client-side sequence of insert-users + mark_invite_used. Doing
-- it in one function means role and company come from the invite rather than
-- from whatever the browser posts, and a failure cannot leave an invite
-- consumed with no profile created.
create or replace function public.accept_invite(p_token text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text := auth.jwt() ->> 'email';
  v_invite  public.pending_invites%rowtype;
  v_user_id uuid;
begin
  if v_uid is null or v_email is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
    from public.pending_invites
   where token = p_token
     and used = false
     and expires_at > now();

  if not found then
    raise exception 'invalid or expired invitation';
  end if;

  -- The invite is addressed to a specific person. Without this check any
  -- authenticated user could redeem someone else's invite and inherit the
  -- role it carries.
  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'this invitation was issued to a different email address';
  end if;

  -- Existing profile (e.g. an engineer mirrored from Baserow): repoint its
  -- primary key at the real auth id. FKs cascade, so task assignments and
  -- history follow.
  update public.users
     set id         = v_uid,
         name       = coalesce(p_name, name),
         role       = v_invite.role,
         company_id = v_invite.company_id,
         updated_at = now()
   where lower(email) = lower(v_email)
  returning id into v_user_id;

  if v_user_id is null then
    insert into public.users (id, email, name, role, company_id)
    values (v_uid, v_email, coalesce(p_name, v_invite.name), v_invite.role,
            v_invite.company_id)
    returning id into v_user_id;
  end if;

  update public.pending_invites set used = true where id = v_invite.id;

  return v_user_id;
end;
$$;

revoke execute on function public.accept_invite(text, text) from public, anon;
grant execute on function public.accept_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Close the self-escalation hole on users
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update themselves, admins update anyone" on users;
create policy "Users can update themselves, admins update anyone"
  on users for update
  to authenticated
  using (
    id = auth.uid()
    or (
      company_id = (select private.current_company_id())
      and (select private.current_user_role()) = 'admin'
    )
  )
  with check (
    -- Admins may change anything within their company.
    (
      (select private.current_user_role()) = 'admin'
      and company_id = (select private.current_company_id())
    )
    -- Everyone else may edit their own row but must leave role and company
    -- exactly as they are. current_user_role() is SECURITY DEFINER, so this
    -- does not recurse through the users policy.
    or (
      id = auth.uid()
      and role = (select private.current_user_role())
      and company_id = (select private.current_company_id())
    )
  );
