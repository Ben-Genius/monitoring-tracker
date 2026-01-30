import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Approval {
    id: string;
    entity_type: 'task_stage' | 'budget_increase' | 'project_completion';
    entity_id: string;
    requested_by: string;
    approved_by: string | null;
    status: 'pending' | 'approved' | 'rejected';
    comments: string | null;
    created_at: string;
    updated_at: string;
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
    };
}

export interface CreateApprovalInput {
    entity_type: string;
    entity_id: string;
    requested_by: string;
    comments?: string;
}

export function useApprovals() {
    return useQuery({
        queryKey: ['approvals'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('approvals')
                .select(`
                    *,
                    requester:users!approvals_requested_by_fkey(name, email),
                    approver:users!approvals_approved_by_fkey(name, email)
                `)
                .order('created_at', { ascending: false });

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
                    requester:users!approvals_requested_by_fkey(name, email)
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
                .select()
                .single();

            if (error) throw error;
            return data;
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
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
    });
}
