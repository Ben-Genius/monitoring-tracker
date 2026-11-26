import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Task } from './useTasks';

/**
 * Task dependencies ("waits on"). Kept apart from the main task query so the
 * app still works while the database migration is pending: on error these
 * return nothing and the UI hides the feature.
 * (supabase/migrations/20261126140000_recurring_tasks_and_dependencies.sql)
 */

export interface LinkedTask { id: string; title: string; stage: Task['stage']; due_date?: string | null; project?: { name: string } | null }

export function useTaskLinks(taskId: string | null | undefined) {
    return useQuery({
        queryKey: ['task-links', taskId],
        enabled: !!taskId,
        queryFn: async () => {
            const [waits, holds] = await Promise.all([
                supabase.from('task_dependencies')
                    .select('depends_on, task:tasks!task_dependencies_depends_on_fkey(id, title, stage, due_date, project:projects(name))')
                    .eq('task_id', taskId!),
                supabase.from('task_dependencies')
                    .select('task_id, task:tasks!task_dependencies_task_id_fkey(id, title, stage, project:projects(name))')
                    .eq('depends_on', taskId!),
            ]);
            if (waits.error || holds.error) throw waits.error ?? holds.error;
            const pick = (rows: { task: unknown }[]) => rows.map(r => r.task as LinkedTask).filter(Boolean);
            return { waitsOn: pick(waits.data ?? []), holdsUp: pick(holds.data ?? []) };
        },
    });
}

/** For badges: how many unfinished tasks each task is still waiting on. */
export function useWaitingCounts() {
    const { data } = useQuery({
        queryKey: ['task-links', 'all'],
        staleTime: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('task_dependencies')
                .select('task_id, blocker:tasks!task_dependencies_depends_on_fkey(stage)');
            if (error) return [];
            return (data ?? []) as unknown as { task_id: string; blocker: { stage: string } | null }[];
        },
    });
    return useMemo(() => {
        const counts = new Map<string, number>();
        for (const r of data ?? []) {
            if (r.blocker && r.blocker.stage !== 'completed') counts.set(r.task_id, (counts.get(r.task_id) ?? 0) + 1);
        }
        return counts;
    }, [data]);
}

/** Every "waits on" pair the person can see, for drawing them on the timeline. */
export function useDependencyPairs() {
    const { data } = useQuery({
        queryKey: ['task-links', 'pairs'],
        staleTime: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase.from('task_dependencies').select('task_id, depends_on');
            if (error) return [];
            return (data ?? []) as { task_id: string; depends_on: string }[];
        },
    });
    return data ?? [];
}

export function useLinkTasks() {
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({ queryKey: ['task-links'] });
    const add = useMutation({
        mutationFn: async ({ taskId, dependsOn }: { taskId: string; dependsOn: string }) => {
            const { error } = await supabase.from('task_dependencies').insert({ task_id: taskId, depends_on: dependsOn });
            if (error) throw new Error(/loop/i.test(error.message) ? error.message
                : /duplicate/i.test(error.message) ? 'It already waits on that task.'
                : /row-level|permission/i.test(error.message) ? 'You can’t change what this task waits on.'
                : 'Couldn’t add that. Try again.');
        },
        onSettled: refresh,
    });
    const remove = useMutation({
        mutationFn: async ({ taskId, dependsOn }: { taskId: string; dependsOn: string }) => {
            const { data, error } = await supabase.from('task_dependencies').delete()
                .eq('task_id', taskId).eq('depends_on', dependsOn).select('task_id');
            if (error) throw error;
            if (!data?.length) throw new Error('You can’t change what this task waits on.');
        },
        onSettled: refresh,
    });
    return { add, remove };
}

/** Tasks to offer when linking: open, not this one, matching the search. */
export function useLinkCandidates(taskId: string, search: string) {
    const q = search.trim();
    return useQuery({
        queryKey: ['task-link-candidates', taskId, q],
        enabled: q.length >= 2,
        queryFn: async () => {
            const { data, error } = await supabase.from('tasks')
                .select('id, title, stage, project:projects(name)')
                .ilike('title', `%${q.replace(/[%_]/g, '')}%`)
                .neq('id', taskId)
                .neq('stage', 'completed')
                .is('archived_at', null)
                .order('title')
                .limit(8);
            if (error) throw error;
            return (data ?? []) as unknown as LinkedTask[];
        },
    });
}
