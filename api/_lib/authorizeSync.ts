import type { VercelRequest } from '@vercel/node';

/**
 * Authorizes a sync request from either caller:
 *
 *   - Vercel Cron  GET  with `Authorization: Bearer $CRON_SECRET`
 *   - Manual/ops   POST with `x-sync-secret: $SYNC_SECRET`
 *
 * These endpoints write to the database, so an unauthenticated caller must
 * never reach one. If neither secret is configured the request is refused
 * rather than allowed through — a missing env var should fail closed.
 */
export type SyncAuth =
    | { ok: true }
    | { ok: false; status: number; error: string };

export function authorizeSync(req: VercelRequest): SyncAuth {
    const cronSecret = process.env.CRON_SECRET;
    const syncSecret = process.env.SYNC_SECRET;

    if (!cronSecret && !syncSecret) {
        return {
            ok: false,
            status: 500,
            error: 'Neither CRON_SECRET nor SYNC_SECRET is configured',
        };
    }

    if (cronSecret && req.headers.authorization === `Bearer ${cronSecret}`) {
        return { ok: true };
    }

    if (syncSecret && req.headers['x-sync-secret'] === syncSecret) {
        return { ok: true };
    }

    return { ok: false, status: 401, error: 'Unauthorized' };
}

/** Cron issues GET; manual runs use POST. Anything else is rejected. */
export function isAllowedMethod(req: VercelRequest): boolean {
    return req.method === 'POST' || req.method === 'GET';
}

/** `?dry=1` reports without writing. */
export function isDryRun(req: VercelRequest): boolean {
    return req.query.dry === '1';
}
