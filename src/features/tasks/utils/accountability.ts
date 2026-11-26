import type { Task } from '../hooks/useTasks';

/**
 * ECAS accountability rules, agreed in the 29 Oct ideation meeting.
 *
 * - "In progress" is not a status: progress moves in 25% steps.
 * - Nothing stays in progress more than two days without movement.
 * - An assigned task has to be accepted by its owner, even with one tap.
 *
 * Staleness is derived here at read time, never stored, so silence can't be
 * written down as progress.
 */

export const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

// The rules themselves live in shared/ so the 7am email job applies the same ones.
export { STALE_AFTER_DAYS, isStale, awaitingAcceptance, isUpdateOverdue } from '../../../../shared/briefRules';

const DAY_MS = 24 * 60 * 60 * 1000;

type AccountableTask = Pick<
    Task,
    'stage' | 'progress_percent' | 'acknowledged_at' | 'last_movement_at' | 'next_update_due' | 'is_urgent'
> & { assignee_id: string | null };

export function taskProgress(task: AccountableTask, subtaskFallback = 0): number {
    if (task.stage === 'completed') return 100;
    return task.progress_percent || subtaskFallback;
}

export function daysSinceMovement(task: AccountableTask, now = Date.now()): number | null {
    if (!task.last_movement_at) return null;
    return Math.floor((now - new Date(task.last_movement_at).getTime()) / DAY_MS);
}
