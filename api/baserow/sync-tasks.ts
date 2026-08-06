import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAllRows } from '../_lib/baserow.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { reconcileArchived } from '../_lib/reconcileArchived.js';
import {
    mapTask,
    COMPARED_FIELDS,
    TRACKER_ONLY_STAGES,
    type MappedTask,
} from '../_lib/mapTask.js';
import {
    authorizeSync,
    isAllowedMethod,
    isDryRun,
} from '../_lib/authorizeSync.js';

/**
 * Mirrors the Baserow "Tasks" table into Supabase.
 *
 * Baserow wins on conflict, with one deliberate exception: a task already
 * sitting in a tracker-only stage (blockers / talking_stage) keeps that stage,
 * because Baserow has no way to express it and would otherwise reset the card
 * on every run.
 *
 *   POST /api/baserow/sync-tasks           apply
 *   POST /api/baserow/sync-tasks?dry=1     report only
 *
 * Requires the x-sync-secret header.
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

        // Tasks reference projects by Baserow id, so the mirrored projects must
        // already exist. Build the Baserow id -> Supabase uuid lookup first.
        const { data: projects, error: projErr } = await db
            .from('projects')
            .select('id, baserow_id, engineer_id')
            .not('baserow_id', 'is', null);
        if (projErr) throw new Error(`Supabase project read failed: ${projErr.message}`);

        type ProjectRow = { id: string; baserow_id: number; engineer_id: string | null };
        const projectRows = (projects ?? []) as unknown as ProjectRow[];

        const projectIdByBaserowId = new Map<number, string>(
            projectRows.map((p) => [p.baserow_id, p.id]),
        );
        // Default assignee for newly mirrored tasks: the project's engineer.
        const engineerByProjectId = new Map<string, string | null>(
            projectRows.map((p) => [p.id, p.engineer_id]),
        );

        if (projectIdByBaserowId.size === 0) {
            return res.status(409).json({
                ok: false,
                error: 'No mirrored projects found. Run sync-projects first.',
            });
        }

        const rows = await listAllRows('tasks');
        const mapped = rows.map((r) => mapTask(r, projectIdByBaserowId));

        const { data: existing, error: readErr } = await db
            .from('tasks')
            .select(
                'id, baserow_id, title, stage, due_date, start_date, ' +
                    'estimated_budget, actual_expenses, project_id, ' +
                    'completed_at, assignee_id',
            )
            .not('baserow_id', 'is', null);
        if (readErr) throw new Error(`Supabase task read failed: ${readErr.message}`);

        type ExistingRow = MappedTask & {
            id: string;
            completed_at: string | null;
            assignee_id: string | null;
        };
        const byBaserowId = new Map(
            ((existing ?? []) as unknown as ExistingRow[]).map((r) => [r.baserow_id, r]),
        );

        const created: number[] = [];
        const updated: { baserow_id: number; changes: string[] }[] = [];
        const stagePreserved: number[] = [];
        const auditEntries: Record<string, unknown>[] = [];

        // Rows are augmented in place with the fields the mapper cannot decide.
        const toWrite = mapped.map((row) => {
            const prev = byBaserowId.get(row.baserow_id);

            // Tracker-only stages survive the sync.
            let stage = row.stage;
            if (prev && TRACKER_ONLY_STAGES.includes(prev.stage)) {
                stage = prev.stage;
                stagePreserved.push(row.baserow_id);
            }

            // Keep the original completion time; only stamp a new one on the
            // transition into completed. Clear it if the task reopened.
            let completed_at: string | null = null;
            if (stage === 'completed') {
                completed_at = prev?.completed_at ?? new Date().toISOString();
            }

            // Assignee is seeded from the project's engineer for NEW tasks
            // only. Baserow has no per-task assignee, so overwriting on every
            // run would undo whatever the team set in the tracker.
            const assignee_id = prev
                ? prev.assignee_id
                : row.project_id
                  ? (engineerByProjectId.get(row.project_id) ?? null)
                  : null;

            return { ...row, stage, completed_at, assignee_id };
        });

        for (const row of toWrite) {
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
                    entity_type: 'task',
                    entity_id: prev.id,
                    action: field === 'stage' ? 'stage_changed' : 'updated',
                    field: field as string,
                    old_value: prev[field] === null ? null : String(prev[field]),
                    new_value: row[field] === null ? null : String(row[field]),
                    summary: `Baserow sync overwrote ${String(field)} on "${row.title}"`,
                    user_id: null,
                });
            }
        }

        const withoutProject = toWrite.filter((r) => r.project_id === null).length;

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                baserowRows: toWrite.length,
                wouldCreate: created.length,
                wouldUpdate: updated.length,
                unchanged: toWrite.length - created.length - updated.length,
                stagePreserved: stagePreserved.length,
                withoutProject,
                details: updated.slice(0, 20),
            });
        }

        const { error: upsertErr } = await db
            .from('tasks')
            .upsert(toWrite, { onConflict: 'baserow_id' });
        if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`);

        // Rows deleted in Baserow are archived rather than removed.
        const reconciled = await reconcileArchived(
            db,
            'tasks',
            toWrite.map((r) => r.baserow_id),
        );

        if (auditEntries.length > 0) {
            const { error: auditErr } = await db.from('audit_log').insert(auditEntries);
            if (auditErr) {
                return res.status(200).json({
                    ok: true,
                    created: created.length,
                    updated: updated.length,
                    stagePreserved: stagePreserved.length,
                    withoutProject,
                    auditWarning: auditErr.message,
                });
            }
        }

        return res.status(200).json({
            ok: true,
            archived: reconciled.archived,
            restored: reconciled.restored,
            baserowRows: toWrite.length,
            created: created.length,
            updated: updated.length,
            unchanged: toWrite.length - created.length - updated.length,
            stagePreserved: stagePreserved.length,
            withoutProject,
        });
    } catch (err) {
        return res.status(502).json({ ok: false, error: (err as Error).message });
    }
}
