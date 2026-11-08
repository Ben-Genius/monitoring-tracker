import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Local calendar date as YYYY-MM-DD (Accra is UTC+0, but don't rely on it). */
export function todayISO(d = new Date()) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface BriefItem {
    id: string;
    task_id: string;
    brief_date: string;
    note: string | null;
    created_at: string;
    updated_at: string;
    added_by_user: { name: string } | null;
    task: {
        id: string;
        title: string;
        stage: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
        progress_percent: number;
        is_urgent: boolean;
        due_date: string | null;
        blocker_description: string | null;
        company_id: string | null;
        project: { name: string; company_id: string } | null;
        owner: { name: string } | null;
        blocker: { name: string } | null;
    } | null;
}

const SELECT = `
    id, task_id, brief_date, note, created_at, updated_at,
    added_by_user:users!brief_items_added_by_fkey(name),
    task:tasks(
        id, title, stage, progress_percent, is_urgent, due_date, blocker_description, company_id,
        project:projects(name, company_id),
        owner:users!tasks_assignee_id_fkey(name),
        blocker:users!tasks_blocked_by_fkey(name)
    )`;

/**
 * The PA's selection for a day. With `latestIfEmpty`, falls back to the most
 * recent brief before today, so Mr Blay never opens an empty page just
 * because today's hasn't been prepared yet.
 */
export function useBriefItems({ date = todayISO(), latestIfEmpty = false } = {}) {
    return useQuery({
        queryKey: ['brief-items', date, latestIfEmpty],
        queryFn: async () => {
            const { data, error } = await supabase.from('brief_items').select(SELECT).eq('brief_date', date).order('created_at');
            if (error) throw error;
            if ((data?.length ?? 0) > 0 || !latestIfEmpty) return { date, items: (data ?? []) as unknown as BriefItem[] };

            const { data: last } = await supabase.from('brief_items').select('brief_date').lt('brief_date', date)
                .order('brief_date', { ascending: false }).limit(1);
            const prev = last?.[0]?.brief_date as string | undefined;
            if (!prev) return { date, items: [] as BriefItem[] };
            const { data: older, error: e2 } = await supabase.from('brief_items').select(SELECT).eq('brief_date', prev).order('created_at');
            if (e2) throw e2;
            return { date: prev, items: (older ?? []) as unknown as BriefItem[] };
        },
    });
}

export function useBriefMutations(date = todayISO()) {
    const qc = useQueryClient();
    const done = () => qc.invalidateQueries({ queryKey: ['brief-items'] });

    const add = useMutation({
        mutationFn: async ({ taskId, note }: { taskId: string; note?: string }) => {
            const { error } = await supabase.from('brief_items')
                .upsert({ task_id: taskId, brief_date: date, note: note ?? null, updated_at: new Date().toISOString() }, { onConflict: 'task_id,brief_date' });
            if (error) throw error;
        },
        onSettled: done,
    });
    const remove = useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase.from('brief_items').delete().eq('task_id', taskId).eq('brief_date', date);
            if (error) throw error;
        },
        onSettled: done,
    });
    const setNote = useMutation({
        mutationFn: async ({ taskId, note }: { taskId: string; note: string }) => {
            const { error } = await supabase.from('brief_items').update({ note: note || null, updated_at: new Date().toISOString() })
                .eq('task_id', taskId).eq('brief_date', date);
            if (error) throw error;
        },
        onSettled: done,
    });
    return { add, remove, setNote };
}

export interface BriefDay {
    /** False until the brief_days migration is applied; the page then behaves as before (no ready step). */
    available: boolean;
    readyAt: string | null;
    readyBy: string | null;
}

/** Whether the PA has marked this day's brief as ready for Mr Blay. */
export function useBriefDay(date = todayISO()) {
    return useQuery({
        queryKey: ['brief-day', date],
        queryFn: async (): Promise<BriefDay> => {
            const { data, error } = await supabase.from('brief_days')
                .select('ready_at, ready_by_user:users!brief_days_ready_by_fkey(name)')
                .eq('brief_date', date).maybeSingle();
            // A missing table (migration not applied yet) must not break the brief.
            if (error) return { available: false, readyAt: null, readyBy: null };
            const row = data as { ready_at: string | null; ready_by_user: { name: string } | null } | null;
            return { available: true, readyAt: row?.ready_at ?? null, readyBy: row?.ready_by_user?.name ?? null };
        },
    });
}

export function useBriefDayMutation(date = todayISO()) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ready: boolean) => {
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date().toISOString();
            const { error } = await supabase.from('brief_days')
                .upsert({ brief_date: date, ready_at: ready ? now : null, ready_by: ready ? user?.id ?? null : null, updated_at: now }, { onConflict: 'brief_date' });
            if (error) throw error;
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['brief-day', date] }),
    });
}
