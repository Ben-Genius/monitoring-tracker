import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Project {
    id: string;
    name: string;
    description: string | null;
    company_id: string;
    lead_id: string | null;
    status: 'planning' | 'active' | 'completed' | 'on_hold' | 'cancelled';
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
    lead?: {
        name: string;
        email: string;
    };
    tasks?: { stage: string }[];
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    company_id: string;
    lead_id?: string;
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
          lead:users!projects_lead_id_fkey(name),
          tasks(stage)
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
          lead:users!projects_lead_id_fkey(name, email),
          tasks(stage)
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
            const { data, error } = await supabase
                .from('projects')
                .update(input)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', id] });
        },
    });
}
