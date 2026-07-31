import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';

export interface AuditEntry {
    id: string;
    entity_type: 'project' | 'task' | 'milestone' | 'approval' | 'import';
    entity_id: string;
    action: 'created' | 'updated' | 'deleted' | 'stage_changed' | 'status_changed' | 'imported';
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    summary: string;
    user_id: string | null;
    created_at: string;
    user?: {
        name: string;
    } | null;
}

export interface LogInput {
    entity_type: AuditEntry['entity_type'];
    entity_id: string;
    action: AuditEntry['action'];
    field?: string;
    old_value?: string;
    new_value?: string;
    summary: string;
}

// Fetch recent audit logs for a specific entity (project, task, milestone)
export function useAuditLog(entityType: string, entityId: string) {
    return useQuery({
        queryKey: ['audit_log', entityType, entityId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_log')
                .select('*, user:users(name)')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return (data || []) as AuditEntry[];
        },
        enabled: !!entityId,
    });
}

// Fetch all recent audit logs (for dashboard feed)
export function useRecentAuditLogs(limit = 20) {
    return useQuery({
        queryKey: ['audit_log', 'recent', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_log')
                .select('*, user:users(name)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return (data || []) as AuditEntry[];
        },
    });
}

// Insert a log entry
export function useLogActivity() {
    return useMutation({
        mutationFn: async (input: LogInput) => {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('audit_log')
                .insert({
                    entity_type: input.entity_type,
                    entity_id: input.entity_id,
                    action: input.action,
                    field: input.field || null,
                    old_value: input.old_value || null,
                    new_value: input.new_value || null,
                    summary: input.summary,
                    user_id: user?.id || null,
                });

            if (error) throw error;
        },
    });
}
