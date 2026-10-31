-- Applied to lzywhitaxstskrodbvok via the Supabase MCP on 30 Oct 2026.

-- Invites must be able to carry the two ECAS roles.
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.pending_invites'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.pending_invites DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.pending_invites ADD CONSTRAINT pending_invites_role_check
  CHECK (role IN ('admin', 'executive', 'pa', 'lead', 'employee'));

-- mark_invite_used is for signed-in users only; Supabase default privileges
-- had also granted it to anon. rls_auto_enable is never for API callers.
-- get_invite stays open: SignupPage calls it before the user has a session.
REVOKE EXECUTE ON FUNCTION public.mark_invite_used(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
