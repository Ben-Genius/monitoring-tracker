import { linkedId, type BaserowRow } from './baserow.js';
import { MACWEST_COMPANY_ID } from './mapProject.js';

/**
 * Maps a Baserow "Tasks" row (table 1044512) onto the Supabase tasks table.
 */

/**
 * Baserow's Status has three values; the tracker board has five. `blockers`
 * and `talking_stage` exist only in the tracker — Baserow cannot represent
 * them, so a naive Baserow-wins sync would drag any blocked card back to
 * `in_progress` on the next run. These stages are therefore preserved: if a
 * mirrored task already sits in one of them, the sync leaves the stage alone.
 */
export const TRACKER_ONLY_STAGES = ['blockers', 'talking_stage'];

const STAGE: Record<string, string> = {
    'To Do': 'yet_to_start',
    'In Progress': 'in_progress',
    Done: 'completed',
};

/** 105 of 180 Baserow tasks have no Status set. */
const DEFAULT_STAGE = 'yet_to_start';

export interface MappedTask {
    baserow_id: number;
    title: string;
    stage: string;
    due_date: string | null;
    start_date: string | null;
    estimated_budget: number | null;
    actual_expenses: number | null;
    project_id: string | null;
    /**
     * RLS fallback for project-less tasks. Tasks with a project are scoped
     * through it, but a null project_id leaves no path to a company — without
     * this the row is invisible to every user (see 20260805120000).
     */
    company_id: string;
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

function selectValue(value: unknown): string | null {
    if (value && typeof value === 'object' && 'value' in value) {
        return text((value as { value: unknown }).value);
    }
    return null;
}

/**
 * @param projectIdByBaserowId maps a Baserow project row id to the Supabase
 *        project uuid. Tasks whose project is missing sync as project-less,
 *        which the tracker already supports.
 */
export function mapTask(
    row: BaserowRow,
    projectIdByBaserowId: Map<number, string>,
): MappedTask {
    const statusRaw = selectValue(row['Status']);
    const stage = (statusRaw && STAGE[statusRaw]) ?? DEFAULT_STAGE;
    const baserowProjectId = linkedId(row['Project']);

    return {
        baserow_id: row.id,
        title: text(row['Task Name']) ?? `Untitled task ${row.id}`,
        stage,
        due_date: text(row['End date']),
        start_date: text(row['Start Date']),
        estimated_budget: num(row['Estimated Budget']),
        actual_expenses: num(row['Actual Expenses']),
        project_id:
            baserowProjectId !== null
                ? (projectIdByBaserowId.get(baserowProjectId) ?? null)
                : null,
        company_id: MACWEST_COMPANY_ID,
    };
}

export const COMPARED_FIELDS: (keyof MappedTask)[] = [
    'title', 'stage', 'due_date', 'start_date',
    'estimated_budget', 'actual_expenses', 'project_id',
];
