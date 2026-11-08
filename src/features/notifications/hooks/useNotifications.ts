import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface AppNotification {
    id: string;
    task_id: string | null;
    type: 'assigned' | 'stage_changed' | 'blocked' | 'blocking_you' | 'progress' | 'accepted';
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
}

/** The signed-in user's latest notifications. Written by a database trigger when tasks change. */
export function useNotifications() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['notifications', user?.id],
        enabled: !!user,
        refetchInterval: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('id, task_id, type, title, body, read_at, created_at')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(40);
            if (error) throw error;
            return (data ?? []) as AppNotification[];
        },
    });
}

export function useMarkNotificationsRead() {
    const qc = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: async (ids: string[] | 'all') => {
            let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
            q = ids === 'all' ? q.eq('user_id', user!.id) : q.in('id', ids);
            const { error } = await q;
            if (error) throw error;
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
