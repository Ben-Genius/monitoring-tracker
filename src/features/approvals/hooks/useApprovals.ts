import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Approval {
    id: string;
    project_id: string;
    requester_id: string;
    entity_type: string;
    entity_id: string;
    status: 'pending' | 'approved' | 'rejected';
    comments: string | null;
    created_at: string;
    requester?: {
        name: string;
        email: string;
    };
    approver?: {
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
                    approver:users!approvals_approved_by_fkey(name, email),
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
                    lead:users!approvals_lead_id_fkey(name, email),
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
                    lead:users!approvals_lead_id_fkey(name, email),
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
        mutationFn: async ({ id, status, approved_by, comments }: {
            id: string,
            status: 'approved' | 'rejected',
            approved_by: string,
            comments?: string
        }) => {
            const { data, error } = await supabase
                .from('approvals')
                .update({ status, approved_by, comments, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select(`
                    *,
                    requester:users!approvals_requester_id_fkey(name, email),
                    approver:users!approvals_approved_by_fkey(name, email),
                    project:projects!approvals_project_id_fkey(name, company_id)
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
