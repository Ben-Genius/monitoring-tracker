-- Applied to lzywhitaxstskrodbvok via the Supabase MCP on 30 Oct 2026.

-- The PA chases tasks in all three companies, so needs update rights there
-- too, not only insert. Mirrors "PA and admin can create tasks in any company".
DROP POLICY IF EXISTS "PA and admin can update tasks in any company" ON public.tasks;
CREATE POLICY "PA and admin can update tasks in any company" ON public.tasks
  FOR UPDATE TO authenticated
  USING (COALESCE((SELECT u.role IN ('admin', 'pa') FROM public.users u WHERE u.id = auth.uid()), false))
  WITH CHECK (COALESCE((SELECT u.role IN ('admin', 'pa') FROM public.users u WHERE u.id = auth.uid()), false));

-- The executive reads and changes nothing. "Company members can update tasks"
-- would otherwise let him edit his own company's tasks, so a restrictive
-- policy closes that regardless of what permissive policies allow.
DROP POLICY IF EXISTS "Executive cannot update tasks" ON public.tasks;
CREATE POLICY "Executive cannot update tasks" ON public.tasks
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (COALESCE((SELECT u.role <> 'executive' FROM public.users u WHERE u.id = auth.uid()), true));
