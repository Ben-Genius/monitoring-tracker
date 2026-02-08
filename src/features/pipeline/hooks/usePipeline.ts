import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface PipelineProject {
    id: string;
    name: string;
    client: string;
    estimated_value: number;
    probability: number;
    stage: string;
    expected_close: string;
    company_id: string;
    company_name?: string;
}

export function usePipeline(companyId?: string) {
    return useQuery({
        queryKey: ['pipeline', companyId],
        queryFn: async () => {
            let query = supabase
                .from('pipeline_projects')
                .select('*, company:companies(name)');

            if (companyId && companyId !== 'all') {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return data.map((p: any) => ({
                ...p,
                company_name: p.company?.name || 'Unknown'
            })) as PipelineProject[];
        },
    });
}

export function usePipelineSummary(companyId?: string) {
    return useQuery({
        queryKey: ['pipeline-summary', companyId],
        queryFn: async () => {
            let query = supabase
                .from('pipeline_projects')
                .select('*');

            if (companyId && companyId !== 'all') {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const totalValue = data?.reduce((sum, p) => sum + Number(p.estimated_value), 0) || 0;
            const weightedValue = data?.reduce((sum, p) => sum + (Number(p.estimated_value) * (p.probability / 100)), 0) || 0;

            const stages = [
                { name: 'Lead', count: 0, color: 'bg-gray-400' },
                { name: 'Qualified', count: 0, color: 'bg-blue-400' },
                { name: 'Proposal', count: 0, color: 'bg-yellow-400' },
                { name: 'Negotiation', count: 0, color: 'bg-orange-400' },
                { name: 'Contract', count: 0, color: 'bg-green-400' },
            ];

            data?.forEach((p: any) => {
                const stage = stages.find(s => s.name === p.stage);
                if (stage) stage.count++;
            });

            return {
                totalValue,
                weightedValue,
                opportunities: data?.length || 0,
                stages
            };
        },
    });
}
