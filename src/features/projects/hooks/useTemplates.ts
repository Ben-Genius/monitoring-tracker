import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

/**
 * Project templates (supabase/migrations/20261126160000_project_templates.sql).
 * Until that migration is applied the list query errors; the UI then simply
 * offers no templates.
 */
export interface ProjectTemplate {
    id: string;
    name: string;
    description: string | null;
    tasks: unknown[];
    milestones: unknown[];
    created_at: string;
}

export function useProjectTemplates() {
    return useQuery({
        queryKey: ['project-templates'],
        queryFn: async () => {
            const { data, error } = await supabase.from('project_templates')
                .select('id, name, description, tasks, milestones, created_at').order('name');
            if (error) return [] as ProjectTemplate[];
            return (data ?? []) as ProjectTemplate[];
        },
    });
}

export function useSaveAsTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { projectId: string; name: string; description?: string }) => {
            const { data, error } = await supabase.rpc('save_project_as_template', {
                p_project: input.projectId, p_name: input.name, p_description: input.description ?? null,
            });
            if (error) throw new Error(/row-level|permission/i.test(error.message) ? 'Only admins, PAs and leads can save templates.' : error.message);
            return data as string;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['project-templates'] }),
    });
}

export function useCreateFromTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { templateId: string; name: string; companyId: string; start: string; contractValue: number; handover?: string }) => {
            const { data, error } = await supabase.rpc('create_project_from_template', {
                p_template: input.templateId, p_name: input.name, p_company: input.companyId, p_start: input.start,
                p_contract_value: input.contractValue, p_handover: input.handover || null,
            });
            if (error) throw new Error(/row-level|permission/i.test(error.message) ? 'You can’t create projects in that company.' : error.message);
            track('template_used');
            return data as string;
        },
        onSuccess: () => {
            ['projects', 'tasks', 'milestones'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
        },
    });
}
