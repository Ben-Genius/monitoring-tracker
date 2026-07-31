import { supabase } from '@/lib/supabase';

interface LogPayload {
    entity_type: 'project' | 'task' | 'milestone' | 'approval' | 'import';
    entity_id: string;
    action: 'created' | 'updated' | 'deleted' | 'stage_changed' | 'status_changed' | 'imported';
    field?: string;
    old_value?: string;
    new_value?: string;
    summary: string;
}

// Standalone logging function (no hooks dependency — call from mutations)
export async function supabaseLog(payload: LogPayload) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_log').insert({
            ...payload,
            user_id: user?.id || null,
        });
    } catch {
        // silent fail — logging should never break the main operation
    }
}
