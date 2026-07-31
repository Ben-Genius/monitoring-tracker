import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseLog } from '@/features/audit/utils/log';

export interface Milestone {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    due_date: string | null;
    completed_date: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMilestoneInput {
    project_id: string;
    name: string;
    description?: string;
    due_date?: string;
}

export function useMilestones(projectId: string) {
    return useQuery({
        queryKey: ['milestones', projectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('milestones')
                .select('*')
                .eq('project_id', projectId)
                .order('due_date', { ascending: true, nullsFirst: false });

            if (error) throw error;

            const now = new Date().toISOString().split('T')[0];
            return (data || []).map(m => ({
                ...m,
                status: m.status === 'pending' && m.due_date && m.due_date < now
                    ? 'overdue' as const
                    : m.status,
            })) as Milestone[];
        },
        enabled: !!projectId,
    });
}

export function useCreateMilestone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateMilestoneInput) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('milestones')
                .insert({
                    ...input,
                    created_by: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            supabaseLog({
                entity_type: 'milestone',
                entity_id: data.id,
                action: 'created',
                summary: `Milestone "${data.name}" created`,
            });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['milestones', variables.project_id] });
        },
    });
}

export function useUpdateMilestone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: {
            id: string;
            name?: string;
            description?: string;
            due_date?: string;
            status?: Milestone['status'];
            completed_date?: string | null;
        }) => {
            const { data: existing } = await supabase
                .from('milestones')
                .select('name, status')
                .eq('id', id)
                .single();

            const { data, error } = await supabase
                .from('milestones')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (updates.status && existing && existing.status !== updates.status) {
                supabaseLog({
                    entity_type: 'milestone',
                    entity_id: id,
                    action: 'status_changed',
                    field: 'status',
                    old_value: existing.status,
                    new_value: updates.status,
                    summary: `Milestone "${existing.name || data.name}" ${updates.status === 'completed' ? 'completed' : 'moved to ' + updates.status}`,
                });
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['milestones'] });
        },
    });
}

export function useDeleteMilestone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, project_id, name }: { id: string; project_id: string; name?: string }) => {
            if (name) {
                supabaseLog({
                    entity_type: 'milestone',
                    entity_id: id,
                    action: 'deleted',
                    summary: `Milestone "${name}" deleted`,
                });
            }
            const { error } = await supabase
                .from('milestones')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { project_id };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['milestones', result.project_id] });
        },
    });
}
