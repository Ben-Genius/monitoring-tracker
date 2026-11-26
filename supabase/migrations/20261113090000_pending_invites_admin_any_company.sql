-- Admins (and the ECAS cross-company roles) could not create an invite for any
-- company but their own: the insert/select/delete policies required
-- company_id = current_company_id() for everyone, while the People page offers
-- admins every company. Result: 42501 "new row violates row-level security
-- policy for table pending_invites".
--
-- Admins now manage invites in every company. Leads stay limited to their own,
-- and may only invite lead or employee (the UI already enforces that; this
-- makes the database enforce it too).

drop policy if exists "Staff can view invites in their company" on pending_invites;
create policy "Staff can view invites in their company"
  on pending_invites for select to authenticated
  using (
    (select private.current_user_role()) in ('admin', 'executive', 'pa')
    or (
      (select private.current_user_role()) = 'lead'
      and company_id = (select private.current_company_id())
    )
  );

drop policy if exists "Staff can create invites in their company" on pending_invites;
create policy "Staff can create invites in their company"
  on pending_invites for insert to authenticated
  with check (
    (select private.current_user_role()) = 'admin'
    or (
      (select private.current_user_role()) = 'lead'
      and company_id = (select private.current_company_id())
      and role in ('lead', 'employee')
    )
  );

drop policy if exists "Staff can delete invites in their company" on pending_invites;
create policy "Staff can delete invites in their company"
  on pending_invites for delete to authenticated
  using (
    (select private.current_user_role()) = 'admin'
    or (
      (select private.current_user_role()) = 'lead'
      and company_id = (select private.current_company_id())
    )
  );
