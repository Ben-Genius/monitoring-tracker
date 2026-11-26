import type { Task } from '@/features/tasks/hooks/useTasks';
import { toDay, today } from './days';

/** Where a task sits in time. Start falls back to when work began, then when it was created. */
export function taskStart(t: Task): Date | null {
    return toDay(t.start_date) ?? toDay(t.started_at) ?? toDay(t.created_at);
}

export function taskDue(t: Task): Date | null {
    return toDay(t.due_date);
}

export type Tone = 'neutral' | 'attention' | 'done';

/**
 * Colour is kept for what can't wait: urgent, blocked, or past its deadline.
 * Finished work steps back. Everything else stays neutral.
 */
export function taskTone(t: Task): Tone {
    if (t.stage === 'completed') return 'done';
    const due = taskDue(t);
    if (t.is_urgent || t.stage === 'blockers' || (due && due < today())) return 'attention';
    return 'neutral';
}

export function taskStatusWords(t: Task): string {
    if (t.stage === 'completed') return 'done';
    const parts: string[] = [];
    if (t.is_urgent) parts.push('urgent');
    if (t.stage === 'blockers') parts.push('blocked');
    const due = taskDue(t);
    if (due && due < today()) parts.push('overdue');
    parts.push(`${t.progress_percent || 0}% done`);
    return parts.join(', ');
}
