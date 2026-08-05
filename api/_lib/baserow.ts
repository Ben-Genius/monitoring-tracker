/**
 * Server-side Baserow client.
 *
 * SECURITY: BASEROW_TOKEN grants read/write over every table the token is
 * scoped to. It must never reach the browser — that means no VITE_ prefix
 * (Vite inlines those into the client bundle) and no importing this module
 * from anything under src/. It is only safe inside api/ handlers, which run
 * on Vercel's servers.
 *
 * Directories under api/ prefixed with `_` are not exposed as routes.
 */

const BASEROW_API = 'https://api.baserow.io';

/** Table IDs in the "Project Management" database (475362). */
export const TABLES = {
    engineers: 1044018,
    projects: 1044048,
    tasks: 1044512,
    phases: 1044515,
    subTasks: 1045541,
} as const;

export type TableName = keyof typeof TABLES;

/** A Baserow row keyed by user-facing field names (user_field_names=true). */
export interface BaserowRow {
    id: number;
    order: string;
    [field: string]: unknown;
}

interface ListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: BaserowRow[];
}

/**
 * link_row fields arrive as [{ id, value, order }]. Returns the first linked
 * row id, or null when the link is empty.
 */
export function linkedId(value: unknown): number | null {
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0] as { id?: number };
        return typeof first?.id === 'number' ? first.id : null;
    }
    return null;
}

export class BaserowError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'BaserowError';
    }
}

function token(): string {
    const value = process.env.BASEROW_TOKEN;
    if (!value) {
        throw new BaserowError('BASEROW_TOKEN is not configured', 500);
    }
    return value;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASEROW_API}${path}`, {
        ...init,
        headers: {
            Authorization: `Token ${token()}`,
            'Content-Type': 'application/json',
            ...init.headers,
        },
    });

    if (!res.ok) {
        // Baserow echoes the request in some error bodies; keep only the code so
        // the token can never surface in logs or an API response.
        let detail = `HTTP ${res.status}`;
        try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) detail = `${detail} (${body.error})`;
        } catch {
            // non-JSON error body — the status alone is enough
        }
        throw new BaserowError(`Baserow request failed: ${detail}`, res.status);
    }

    return (await res.json()) as T;
}

/**
 * Fetch a single page of rows. Field keys are the user-facing Baserow names
 * (e.g. "Project Name"), not internal field_<id> keys.
 */
export async function listRows(
    table: TableName,
    { page = 1, size = 200 }: { page?: number; size?: number } = {},
): Promise<ListResponse> {
    const params = new URLSearchParams({
        user_field_names: 'true',
        page: String(page),
        size: String(size),
    });
    return request<ListResponse>(
        `/api/database/rows/table/${TABLES[table]}/?${params}`,
    );
}

/** Fetch every row in a table, following pagination. */
export async function listAllRows(table: TableName): Promise<BaserowRow[]> {
    const rows: BaserowRow[] = [];
    let page = 1;

    // Bounded to avoid an unbounded loop if the API misreports `next`.
    for (let guard = 0; guard < 100; guard++) {
        const { results, next } = await listRows(table, { page, size: 200 });
        rows.push(...results);
        if (!next || results.length === 0) break;
        page++;
    }

    return rows;
}
