import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAllRows } from '../_lib/baserow';
import { supabaseAdmin } from '../_lib/supabaseAdmin';
import { mapPhase, COMPARED_FIELDS, type MappedPhase } from '../_lib/mapPhase';
import {
    authorizeSync,
    isAllowedMethod,
    isDryRun,
} from '../_lib/authorizeSync';

/**
 * Mirrors the Baserow "Phases" table into Supabase milestones.
 *
 *   POST /api/baserow/sync-phases            apply
 *   POST /api/baserow/sync-phases?dry=1      report only
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

        const { data: projects, error: projErr } = await db
            .from('projects')
            .select('id, baserow_id')
            .not('baserow_id', 'is', null);
        if (projErr) throw new Error(`Supabase project read failed: ${projErr.message}`);

        const projectIdByBaserowId = new Map<number, string>(
            (projects ?? []).map((p) => [
                (p as { baserow_id: number }).baserow_id,
                (p as { id: string }).id,
            ]),
        );

        if (projectIdByBaserowId.size === 0) {
            return res.status(409).json({
                ok: false,
                error: 'No mirrored projects found. Run sync-projects first.',
            });
        }

        const rows = await listAllRows('phases');
        const allMapped = rows.map((r) => mapPhase(r, projectIdByBaserowId));

        // milestones.project_id is NOT NULL, so a phase whose project is not
        // mirrored is skipped and reported rather than failing the whole run.
        const mapped = allMapped.filter((p) => p.project_id !== null);
        const skipped = allMapped.length - mapped.length;

        const { data: existing, error: readErr } = await db
            .from('milestones')
            .select(
                'id, baserow_id, name, project_id, status, due_date, ' +
                    'start_date, estimated_budget, actual_budget, progress_percent',
            )
            .not('baserow_id', 'is', null);
        if (readErr) throw new Error(`Supabase milestone read failed: ${readErr.message}`);

        type ExistingRow = MappedPhase & { id: string };
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
                if (typeof a === 'number' || typeof b === 'number') {
                    return Number(a) !== Number(b);
                }
                return a !== b;
            });

            if (changes.length === 0) continue;
            updated.push({ baserow_id: row.baserow_id, changes: changes as string[] });

            for (const field of changes) {
                auditEntries.push({
                    entity_type: 'milestone',
                    entity_id: prev.id,
                    action: field === 'status' ? 'status_changed' : 'updated',
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
                baserowRows: allMapped.length,
                wouldCreate: created.length,
                wouldUpdate: updated.length,
                unchanged: mapped.length - created.length - updated.length,
                skippedNoProject: skipped,
                details: updated.slice(0, 20),
            });
        }

        const { error: upsertErr } = await db
            .from('milestones')
            .upsert(mapped, { onConflict: 'baserow_id' });
        if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`);

        if (auditEntries.length > 0) {
            const { error: auditErr } = await db.from('audit_log').insert(auditEntries);
            if (auditErr) {
                return res.status(200).json({
                    ok: true,
                    created: created.length,
                    updated: updated.length,
                    skippedNoProject: skipped,
                    auditWarning: auditErr.message,
                });
            }
        }

        return res.status(200).json({
            ok: true,
            baserowRows: allMapped.length,
            created: created.length,
            updated: updated.length,
            unchanged: mapped.length - created.length - updated.length,
            skippedNoProject: skipped,
        });
    } catch (err) {
        return res.status(502).json({ ok: false, error: (err as Error).message });
    }
}
