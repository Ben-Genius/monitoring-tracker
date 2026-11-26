import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listAllRows } from '../_lib/baserow.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { reconcileArchived } from '../_lib/reconcileArchived.js';
import { mapSubTask, COMPARED_FIELDS, type MappedSubTask } from '../_lib/mapSubTask.js';
import {
    authorizeSync,
    isAllowedMethod,
    isDryRun,
} from '../_lib/authorizeSync.js';

/**
 * Mirrors the Baserow "Sub Tasks" table into Supabase subtasks.
 *
 * No audit_log entries are written here: audit_log.entity_type is constrained
 * to project|task|milestone|approval|import, and inventing a value would break
 * the check constraint. Sub task churn is visible through its parent task.
 *
 *   POST /api/baserow/sync-subtasks            apply
 *   POST /api/baserow/sync-subtasks?dry=1      report only
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

        const { data: tasks, error: taskErr } = await db
            .from('tasks')
            .select('id, baserow_id')
            .not('baserow_id', 'is', null);
        if (taskErr) throw new Error(`Supabase task read failed: ${taskErr.message}`);

        const taskIdByBaserowId = new Map<number, string>(
            (tasks ?? []).map((t) => [
                (t as { baserow_id: number }).baserow_id,
                (t as { id: string }).id,
            ]),
        );

        if (taskIdByBaserowId.size === 0) {
            return res.status(409).json({
                ok: false,
                error: 'No mirrored tasks found. Run sync-tasks first.',
            });
        }

        const rows = await listAllRows('subTasks');
        const allMapped = rows.map((r) => mapSubTask(r, taskIdByBaserowId));

        // subtasks.task_id is NOT NULL; skip orphans rather than fail the run.
        const mapped = allMapped.filter((s) => s.task_id !== null);
        const skipped = allMapped.length - mapped.length;

        const { data: existing, error: readErr } = await db
            .from('subtasks')
            .select(
                'id, baserow_id, title, task_id, is_completed, ' +
                    'start_date, end_date, completed_date',
            )
            .not('baserow_id', 'is', null);
        if (readErr) throw new Error(`Supabase subtask read failed: ${readErr.message}`);

        type ExistingRow = MappedSubTask & { id: string };
        const byBaserowId = new Map(
            ((existing ?? []) as unknown as ExistingRow[]).map((r) => [r.baserow_id, r]),
        );

        let created = 0;
        let updated = 0;

        for (const row of mapped) {
            const prev = byBaserowId.get(row.baserow_id);
            if (!prev) {
                created++;
                continue;
            }
            const changed = COMPARED_FIELDS.some((f) => (prev[f] ?? null) !== (row[f] ?? null));
            if (changed) updated++;
        }

        if (dryRun) {
            return res.status(200).json({
                dryRun: true,
                baserowRows: allMapped.length,
                wouldCreate: created,
                wouldUpdate: updated,
                unchanged: mapped.length - created - updated,
                skippedNoTask: skipped,
            });
        }

        const { error: upsertErr } = await db
            .from('subtasks')
            .upsert(mapped, { onConflict: 'baserow_id' });
        if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`);

        // Rows deleted in Baserow are archived rather than removed.
        //
        // Uses allMapped, not mapped: `mapped` drops sub tasks whose parent
        // task is not mirrored. Those still exist in Baserow, so the filtered
        // list would archive them for being unresolvable rather than deleted.
        const reconciled = await reconcileArchived(
            db,
            'subtasks',
            allMapped.map((r) => r.baserow_id),
        );

        return res.status(200).json({
            ok: true,
            archived: reconciled.archived,
            restored: reconciled.restored,
            baserowRows: allMapped.length,
            created,
            updated,
            unchanged: mapped.length - created - updated,
            skippedNoTask: skipped,
        });
    } catch (err) {
        return res.status(502).json({ ok: false, error: (err as Error).message });
    }
}
