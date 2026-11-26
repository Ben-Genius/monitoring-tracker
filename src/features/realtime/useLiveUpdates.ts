import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Keeps every open screen current: when anyone in the organisation changes a
 * task, comment, project or approval, the affected data is refetched. Supabase
 * Realtime applies the subscriber's row-level security, so only changes this
 * person may see arrive (see 20261126120000_realtime_and_mentions.sql).
 *
 * Changes arrive in bursts (a status update writes a comment and a task), so
 * refreshes are batched for a moment rather than run once per row.
 */

// Which cached queries depend on which table. Dashboard and analytics read tasks and projects.
const AFFECTS: Record<string, string[]> = {
    tasks: ['tasks', 'task', 'task-links', 'brief', 'brief-items', 'dashboard-stats', 'recent-tasks', 'idle-tasks', 'task-distribution', 'top-performers', 'monthly-trend', 'performance-trend', 'projects', 'project'],
    task_comments: ['comments', 'task', 'brief'],
    subtasks: ['subtasks', 'task', 'tasks'],
    task_dependencies: ['task-links'],
    projects: ['projects', 'project', 'recent-projects', 'dashboard-stats', 'company-performance', 'has-sample-data'],
    milestones: ['milestones', 'project'],
    approvals: ['approvals', 'recent-approvals'],
    brief_items: ['brief-items', 'brief'],
    brief_days: ['brief-day', 'brief'],
    notifications: ['notifications'],
};

const BATCH_MS = 400;

export function useLiveUpdates() {
    const qc = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;

    useEffect(() => {
        if (!userId) return;
        const pending = new Set<string>();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const flush = () => {
            pending.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
            pending.clear();
        };
        const queue = (table: string) => {
            AFFECTS[table]?.forEach(k => pending.add(k));
            clearTimeout(timer);
            timer = setTimeout(flush, BATCH_MS);
        };

        let channel = supabase.channel(`live:${userId}`);
        for (const table of Object.keys(AFFECTS)) {
            if (table === 'notifications') continue;
            channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => queue(table));
        }
        // Only this person's notifications, and a heads-up when someone mentions them.
        channel = channel.on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => {
                queue('notifications');
                const n = payload.new as { type?: string; title?: string; body?: string };
                if (n.type === 'mention' || n.type === 'nudge' || n.type === 'blocking_you') {
                    toast(n.title ?? 'New notification', { icon: n.type === 'mention' ? '@' : '•', duration: 5000 });
                }
            });
        channel.subscribe();

        return () => {
            clearTimeout(timer);
            void supabase.removeChannel(channel);
        };
    }, [qc, userId]);
}
