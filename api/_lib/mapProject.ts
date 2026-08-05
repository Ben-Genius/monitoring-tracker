import { linkedId, type BaserowRow } from './baserow.js';

/**
 * Maps a Baserow "Projects" row (table 1044048) onto the Supabase projects
 * table. Baserow is the source of truth, so every field here is one-way.
 */

/** Every Baserow project belongs to this company unless corrected in the tracker. */
export const MACWEST_COMPANY_ID = '6e015878-fe4a-421f-81e6-4293df3dfd12';

/**
 * Baserow's Status is a formula:
 *   if(Tender Stage != 'Contract Awarded', 'Bidding',
 *      if(Progress percent = 100, 'Completed',
 *         if(Progress percent = 0, 'Scheduled', 'Active')))
 * It is computed, so it can never be written back from the tracker.
 */
const STATUS: Record<string, string> = {
    Bidding: 'bidding',
    Scheduled: 'scheduled',
    Active: 'active',
    Completed: 'completed',
};

export interface MappedProject {
    baserow_id: number;
    name: string;
    description: string | null;
    client: string | null;
    tender_stage: string | null;
    status: string;
    contract_value: number | null;
    budget: number | null;
    progress_percent: number | null;
    company_id: string;
    /**
     * Baserow Engineers row id from the "Project Engineer" link. Resolved to a
     * users row by the sync; kept raw so the link survives even if that
     * engineer has not been mirrored into users yet.
     */
    baserow_engineer_id: number | null;
}

/** Baserow returns numbers as strings; empty strings must become null, not 0. */
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

/** single_select fields arrive as { id, value, color } or null. */
function selectValue(value: unknown): string | null {
    if (value && typeof value === 'object' && 'value' in value) {
        return text((value as { value: unknown }).value);
    }
    return null;
}

export function mapProject(row: BaserowRow): MappedProject {
    const statusRaw = text(row['Status']);

    return {
        baserow_id: row.id,
        // Baserow's field is misspelled "Project Desciption" — matched exactly
        // on purpose. Renaming it in Baserow will break this mapping.
        name: text(row['Project Name']) ?? `Untitled project ${row.id}`,
        description: text(row['Project Desciption']),
        client: text(row['Client']),
        tender_stage: selectValue(row['Tender Stage']),
        status: (statusRaw && STATUS[statusRaw]) ?? 'scheduled',
        contract_value: num(row['Contract Value']),
        budget: num(row['Budget']),
        progress_percent: num(row['Progress percent']),
        company_id: MACWEST_COMPANY_ID,
        baserow_engineer_id: linkedId(row['Project Engineer']),
    };
}

/** Fields compared to decide whether a mirrored row actually changed. */
export const COMPARED_FIELDS: (keyof MappedProject)[] = [
    'name', 'description', 'client', 'tender_stage', 'status',
    'contract_value', 'budget', 'progress_percent', 'baserow_engineer_id',
];
