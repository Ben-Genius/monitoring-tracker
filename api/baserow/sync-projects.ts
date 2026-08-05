import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAllRows } from '../_lib/baserow';
import { supabaseAdmin } from '../_lib/supabaseAdmin';
import { mapProject, COMPARED_FIELDS, type MappedProject } from '../_lib/mapProject';
import {
    authorizeSync,
    isAllowedMethod,
    isDryRun,
} from '../_lib/authorizeSync';

/**
 * Mirrors the Baserow "Projects" table into Supabase.
 *
 * Baserow is the source of truth: on conflict Baserow wins, and any field it
 * overwrote is recorded in audit_log so the change is reviewable rather than
 * silent.
 *
 *   POST /api/baserow/sync-projects            apply changes
 *   POST /api/baserow/sync-projects?dry=1      report what would change
 *
 * Requires the x-sync-secret header to match SYNC_SECRET. Without it this
 * endpoint would let anyone on the internet trigger writes to your database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAllowedMethod(req)) {
        return res.status(405).json({ error: 'Use GET (cron) or POST' });
    }

    const auth = authorizeSync(req);
    if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
    }

    const dryRun = isDryRun(req);

    try {
        const db = supabaseAdmin();
        const rows = await listAllRows('projects');
        const baseMapped = rows.map(mapProject);

        // Resolve the Baserow engineer to a tracker user. Engineers that have
        // not been mirrored yet resolve to null rather than failing the sync —
        // re-running after sync-engineers fills them in.
        const { data: engineers, error: engErr } = await db
            .from('users')
            .select('id, baserow_id')
            .not('baserow_id', 'is', null);
        if (engErr) throw new Error(`Supabase engineer read failed: ${engErr.message}`);

        const userIdByEngineerId = new Map<number, string>(
            (engineers ?? []).map((u) => [
                (u as { baserow_id: number }).baserow_id,
                (u as { id: string }).id,
            ]),
        );

        const mapped = baseMapped.map((p) => ({
            ...p,
            engineer_id:
                p.baserow_engineer_id !== null
                    ? (userIdByEngineerId.get(p.baserow_engineer_id) ?? null)
                    : null,
        }));

        // Existing mirrored rows, keyed by Baserow id.
        // Listed literally rather than joined from COMPARED_FIELDS so that
        // supabase-js can infer a row type instead of GenericStringError.
        const { data: existing, error: readErr } = await db
            .from('projects')
            .select(
                'id, baserow_id, name, description, client, tender_stage, ' +
                    'status, contract_value, budget, progress_percent, ' +
                    'baserow_engineer_id',
            )
            .not('baserow_id', 'is', null);
        if (readErr) throw new Error(`Supabase read failed: ${readErr.message}`);

        type ExistingRow = MappedProject & { id: string };
        const byBaserowId = new Map(
            ((existing ?? []) as unknown as ExistingRow[]).map((r) => [r.baserow_id, r]),
        );

        const created: number[] = [];
        const updated: { baserow_id: number; changes: string[] }[] = [];
        const auditEntries: Record<string, unknown>[] = [];

        for (const row of mapped) {
            const prev = byBaserowId.get(row.baserow_id);

            if (!prev) {
                created.push(row.baserow_id);
                continue;
            }

            const changes = COMPARED_FIELDS.filter((f) => {
                const a = prev[f] ?? null;
                const b = row[f] ?? null;
                // Numerics come back from Postgres as strings in some drivers.
                if (typeof a === 'number' || typeof b === 'number') {
                    return Number(a) !== Number(b);
                }
                return a !== b;
            });

            if (changes.length === 0) continue;

            updated.push({ baserow_id: row.baserow_id, changes: changes as string[] });

            for (const field of changes) {
                auditEntries.push({
                    entity_type: 'project',
                    entity_id: prev.id,
                    action: 'updated',
                    field: field as string,
                    old_value: prev[field] === null ? null : String(prev[field]),
                    new_value: row[field] === null ? null : String(row[field]),
                    summary: `Baserow sync overwrote ${String(field)} on "${row.name}"`,
                    user_id: null,
                });
            }
        }

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                baserowRows: mapped.length,
                wouldCreate: created.length,
                wouldUpdate: updated.length,
                unchanged: mapped.length - created.length - updated.length,
                details: updated.slice(0, 20),
            });
        }

        const { error: upsertErr } = await db
            .from('projects')
            .upsert(mapped, { onConflict: 'baserow_id' });
        if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`);

        // Audit entries are best-effort: a logging failure must not make the
        // sync look like it failed when the data landed correctly.
        if (auditEntries.length > 0) {
            const { error: auditErr } = await db.from('audit_log').insert(auditEntries);
            if (auditErr) {
                return res.status(200).json({
                    ok: true,
                    created: created.length,
                    updated: updated.length,
                    unchanged: mapped.length - created.length - updated.length,
                    auditWarning: auditErr.message,
                });
            }
        }

        return res.status(200).json({
            ok: true,
            baserowRows: mapped.length,
            created: created.length,
            updated: updated.length,
            unchanged: mapped.length - created.length - updated.length,
        });
    } catch (err) {
        return res.status(502).json({ ok: false, error: (err as Error).message });
    }
}
