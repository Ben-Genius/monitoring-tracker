-- Pin the trigger function's search_path.
--
-- Supabase's database linter flagged track_task_movement as having a mutable
-- search_path: it resolved unqualified names against whatever path the caller
-- had, which is the standard escalation route for a function attached to a
-- table everyone writes to. It only calls NOW() — pg_catalog, always in scope —
-- so an empty path is safe.

CREATE OR REPLACE FUNCTION public.track_task_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.progress_percent IS DISTINCT FROM OLD.progress_percent THEN
    NEW.last_movement_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
