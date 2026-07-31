import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseLog } from '@/features/audit/utils/log';

export interface Project {
    id: string;
    name: string;
    description: string | null;
    company_id: string;
    status: 'active' | 'completed' | 'on_hold';
    service_type: string | null;
    contract_value: number;
    actual_cost: number;
    expected_handover: string;
    start_date: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    company?: {
        name: string;
    };
    creator?: {
        name: string;
        email: string;
    };
    tasks?: { id: string; title: string; stage: string }[];
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    company_id: string;
    service_type?: string;
    contract_value: number;
    expected_handover: string;
    start_date?: string;
    status?: Project['status'];
}

// Fetch all projects
export function useProjects(companyId?: string) {
    return useQuery({
        queryKey: ['projects', companyId],
        queryFn: async () => {
            let query = supabase
                .from('projects')
                .select(`
          *,
          company:companies(name),
          creator:users!projects_created_by_fkey(name),
          tasks!tasks_project_id_fkey(id, title, stage)
        `)
                .order('created_at', { ascending: false });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Project[];
        },
    });
}

// Fetch single project
export function useProject(id: string) {
    return useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select(`
          *,
          company:companies(name),
          creator:users!projects_created_by_fkey(name, email),
          tasks!tasks_project_id_fkey(id, title, stage)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Project;
        },
        enabled: !!id,
    });
}

// Create project
export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateProjectInput) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('projects')
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
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

// Update project
export function useUpdateProject(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: Partial<CreateProjectInput>) => {
            const { data: existing } = await supabase
                .from('projects')
                .select('name, status, contract_value')
                .eq('id', id)
                .single();

            const { data, error } = await supabase
                .from('projects')
                .update(input)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (input.status && existing && existing.status !== input.status) {
                supabaseLog({
                    entity_type: 'project',
                    entity_id: id,
                    action: 'status_changed',
                    field: 'status',
                    old_value: existing.status,
                    new_value: input.status,
                    summary: `Project "${existing.name || data.name}" status changed to ${input.status.replace('_', ' ')}`,
                });
            }
            if (input.contract_value !== undefined && existing && Number(existing.contract_value) !== Number(input.contract_value)) {
                supabaseLog({
                    entity_type: 'project',
                    entity_id: id,
                    action: 'updated',
                    field: 'contract_value',
                    old_value: String(existing.contract_value),
                    new_value: String(input.contract_value),
                    summary: `Project "${existing.name || data.name}" budget changed from GHS ${Number(existing.contract_value).toLocaleString()} to GHS ${Number(input.contract_value).toLocaleString()}`,
                });
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', id] });
        },
    });
}

// Fetch all companies
export function useCompanies() {
    return useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
    });
}

// Fetch all leads
export function useLeads(companyId?: string) {
    return useQuery({
        queryKey: ['leads', companyId],
        queryFn: async () => {
            let query = supabase
                .from('users')
                .select('*')
                .eq('role', 'lead')
                .order('name');

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });
}
