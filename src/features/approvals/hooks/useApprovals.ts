import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Approval {
    id: string;
    project_id: string;
    requester_id: string;
    lead_id?: string | null;
    approved_by?: string | null;
    type: string;
    title?: string;
    content: string;
    entity_type: string;
    entity_id: string;
    status: 'pending' | 'approved' | 'rejected';
    comments: string | null;
    created_at: string;
    updated_at?: string;
    requester?: {
        name: string;
        email: string;
    };
    approver?: {
        name: string;
        email: string;
    };
    lead?: {
        name: string;
        email: string;
    };
    project?: {
        name: string;
        company_id: string;
    };
}

export interface CreateApprovalInput {
    project_id: string;
    requester_id: string;
    lead_id?: string | null;
    type: string;
    title?: string;
    content: string;
    entity_type: string;
    entity_id: string;
    comments: string;
    status?: 'pending' | 'approved' | 'rejected';
}

export function useApprovals(companyId?: string) {
    return useQuery({
        queryKey: ['approvals', companyId],
        queryFn: async () => {
            let query = supabase
                .from('approvals')
                .select(`
                    *,
                    requester:users!approvals_requester_id_fkey(name, email),
                    project:projects!approvals_project_id_fkey(name, company_id)
                `)
                .order('created_at', { ascending: false });

            if (companyId && companyId !== 'all') {
                query = query.eq('project.company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Approval[];
        },
    });
}

export function usePendingApprovals() {
    return useQuery({
        queryKey: ['approvals', 'pending'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('approvals')
                .select(`
                    *,
                    requester:users!approvals_requester_id_fkey(name, email),
                    project:projects!approvals_project_id_fkey(name)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Approval[];
        },
    });
}

export function useCreateApproval() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateApprovalInput) => {
            const { data, error } = await supabase
                .from('approvals')
                .insert([input])
                .select(`
                    *,
                    requester:users!approvals_requester_id_fkey(name, email),
                    project:projects!approvals_project_id_fkey(name)
                `)
                .single();

            if (error) throw error;
            return data as Approval;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
    });
}

export function useProcessApproval() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, comments }: {
            id: string,
            status: 'approved' | 'rejected',
            comments?: string
        }) => {
            // First, get the approval details to know what to update
            const { data: approval, error: fetchError } = await supabase
                .from('approvals')
                .select('*, project:projects!approvals_project_id_fkey(id, status)')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Update the approval status
            const { data, error } = await supabase
                .from('approvals')
                .update({ status, comments })
                .eq('id', id)
                .select(`
                    *,
                    requester:users!approvals_requester_id_fkey(name, email),
                    project:projects!approvals_project_id_fkey(name, company_id)
                `)
                .single();

            if (error) throw error;

            // If approved and it's a stage transition, update the project status
            if (status === 'approved' && approval.type === 'stage_transition' && approval.entity_type === 'project_completion') {
                const currentStatus = approval.project?.status;
                const nextStageMap: Record<string, string> = {
                    'planning': 'active',
                    'active': 'completed'
                };
                const nextStatus = nextStageMap[currentStatus];

                if (nextStatus) {
                    const { error: projectError } = await supabase
                        .from('projects')
                        .update({ status: nextStatus })
                        .eq('id', approval.project_id);

                    if (projectError) {
                        console.error('Failed to update project status:', projectError);
                        throw new Error('Approval updated but failed to update project status');
                    }
                }
            }

            return data as Approval;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });
}
