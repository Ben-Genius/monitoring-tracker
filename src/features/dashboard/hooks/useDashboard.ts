import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface DashboardStats {
    totalProjects: number;
    activeTasks: number;
    teamMembers: number;
    totalRevenue: number;
    projectChange: number;
    taskChange: number;
    memberChange: number;
    revenueChange: number;
}

export interface IdleTask {
    id: string;
    title: string;
    assignee_name: string;
    days_idle: number;
    updated_at: string;
}

export interface RecentProject {
    id: string;
    name: string;
    company_name: string;
    profitability: number;
    status: 'healthy' | 'at_risk' | 'critical';
    variance: number;
    contract_value: number;
    actual_cost: number;
}

// Fetch dashboard statistics
export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            // Get total projects
            const { count: totalProjects } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true });

            // Get active tasks
            const { count: activeTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .neq('stage', 'completed');

            // Get team members
            const { count: teamMembers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            // Get total revenue (sum of contract values)
            const { data: projects } = await supabase
                .from('projects')
                .select('contract_value');

            const totalRevenue = projects?.reduce(
                (sum, p) => sum + Number(p.contract_value),
                0
            ) || 0;

            return {
                totalProjects: totalProjects || 0,
                activeTasks: activeTasks || 0,
                teamMembers: teamMembers || 0,
                totalRevenue,
                projectChange: 3,
                taskChange: 12,
                memberChange: 2,
                revenueChange: 15,
            } as DashboardStats;
        },
    });
}

// Fetch idle tasks (not updated in 48+ hours)
export function useIdleTasks() {
    return useQuery({
        queryKey: ['idle-tasks'],
        queryFn: async () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            const { data, error } = await supabase
                .from('tasks')
                .select(`
          id,
          title,
          updated_at,
          assignee:users!tasks_assignee_id_fkey(name)
        `)
                .lt('updated_at', twoDaysAgo.toISOString())
                .not('stage', 'in', '(completed,talking_stage)')
                .order('updated_at', { ascending: true })
                .limit(5);

            if (error) throw error;

            return data?.map((task: any) => ({
                id: task.id,
                title: task.title,
                assignee_name: task.assignee?.name || 'Unassigned',
                days_idle: Math.floor(
                    (Date.now() - new Date(task.updated_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                ),
                updated_at: task.updated_at,
            })) as IdleTask[];
        },
    });
}

// Fetch recent projects with profitability
export function useRecentProjects(limit = 3) {
    return useQuery({
        queryKey: ['recent-projects', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select(`
          id,
          name,
          contract_value,
          actual_cost,
          expected_handover,
          company:companies(name)
        `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data?.map((project: any) => {
                const profit = project.contract_value - project.actual_cost;
                const profitability = (profit / project.contract_value) * 100;

                let status: 'healthy' | 'at_risk' | 'critical';
                if (profitability >= 20) status = 'healthy';
                else if (profitability >= 5) status = 'at_risk';
                else status = 'critical';

                // Calculate variance (mock for now)
                const variance = Math.floor(Math.random() * 10) - 5;

                return {
                    id: project.id,
                    name: project.name,
                    company_name: project.company?.name || 'Unknown',
                    profitability: Math.round(profitability),
                    status,
                    variance,
                    contract_value: project.contract_value,
                    actual_cost: project.actual_cost,
                };
            }) as RecentProject[];
        },
    });
}
