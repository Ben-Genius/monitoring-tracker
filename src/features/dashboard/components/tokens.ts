import type { Task } from '@/features/tasks/hooks/useTasks';

/** Shared text colours so light and dark stay in step across the dashboard. */
export const tx = {
    ink: 'text-ink dark:text-slate-100',
    muted: 'text-ink-muted dark:text-slate-400',
    faint: 'text-ink-faint dark:text-slate-400',
};

export const PRIORITY_WEIGHT: Record<Task['priority'], number> = { critical: 3, high: 2, medium: 1, low: 0 };
