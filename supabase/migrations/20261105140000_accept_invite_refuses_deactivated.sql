-- Close the last deactivation gap.
--
-- Someone deactivated before they ever had a login has no auth.users row to
-- ban, so an old invite could still create a login for them. The app signs
-- such a person out at once, but the database would accept their requests
-- for that first session. accept_invite now refuses a deactivated profile.
--
-- Identical to the live definition apart from the marked check.

create or replace function public.accept_invite(p_token text, p_name text default null::text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
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

  -- New: a deactivated person cannot get back in through an old invite.
  if exists (select 1 from public.users where lower(email) = lower(v_email) and deactivated_at is not null) then
    raise exception 'this account has been deactivated';
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
$function$;
