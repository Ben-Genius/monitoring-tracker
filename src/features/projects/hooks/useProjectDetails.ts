import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProjectComment {
    id: string;
    project_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    updated_at: string;
    user?: {
        name: string;
        avatar_url: string | null;
    };
}

export interface ProjectAttachment {
    id: string;
    project_id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploaded_by: string;
    created_at: string;
}

// Comments Hooks
export function useProjectComments(projectId: string) {
    return useQuery({
        queryKey: ['project_comments', projectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('project_comments')
                .select(`
                    *,
                    user:users(name, avatar_url)
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as ProjectComment[];
        },
        enabled: !!projectId,
    });
}

export function useCreateProjectComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ project_id, comment }: { project_id: string; comment: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('project_comments')
                .insert({
                    project_id,
                    comment,
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project_comments', variables.project_id] });
        },
    });
}

// Attachments Hooks
export function useProjectAttachments(projectId: string) {
    return useQuery({
        queryKey: ['project_attachments', projectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('project_attachments')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as ProjectAttachment[];
        },
        enabled: !!projectId,
    });
}

export function useCreateProjectAttachment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: Omit<ProjectAttachment, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('project_attachments')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project_attachments', variables.project_id] });
        },
    });
}
