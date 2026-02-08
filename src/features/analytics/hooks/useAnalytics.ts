import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface PerformancePerCompany {
    company: string;
    projects: number;
    revenue: number;
    profit: number;
}

export interface MonthlyTrend {
    month: string;
    tasks: number;
    revenue: number;
}

export interface Performer {
    name: string;
    tasksCompleted: number;
    onTimeRate: number;
}

export function useCompanyPerformance() {
    return useQuery({
        queryKey: ['company-performance'],
        queryFn: async () => {
            const { data: companies, error: compError } = await supabase
                .from('companies')
                .select(`
                    name,
                    projects(contract_value, actual_cost)
                `);

            if (compError) throw compError;

            return companies.map((c: any) => {
                const projectsCount = c.projects?.length || 0;
                const revenue = c.projects?.reduce((acc: number, p: any) => acc + Number(p.contract_value), 0) || 0;
                const cost = c.projects?.reduce((acc: number, p: any) => acc + Number(p.actual_cost), 0) || 0;
                const profit = revenue - cost;

                return {
                    company: c.name,
                    projects: projectsCount,
                    revenue,
                    profit
                };
            }) as PerformancePerCompany[];
        },
    });
}

export function useMonthlyTrend() {
    return useQuery({
        queryKey: ['monthly-trend'],
        queryFn: async () => {
            // This would ideally be a SQL view or specialized RPC for better performance
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('created_at, stage, project:projects(contract_value)')
                .eq('stage', 'completed');

            if (error) throw error;

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const trend: Record<string, MonthlyTrend> = {};

            // Initialize last 6 months
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthName = months[d.getMonth()];
                trend[monthName] = { month: monthName, tasks: 0, revenue: 0 };
            }

            tasks?.forEach((task: any) => {
                const d = new Date(task.created_at);
                const monthName = months[d.getMonth()];
                if (trend[monthName]) {
                    trend[monthName].tasks++;
                    trend[monthName].revenue += Number(task.project?.contract_value || 0) / 10; // Simulated revenue allocation
                }
            });

            return Object.values(trend);
        },
    });
}

export function useTopPerformers() {
    return useQuery({
        queryKey: ['top-performers'],
        queryFn: async () => {
            const { data: users, error } = await supabase
                .from('users')
                .select(`
                    name,
                    tasks!tasks_assignee_id_users_id_fk(stage, completed_at, expected_handover)
                `);

            if (error) throw error;

            return users.map((u: any) => {
                const completedTasks = u.tasks?.filter((t: any) => t.stage === 'completed') || [];
                const tasksCompleted = completedTasks.length;

                let onTimeCount = 0;
                completedTasks.forEach((t: any) => {
                    if (t.completed_at && t.expected_handover) {
                        if (new Date(t.completed_at) <= new Date(t.expected_handover)) {
                            onTimeCount++;
                        }
                    }
                });

                const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeCount / tasksCompleted) * 100) : 0;

                return {
                    name: u.name,
                    tasksCompleted,
                    onTimeRate
                };
            })
                .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
                .slice(0, 5) as Performer[];
        },
    });
}
