import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reconciles mirrored rows against what Baserow still contains.
 *
 * Rows whose Baserow counterpart has been deleted are archived, not removed:
 * a mirrored project cascades to its tasks, milestones and subtasks, which
 * would destroy tracker-only state Baserow never held (blockers, comments,
 * manual assignees, audit history).
 *
 * Rows created in the tracker have a null baserow_id and are never touched.
 */
export interface ArchiveResult {
    archived: number;
    restored: number;
}

export async function reconcileArchived(
    db: SupabaseClient,
    table: 'projects' | 'tasks' | 'milestones' | 'subtasks',
    liveBaserowIds: number[],
): Promise<ArchiveResult> {
    // Guard: an empty list would archive the entire mirror. That is far more
    // likely to mean "the Baserow fetch failed" than "everything was deleted",
    // so refuse rather than wipe the tracker.
    if (liveBaserowIds.length === 0) {
        return { archived: 0, restored: 0 };
    }

    const idList = `(${liveBaserowIds.join(',')})`;

    // Gone from Baserow, not yet archived here.
    const { data: archived, error: archiveErr } = await db
        .from(table)
        .update({ archived_at: new Date().toISOString() })
        .not('baserow_id', 'is', null)
        .is('archived_at', null)
        .not('baserow_id', 'in', idList)
        .select('id');
    if (archiveErr) {
        throw new Error(`Archiving ${table} failed: ${archiveErr.message}`);
    }

    // Back in Baserow (undeleted, or an id reused) — un-archive.
    const { data: restored, error: restoreErr } = await db
        .from(table)
        .update({ archived_at: null })
        .not('archived_at', 'is', null)
        .in('baserow_id', liveBaserowIds)
        .select('id');
    if (restoreErr) {
        throw new Error(`Restoring ${table} failed: ${restoreErr.message}`);
    }

    return { archived: archived?.length ?? 0, restored: restored?.length ?? 0 };
}
