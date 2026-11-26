import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface MilestoneMark { id: string; project_id: string; name: string; due_date: string | null; status: string; completed_date: string | null }

/** Milestones for many projects in one request, for the project timeline. */
export function useProjectMilestones(projectIds: string[]) {
    const ids = [...projectIds].sort();
    return useQuery({
        queryKey: ['milestones', 'for-projects', ids],
        enabled: ids.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('milestones')
                .select('id, project_id, name, due_date, status, completed_date')
                .in('project_id', ids)
                .is('archived_at', null)
                .not('due_date', 'is', null);
            if (error) throw error;
            return (data ?? []) as MilestoneMark[];
        },
    });
}
