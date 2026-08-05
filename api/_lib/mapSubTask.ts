import { linkedId, type BaserowRow } from './baserow';

/**
 * Maps a Baserow "Sub Tasks" row (table 1045541) onto the Supabase subtasks
 * table.
 */

export interface MappedSubTask {
    baserow_id: number;
    title: string;
    task_id: string | null;
    is_completed: boolean;
    start_date: string | null;
    end_date: string | null;
    completed_date: string | null;
}

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

export function mapSubTask(
    row: BaserowRow,
    taskIdByBaserowId: Map<number, string>,
): MappedSubTask {
    const baserowTaskId = linkedId(row['Task']);

    return {
        baserow_id: row.id,
        title: text(row['Sub Task Name']) ?? `Sub task ${row.id}`,
        task_id:
            baserowTaskId !== null ? (taskIdByBaserowId.get(baserowTaskId) ?? null) : null,
        is_completed: row['Completed'] === true,
        start_date: text(row['Start Date']),
        end_date: text(row['End Date']),
        completed_date: text(row['Completion Date']),
    };
}

export const COMPARED_FIELDS: (keyof MappedSubTask)[] = [
    'title', 'task_id', 'is_completed', 'start_date', 'end_date', 'completed_date',
];
