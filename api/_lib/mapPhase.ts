import { linkedId, type BaserowRow } from './baserow.js';

/**
 * Maps a Baserow "Phases" row (table 1044515) onto the Supabase milestones
 * table.
 *
 * Several Baserow fields here are rollups or formulas over the phase's tasks
 * (Start Date, End date, Progress Tasks), so they are computed in Baserow and
 * mirrored read-only: the tracker changes them by changing tasks.
 */

export interface MappedPhase {
    baserow_id: number;
    name: string;
    project_id: string | null;
    status: string;
    due_date: string | null;
    start_date: string | null;
    estimated_budget: number | null;
    actual_budget: number | null;
    progress_percent: number | null;
}

function num(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

/**
 * Baserow has no status field for a phase — it has a computed completion
 * percentage. milestones.status is constrained to
 * pending|in_progress|completed|overdue|cancelled, so progress is bucketed.
 * `overdue` and `cancelled` are left for the tracker to set; nothing in
 * Baserow expresses them.
 */
export function statusFromProgress(progress: number | null): string {
    if (progress === null || progress === 0) return 'pending';
    if (progress >= 100) return 'completed';
    return 'in_progress';
}

export function mapPhase(
    row: BaserowRow,
    projectIdByBaserowId: Map<number, string>,
): MappedPhase {
    const progress = num(row['Progress Tasks']);
    const baserowProjectId = linkedId(row['Project']);

    return {
        baserow_id: row.id,
        name: text(row['Phase Name']) ?? `Phase ${row.id}`,
        project_id:
            baserowProjectId !== null
                ? (projectIdByBaserowId.get(baserowProjectId) ?? null)
                : null,
        status: statusFromProgress(progress),
        // Rollup: max(Tasks.End date). Null for the 25 phases whose tasks have
        // no dates yet.
        due_date: text(row['End date']),
        start_date: text(row['Start Date']),
        estimated_budget: num(row['Estimated Budget']),
        actual_budget: num(row['Actual Budget']),
        progress_percent: progress,
    };
}

export const COMPARED_FIELDS: (keyof MappedPhase)[] = [
    'name', 'project_id', 'status', 'due_date', 'start_date',
    'estimated_budget', 'actual_budget', 'progress_percent',
];
