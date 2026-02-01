import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Subtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    updated_at: string;
    user?: {
        name: string;
        email: string;
    };
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    project_id: string;
    assignee_id: string;
    stage: 'talking_stage' | 'yet_to_start' | 'in_progress' | 'blockers' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string | null;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    project?: {
        name: string;
        company_id: string;
        company?: {
            name: string;
        };
    };
    assignee?: {
        name: string;
        email: string;
    };
    subtasks?: Subtask[];
    comments?: TaskComment[];
    _count?: {
        comments: number;
        subtasks: number;
    };
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    project_id: string;
    assignee_id: string;
    stage?: Task['stage'];
    priority?: Task['priority'];
    category?: string;
    due_date?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    stage?: Task['stage'];
    priority?: Task['priority'];
    category?: string;
    due_date?: string;
    assignee_id?: string;
}

// Fetch all tasks
export function useTasks(filters?: {
    project_id?: string;
    assignee_id?: string;
    stage?: string;
    category?: string;
    company_id?: string;
}) {
    return useQuery({
        queryKey: ['tasks', filters],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
          *,
          project:projects(name, company_id, company:companies(name)),
          assignee:users!tasks_assignee_id_users_id_fk(name, email),
          subtasks(id, is_completed),
          comments:task_comments(id)
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
            if (filters?.category) {
                query = query.eq('category', filters.category);
            }
            if (filters?.company_id) {
                query = query.eq('project.company_id', filters.company_id);
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
          project:projects(name, company_id, company:companies(name)),
          assignee:users!tasks_assignee_id_users_id_fk(name, email),
          creator:users!tasks_created_by_users_id_fk(name, email),
          subtasks(*)
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

// --- Subtasks Hooks ---

export function useSubtasks(taskId: string) {
    return useQuery({
        queryKey: ['subtasks', taskId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subtasks')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Subtask[];
        },
        enabled: !!taskId,
    });
}

export function useCreateSubtask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { task_id: string; title: string }) => {
            const { data, error } = await supabase
                .from('subtasks')
                .insert(input)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['subtasks', variables.task_id] });
            queryClient.invalidateQueries({ queryKey: ['task', variables.task_id] });
        },
    });
}

export function useUpdateSubtask(taskId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, title }: { id: string; title: string }) => {
            const { data, error } = await supabase
                .from('subtasks')
                .update({ title })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
        },
    });
}

export function useToggleSubtask(taskId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
            const { data, error } = await supabase
                .from('subtasks')
                .update({ is_completed })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
        },
    });
}

export function useDeleteSubtask(taskId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('subtasks')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
}

// --- Comments Hooks ---

export function useTaskComments(taskId: string) {
    return useQuery({
        queryKey: ['comments', taskId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('task_comments')
                .select(`
                    *,
                    user:users(name, email)
                `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as TaskComment[];
        },
        enabled: !!taskId,
    });
}

export function useCreateComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { task_id: string; content: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('task_comments')
                .insert({
                    task_id: input.task_id,
                    comment: input.content,
                    user_id: user.id
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', variables.task_id] });
            queryClient.invalidateQueries({ queryKey: ['task', variables.task_id] });
        },
    });
}

export function useDeleteComment(taskId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('task_comments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });
}
