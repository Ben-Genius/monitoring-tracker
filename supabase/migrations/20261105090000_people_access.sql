-- People page: who can actually sign in.
--
-- Profiles in public.users come from the Baserow import as well as from
-- invitations, so a profile does not mean the person has a login. The browser
-- cannot read auth.users, so this read-only function reports, per profile,
-- whether a login exists and when it was last used.
--
-- Visibility follows the existing rules: admin, executive and PA see every
-- company; a lead sees only their own company; everyone else sees nothing.

create or replace function public.people_access()
returns table (user_id uuid, has_login boolean, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
    select u.id, au.id is not null, au.last_sign_in_at
    from public.users u
    left join auth.users au on au.id = u.id
    where exists (
        select 1 from public.users me
        where me.id = auth.uid()
          and (
              me.role in ('admin', 'executive', 'pa')
              or (me.role = 'lead' and me.company_id = u.company_id)
          )
    );
$$;

revoke all on function public.people_access() from public, anon;
grant execute on function public.people_access() to authenticated;
