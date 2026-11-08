import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listRows, BaserowError, TABLES, type TableName } from '../_lib/baserow.js';

/**
 * Connectivity check for the Baserow integration.
 *
 * Confirms BASEROW_TOKEN is configured and scoped to every table the sync
 * needs, by requesting a single row from each. Returns row counts only —
 * never row contents, and never the token.
 *
 *   GET /api/baserow/health
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
    if (!process.env.BASEROW_TOKEN) {
        return res.status(500).json({
            ok: false,
            error: 'BASEROW_TOKEN is not configured',
        });
    }

    const tables: Record<string, { ok: boolean; rows?: number; error?: string }> = {};
    let ok = true;

    for (const name of Object.keys(TABLES) as TableName[]) {
        try {
            const { count } = await listRows(name, { size: 1 });
            tables[name] = { ok: true, rows: count };
        } catch (err) {
            ok = false;
            const status = err instanceof BaserowError ? err.status : undefined;
            tables[name] = {
                ok: false,
                error:
                    status === 401
                        ? 'unauthorized — check the token'
                        : status === 404
                          ? 'not found — token is not scoped to this table'
                          : (err as Error).message,
            };
        }
    }

    return res.status(ok ? 200 : 502).json({ ok, tables });
}
