/**
 * The morning brief rules, shared by the app (src/features/brief) and the
 * 7am email job (api/send-morning-briefs.ts) so both put a task in the same
 * section. Pure functions only: no imports, so it runs in the browser and in
 * Node alike.
 *
 * ECAS accountability rules, agreed in the 29 Oct ideation meeting:
 * - Nothing stays in progress more than two days without movement.
 * - An assigned task has to be accepted by its owner, even with one tap.
 * Staleness is derived at read time, never stored, so silence can't be
 * written down as progress.
 */

export type BriefSection = 'urgent' | 'blocked' | 'stuck' | 'overdue' | 'unaccepted' | 'moved' | 'done';

export const STALE_AFTER_DAYS = 2;
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface AccountableTask {
    stage: string;
    progress_percent: number;
    acknowledged_at: string | null;
    last_movement_at: string | null;
    next_update_due: string | null;
    is_urgent: boolean;
    assignee_id: string | null;
}

export interface ClassifiableTask extends AccountableTask {
    due_date: string | null;
}

/** In progress, and hasn't moved in more than two days. */
export function isStale(task: AccountableTask, now = Date.now()): boolean {
    if (task.stage !== 'in_progress' || !task.last_movement_at) return false;
    return now - new Date(task.last_movement_at).getTime() > STALE_AFTER_DAYS * DAY_MS;
}

/** Has an owner who hasn't accepted it yet. */
export function awaitingAcceptance(task: AccountableTask): boolean {
    return task.stage !== 'completed' && !!task.assignee_id && !task.acknowledged_at;
}

/** The owner promised an update by a date that has passed. */
export function isUpdateOverdue(task: AccountableTask, now = Date.now()): boolean {
    if (task.stage === 'completed' || !task.next_update_due) return false;
    return new Date(task.next_update_due).getTime() < now;
}

export function isPastDue(task: ClassifiableTask, now = Date.now()): boolean {
    return !!task.due_date && new Date(task.due_date).getTime() < now;
}

/**
 * The one section an open task belongs in: the most serious that applies, so
 * the same item never appears twice. urgent > blocked > stuck > overdue >
 * not accepted > moved. Completed tasks are 'done'; null means it isn't news.
 */
export function classifyBriefTask(t: ClassifiableTask, now = Date.now()): BriefSection | null {
    if (t.stage === 'completed') return 'done';
    if (t.is_urgent) return 'urgent';
    if (t.stage === 'blockers') return 'blocked';
    if (isStale(t, now)) return 'stuck';
    if (isPastDue(t, now) || isUpdateOverdue(t, now)) return 'overdue';
    if (awaitingAcceptance(t)) return 'unaccepted';
    // Good news counts too: something that genuinely moved in the last day.
    if (t.last_movement_at && now - new Date(t.last_movement_at).getTime() < DAY_MS) return 'moved';
    return null;
}

/** The sections that count as needing attention (not acceptance, moved or done). */
export const AT_RISK: readonly BriefSection[] = ['urgent', 'blocked', 'stuck', 'overdue'];

/** Order within a section: longest silence, most overdue, most recent done first. */
export const BRIEF_SORTERS: Partial<Record<BriefSection, (a: SortableTask, b: SortableTask) => number>> = {
    stuck: (a, b) => time(a.last_movement_at) - time(b.last_movement_at),
    overdue: (a, b) => time(a.due_date ?? a.next_update_due) - time(b.due_date ?? b.next_update_due),
    done: (a, b) => time(b.completed_at) - time(a.completed_at),
};

interface SortableTask {
    last_movement_at: string | null;
    due_date: string | null;
    next_update_due: string | null;
    completed_at: string | null;
}

function time(iso: string | null): number {
    return iso ? new Date(iso).getTime() : 0;
}
