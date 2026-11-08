import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseLog } from '@/features/audit/utils/log';
import type { Evidence } from './useEvidence';

// Types
export interface Subtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
    end_date?: string | null;
    completed_date?: string | null;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    updated_at: string;
    kind?: 'comment' | 'status_update' | 'nudge';
    from_stage?: Task['stage'] | null;
    to_stage?: Task['stage'] | null;
    progress_percent?: number | null;
    evidence?: Evidence[];
    user?: {
        name: string;
        email: string;
        role?: string;
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
    due_date: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    // ECAS accountability fields
    progress_percent: number;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    next_update_due: string | null;
    last_movement_at: string | null;
    is_urgent: boolean;
    blocker_description?: string | null;
    blocked_by?: string | null;
    created_by?: string | null;
    company_id?: string | null;
    blocker?: { name: string } | null;
    creator?: { name: string; email?: string } | null;
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
    assignees?: {
        user: {
            id: string;
            name: string;
            email: string;
        }
    }[];
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
    project_id?: string;
    assignee_id: string;
    assignee_ids?: string[];
    stage?: Task['stage'];
    priority?: Task['priority'];
    due_date?: string;
    /** Required when there is no project: row-level security scopes a
     *  project-less task by its own company_id. */
    company_id?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    stage?: Task['stage'];
    priority?: Task['priority'];
    due_date?: string | null;
    assignee_id?: string | null;
    assignee_ids?: string[];
    project_id?: string | null;
    progress_percent?: number;
    next_update_due?: string | null;
    is_urgent?: boolean;
    blocker_description?: string | null;
    blocked_by?: string | null;
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
          assignee:users!tasks_assignee_id_fkey(name, email),
          blocker:users!tasks_blocked_by_fkey(name),
          subtasks:subtasks(is_completed, archived_at),
          comments:task_comments(count)
        `)
                .is('archived_at', null)
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

            // Filter by company here rather than with .eq('project.company_id'):
            // on an embedded resource without !inner, PostgREST keeps every
            // row and only nulls the embed, so that filter never filtered.
            // Tasks without a project carry their own company_id.
            let rows = (data || []) as unknown as Task[];
            if (filters?.company_id) {
                rows = rows.filter(t => (t.project?.company_id ?? t.company_id) === filters.company_id);
            }

            return rows.map((task) => ({
                ...task,
                subtasks: (task.subtasks as (Subtask & { archived_at?: string | null })[] | undefined)?.filter(s => !s.archived_at),
                _count: {
                    comments: (task.comments as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0,
                    subtasks: task.subtasks?.length ?? 0,
                },
            })) as Task[];
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
          assignee:users!tasks_assignee_id_fkey(name, email),
          blocker:users!tasks_blocked_by_fkey(name),
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

            // Separate assignee_ids from the rest of the task data
            const { assignee_ids, ...taskData } = input;

            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    ...taskData,
                    created_by: user.id,
                })
                .select()
                .single();

            if (taskError) throw taskError;

            // Write assignee_ids to task_assignees table
            if (assignee_ids && assignee_ids.length > 0) {
                const { error: assignError } = await supabase
                    .from('task_assignees')
                    .insert(
                        assignee_ids.map(assignee_id => ({
                            task_id: task.id,
                            user_id: assignee_id,
                        }))
                    );
                if (assignError) console.error('Failed to assign users:', assignError);
            }

            supabaseLog({
                entity_type: 'task',
                entity_id: task.id,
                action: 'created',
                summary: `Task "${task.title}" created`,
            });

            return task;
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
            const { assignee_ids, ...updateData } = input;

            if (assignee_ids && assignee_ids.length > 0) {
                updateData.assignee_id = assignee_ids[0] || null;
            }

            const { data: existing } = await supabase
                .from('tasks')
                .select('title, stage, priority')
                .eq('id', id)
                .single();

            const { data, error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Update task_assignees
            if (assignee_ids) {
                await supabase.from('task_assignees').delete().eq('task_id', id);
                if (assignee_ids.length > 0) {
                    const { error: assignError } = await supabase
                        .from('task_assignees')
                        .insert(assignee_ids.map(user_id => ({ task_id: id, user_id })));
                    if (assignError) console.error('Failed to update assignees:', assignError);
                }
            }

            if (input.stage && existing && existing.stage !== input.stage) {
                supabaseLog({
                    entity_type: 'task',
                    entity_id: id,
                    action: 'stage_changed',
                    field: 'stage',
                    old_value: existing.stage,
                    new_value: input.stage,
                    summary: `Task "${existing.title || data.title}" moved from ${existing.stage.replace('_', ' ')} to ${input.stage.replace('_', ' ')}`,
                });
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            queryClient.invalidateQueries({ queryKey: ['brief'] });
        },
    });
}

// Owner accepts a task: one tap, no form.
export function useAcknowledgeTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
            // Only stamp it once; a second tap must not move the date.
            const { data, error } = await supabase
                .from('tasks')
                .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
                .eq('id', id)
                .is('acknowledged_at', null)
                .select('id, title');

            if (error) throw error;

            if (data && data.length > 0) {
                supabaseLog({
                    entity_type: 'task',
                    entity_id: id,
                    action: 'updated',
                    field: 'acknowledged_at',
                    summary: `Task "${data[0].title}" was accepted by its owner`,
                });
            }
            return data;
        },
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', id] });
        },
    });
}

// Move a task to another stage, with the rules from the 29 Oct meeting, and
// show the move on screen immediately instead of waiting for the server.
export interface MoveTaskInput {
    task: Pick<Task, 'id' | 'title' | 'stage' | 'assignee_id' | 'acknowledged_at' | 'progress_percent'>;
    stage: Task['stage'];
    actorId?: string;
    blocker_description?: string | null;
    blocked_by?: string | null;
    progress_percent?: number | null;
}

export function movePatch({ task, stage, actorId, blocker_description, blocked_by, progress_percent }: MoveTaskInput) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { stage };
    if (progress_percent != null && stage !== 'completed') patch.progress_percent = progress_percent;
    if (stage === 'completed') {
        patch.progress_percent = 100;
        patch.completed_at = now;
        patch.blocked_by = null;
    } else if (task.stage === 'completed') {
        patch.completed_at = null;
        if (task.progress_percent === 100 && progress_percent == null) patch.progress_percent = 75;
    }
    if (stage === 'blockers') {
        patch.blocker_description = blocker_description ?? null;
        patch.blocked_by = blocked_by ?? null;
    } else if (task.stage === 'blockers') {
        patch.blocked_by = null;
    }
    // The owner starting work on a task they never accepted has accepted it.
    if (stage === 'in_progress' && !task.acknowledged_at && actorId && actorId === task.assignee_id) {
        patch.acknowledged_at = now;
        patch.acknowledged_by = actorId;
    }
    return patch;
}

export function useMoveTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: MoveTaskInput) => {
            const patch = movePatch(input);
            const { error } = await supabase.from('tasks').update(patch).eq('id', input.task.id);
            if (error) throw error;

            if (input.task.stage !== input.stage) {
                supabaseLog({
                    entity_type: 'task',
                    entity_id: input.task.id,
                    action: 'stage_changed',
                    field: 'stage',
                    old_value: input.task.stage,
                    new_value: input.stage,
                    summary: `Task "${input.task.title}" moved from ${input.task.stage.replace('_', ' ')} to ${input.stage.replace('_', ' ')}`,
                });
            }
        },
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            const previous = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
            const patch = movePatch(input);
            queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, old =>
                old?.map(t => (t.id === input.task.id ? ({ ...t, ...patch } as Task) : t))
            );
            return { previous };
        },
        onError: (_err, _input, context) => {
            context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: (_data, _err, input) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', input.task.id] });
            queryClient.invalidateQueries({ queryKey: ['brief'] });
        },
    });
}

// Update task stage (for drag-and-drop)
export function useUpdateTaskStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, stage }: { id: string; stage: Task['stage'] }) => {
            const { data: existing } = await supabase
                .from('tasks')
                .select('title, stage')
                .eq('id', id)
                .single();

            const { data, error } = await supabase
                .from('tasks')
                .update({ stage })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (existing && existing.stage !== stage) {
                supabaseLog({
                    entity_type: 'task',
                    entity_id: id,
                    action: 'stage_changed',
                    field: 'stage',
                    old_value: existing.stage,
                    new_value: stage,
                    summary: `Task "${existing.title || data.title}" moved from ${existing.stage.replace('_', ' ')} to ${stage.replace('_', ' ')}`,
                });
            }

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
                .is('archived_at', null)
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
                    user:users(name, email, role)
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
        mutationFn: async (input: {
            task_id: string; content: string; kind?: TaskComment['kind'];
            from_stage?: Task['stage']; to_stage?: Task['stage']; progress_percent?: number | null; evidence?: Evidence[];
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('task_comments')
                .insert({
                    task_id: input.task_id,
                    comment: input.content,
                    user_id: user.id,
                    kind: input.kind ?? 'comment',
                    from_stage: input.from_stage ?? null,
                    to_stage: input.to_stage ?? null,
                    progress_percent: input.progress_percent ?? null,
                    evidence: input.evidence ?? [],
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
