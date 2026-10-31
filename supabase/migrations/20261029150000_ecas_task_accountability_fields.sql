-- ECAS accountability loop, step 2: what a task has to answer.
--
-- From the 29 Oct ideation meeting, in Papa's words:
--
--   "In progress, I need to see it moving... can we get like 25%, 50%, 75%?
--    He doesn't want to hear in progress, the same in progress yesterday,
--    today and tomorrow."
--   "Even if it's like 'this thing has responded to me', something as light
--    as that — at least they have to be accepted."
--   "If there's an emergency, we also need to see it as red."
--
-- So a stage alone is not a status. A task now carries how far along it is,
-- whether its owner ever accepted it, when the next update is expected, and
-- when it last actually moved.
--
-- None of these columns appear in api/_lib/mapTask.ts COMPARED_FIELDS, so the
-- Baserow sync leaves every one of them alone. Staleness is deliberately NOT
-- stored: it is derived from last_movement_at at read time, so silence can
-- never be written down as progress.

BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_update_due DATE,
  ADD COLUMN IF NOT EXISTS last_movement_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tasks.progress_percent IS 'How far along, 0-100. A stage alone does not tell Mr Blay whether anything moved.';
COMMENT ON COLUMN tasks.acknowledged_at IS 'When the owner accepted the task. NULL means nobody has agreed to do this yet.';
COMMENT ON COLUMN tasks.next_update_due IS 'The date the owner promised to report again. Drives the chase queue.';
COMMENT ON COLUMN tasks.last_movement_at IS 'Last real change of stage or progress. Staleness is computed from this, never stored.';
COMMENT ON COLUMN tasks.is_urgent IS 'Shows red to the executive and bypasses the normal chase timings.';

-- Separate from update_task_stage_timestamps() so neither trigger has to know
-- about the other; both are BEFORE UPDATE and touch different columns.
CREATE OR REPLACE FUNCTION track_task_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.progress_percent IS DISTINCT FROM OLD.progress_percent THEN
    NEW.last_movement_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_task_movement_trigger ON tasks;
CREATE TRIGGER track_task_movement_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION track_task_movement();

-- The chase queue reads these constantly; the executive brief reads them once
-- a morning across every company.
CREATE INDEX IF NOT EXISTS idx_tasks_next_update_due ON tasks(next_update_due)
  WHERE next_update_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_unacknowledged ON tasks(assignee_id)
  WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_last_movement ON tasks(last_movement_at);

COMMIT;
