-- People page: real account deactivation, and two invite functions locked down.
--
-- Deactivation is enforced where sign-in happens, not just stored as a flag:
--   * auth.users.banned_until stops new sign-ins and token refreshes;
--   * the person's sessions are deleted, so open tabs lose access when their
--     current access token expires (at most one hour);
--   * public.users.deactivated_at lets the app show the state and sign them out.
-- Only admins can change it, never for themselves, and never for the last admin.

alter table public.users
    add column if not exists deactivated_at timestamptz,
    add column if not exists deactivated_by uuid references public.users(id) on update cascade on delete set null;

-- Let the audit trail record changes to people.
alter table public.audit_log drop constraint if exists audit_log_entity_type_check;
alter table public.audit_log add constraint audit_log_entity_type_check
    check (entity_type = any (array['project', 'task', 'milestone', 'approval', 'import', 'user']));

create or replace function public.set_user_access(p_user uuid, p_active boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_me     uuid := auth.uid();
    v_target public.users%rowtype;
    v_when   timestamptz := case when p_active then null else now() end;
begin
    if not exists (select 1 from public.users where id = v_me and role = 'admin' and deactivated_at is null) then
        raise exception 'only an admin can change who can sign in';
    end if;
    if p_user = v_me then
        raise exception 'you cannot deactivate your own account';
    end if;

    select * into v_target from public.users where id = p_user;
    if not found then
        raise exception 'that person no longer exists';
    end if;

    if not p_active and v_target.role = 'admin'
       and not exists (select 1 from public.users where role = 'admin' and deactivated_at is null and id <> p_user) then
        raise exception 'at least one admin must keep access';
    end if;

    update public.users
       set deactivated_at = v_when,
           deactivated_by = case when p_active then null else v_me end,
           updated_at = now()
     where id = p_user;

    -- Block or restore the login itself. A far-future date rather than
    -- 'infinity', which the auth server does not parse.
    update auth.users
       set banned_until = case when p_active then null else '2999-12-31 00:00:00+00'::timestamptz end
     where id = p_user;

    if not p_active then
        delete from auth.sessions where user_id = p_user;
    end if;

    insert into public.audit_log (entity_type, entity_id, action, field, old_value, new_value, summary, user_id)
    values ('user', p_user, 'status_changed', 'access',
            case when p_active then 'deactivated' else 'active' end,
            case when p_active then 'active' else 'deactivated' end,
            case when p_active then 'Restored access for ' else 'Deactivated ' end || v_target.name,
            v_me);

    return v_when;
end;
$$;

revoke all on function public.set_user_access(uuid, boolean) from public, anon;
grant execute on function public.set_user_access(uuid, boolean) to authenticated;

-- people_access now also reports deactivation. The return type changes, so drop first.
drop function if exists public.people_access();
create function public.people_access()
returns table (user_id uuid, has_login boolean, last_sign_in_at timestamptz, deactivated_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
    select u.id, au.id is not null, au.last_sign_in_at, u.deactivated_at
    from public.users u
    left join auth.users au on au.id = u.id
    where exists (
        select 1 from public.users me
        where me.id = auth.uid()
          and me.deactivated_at is null
          and (
              me.role in ('admin', 'executive', 'pa')
              or (me.role = 'lead' and me.company_id = u.company_id)
          )
    );
$$;

revoke all on function public.people_access() from public, anon;
grant execute on function public.people_access() to authenticated;

-- Hardening. Neither function is used by the app, and both were callable by
-- any signed-in user:
--   * claim_user_profile handed over an imported profile (and its role) to
--     anyone who signed up with a matching email, bypassing the invite;
--   * mark_invite_used let anyone holding a token burn an invite.
-- accept_invite already covers the real signup path with an email check.
revoke all on function public.claim_user_profile(text) from public, anon, authenticated;
revoke all on function public.mark_invite_used(text) from public, anon, authenticated;
