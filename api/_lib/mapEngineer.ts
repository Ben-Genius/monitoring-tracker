import type { BaserowRow } from './baserow';
import { MACWEST_COMPANY_ID } from './mapProject';

/**
 * Maps a Baserow "Engineers" row (table 1044018) onto the Supabase users table.
 */

export interface MappedEngineer {
    baserow_id: number;
    name: string;
    email: string;
    phone: string | null;
    /** True when the address is synthetic and the engineer cannot be invited. */
    placeholderEmail: boolean;
}

export const DEFAULT_ROLE = 'employee';
export const ENGINEER_COMPANY_ID = MACWEST_COMPANY_ID;

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

/**
 * Half the Baserow engineers have no email, but users.email is NOT NULL and
 * UNIQUE. `.invalid` is reserved by RFC 2606 and can never resolve, so a
 * placeholder cannot accidentally receive mail if someone tries to invite one.
 */
export function placeholderEmailFor(baserowId: number): string {
    return `baserow-engineer-${baserowId}@placeholder.invalid`;
}

export function isPlaceholderEmail(email: string): boolean {
    return email.endsWith('@placeholder.invalid');
}

export function mapEngineer(row: BaserowRow): MappedEngineer {
    const email = text(row['Email']);

    return {
        baserow_id: row.id,
        name: text(row['Engineer Name']) ?? `Engineer ${row.id}`,
        email: email ?? placeholderEmailFor(row.id),
        phone: text(row['Phone number']),
        placeholderEmail: email === null,
    };
}
