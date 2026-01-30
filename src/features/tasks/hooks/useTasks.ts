import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Task {
    id: string;
    title: string;
    description: string | null;
    project_id: string;
    assignee_id: string;
    stage: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    due_date: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    project?: {
        name: string;
        company_id: string;
    };
    assignee?: {
        name: string;
        email: string;
    };
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    project_id: string;
    assignee_id: string;
    stage?: Task['stage'];
    priority?: Task['priority'];
    due_date?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    stage?: Task['stage'];
    priority?: Task['priority'];
    due_date?: string;
    assignee_id?: string;
}

// Fetch all tasks
export function useTasks(filters?: {
    project_id?: string;
    assignee_id?: string;
    stage?: string;
}) {
    return useQuery({
        queryKey: ['tasks', filters],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
          *,
          project:projects(name, company_id),
          assignee:users!tasks_assignee_id_fkey(name, email)
        `)
                .order('created_at', { ascending: false });

            if (filters?.project_id) {
                query = query.eq('project_id', filters.project_id);
            }
            if (filters?.assignee_id) {
                query = query.eq('assignee_id', filters.assignee_id);
            }
            if (filters?.stage) {
                query = query.eq('stage', filters.stage);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Task[];
        },
    });
}

// Fetch single task
export function useTask(id: string) {
    return useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
          *,
          project:projects(name, company_id),
          assignee:users!tasks_assignee_id_fkey(name, email),
          creator:users!tasks_created_by_fkey(name, email)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Task;
        },
        enabled: !!id,
    });
}

// Create task
export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateTaskInput) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    ...input,
                    created_by: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}

// Update task
export function useUpdateTask(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateTaskInput) => {
            const { data, error } = await supabase
                .from('tasks')
                .update(input)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', id] });
        },
    });
}

// Update task stage (for drag-and-drop)
export function useUpdateTaskStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, stage }: { id: string; stage: Task['stage'] }) => {
            const { data, error } = await supabase
                .from('tasks')
                .update({ stage })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}

// Delete task
export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}
