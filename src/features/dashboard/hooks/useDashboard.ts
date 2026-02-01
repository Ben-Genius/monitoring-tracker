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

export interface RecentTask {
    id: string;
    title: string;
    stage: string;
    project_name: string;
    company_name: string;
    assignee_name: string;
    created_at: string;
}

export interface RecentApproval {
    id: string;
    type: string;
    title: string;
    requester_name: string;
    status: string;
    created_at: string;
    company_name: string;
}

// Fetch dashboard statistics
export function useDashboardStats(companyId?: string) {
    return useQuery({
        queryKey: ['dashboard-stats', companyId],
        queryFn: async () => {
            // Get total projects
            let projectsQuery = supabase
                .from('projects')
                .select('*', { count: 'exact', head: true });

            if (companyId && companyId !== 'all') {
                projectsQuery = projectsQuery.eq('company_id', companyId);
            }
            const { count: totalProjects } = await projectsQuery;

            // Get active tasks
            let tasksQuery = supabase
                .from('tasks')
                .select('*, project:projects!inner(company_id)', { count: 'exact', head: true })
                .neq('stage', 'completed');

            if (companyId && companyId !== 'all') {
                tasksQuery = tasksQuery.eq('project.company_id', companyId);
            }
            const { count: activeTasks } = await tasksQuery;

            // Get team members (users)
            let usersQuery = supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (companyId && companyId !== 'all') {
                usersQuery = usersQuery.eq('company_id', companyId);
            }
            const { count: teamMembers } = await usersQuery;

            // Get total revenue
            let revenueQuery = supabase
                .from('projects')
                .select('contract_value');

            if (companyId && companyId !== 'all') {
                revenueQuery = revenueQuery.eq('company_id', companyId);
            }
            const { data: projects } = await revenueQuery;

            const totalRevenue = projects?.reduce(
                (sum, p) => sum + Number(p.contract_value),
                0
            ) || 0;

            return {
                totalProjects: totalProjects || 0,
                activeTasks: activeTasks || 0,
                teamMembers: teamMembers || 0,
                totalRevenue,
                projectChange: 0,
                taskChange: 0,
                memberChange: 0,
                revenueChange: 0,
            } as DashboardStats;
        },
    });
}

// Fetch task distribution for pie chart
export function useTaskDistribution(companyId?: string) {
    return useQuery({
        queryKey: ['task-distribution', companyId],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select('stage, project:projects!inner(company_id)');

            if (companyId && companyId !== 'all') {
                query = query.eq('project.company_id', companyId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const distribution = {
                talking_stage: 0,
                yet_to_start: 0,
                in_progress: 0,
                blockers: 0,
                completed: 0,
            };

            data?.forEach((task: any) => {
                if (task.stage in distribution) {
                    distribution[task.stage as keyof typeof distribution]++;
                }
            });

            return [
                { name: 'Talking Stage', value: distribution.talking_stage, color: '#94a3b8' },
                { name: 'Yet to Start', value: distribution.yet_to_start, color: '#fbbf24' },
                { name: 'In Progress', value: distribution.in_progress, color: '#3b82f6' },
                { name: 'Blockers', value: distribution.blockers, color: '#ef4444' },
                { name: 'Completed', value: distribution.completed, color: '#10b981' },
            ].filter(d => d.value > 0);
        },
    });
}

// Fetch performance trend for area chart (mocked with real date logic)
export function usePerformanceTrend(companyId?: string) {
    return useQuery({
        queryKey: ['performance-trend', companyId],
        queryFn: async () => {
            // For now, we'll return some baseline data based on created_at dates
            // In a real app, this would be a more complex aggregation
            const { data, error } = await supabase
                .from('tasks')
                .select('created_at, project:projects!inner(company_id)')
                .order('created_at', { ascending: true });

            if (error) throw error;

            const trend: Record<string, number> = {};
            data?.forEach((task: any) => {
                const date = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                trend[date] = (trend[date] || 0) + 1;
            });

            return Object.entries(trend).map(([name, value]) => ({ name, value }));
        },
    });
}

// Fetch idle tasks (not updated in 48+ hours)
export function useIdleTasks(companyId?: string) {
    return useQuery({
        queryKey: ['idle-tasks', companyId],
        queryFn: async () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            let query = supabase
                .from('tasks')
                .select(`
          id,
          title,
          updated_at,
          assignee:users!tasks_assignee_id_users_id_fk(name),
          project:projects!inner(company_id)
        `)
                .lt('updated_at', twoDaysAgo.toISOString())
                .not('stage', 'in', '(completed,talking_stage)');

            if (companyId && companyId !== 'all') {
                query = query.eq('project.company_id', companyId);
            }

            const { data, error } = await query
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
export function useRecentProjects(limit = 3, companyId?: string) {
    return useQuery({
        queryKey: ['recent-projects', limit, companyId],
        queryFn: async () => {
            let query = supabase
                .from('projects')
                .select(`
          id,
          name,
          contract_value,
          actual_cost,
          expected_handover,
          company:companies(name)
        `);

            if (companyId && companyId !== 'all') {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data?.map((project: any) => {
                const profit = project.contract_value - project.actual_cost;
                const profitability = project.contract_value > 0 ? (profit / project.contract_value) * 100 : 0;

                let status: 'healthy' | 'at_risk' | 'critical';
                if (profitability >= 20) status = 'healthy';
                else if (profitability >= 5) status = 'at_risk';
                else status = 'critical';

                return {
                    id: project.id,
                    name: project.name,
                    company_name: project.company?.name || 'Unknown',
                    profitability: Math.round(profitability),
                    status,
                    variance: 0,
                    contract_value: project.contract_value,
                    actual_cost: project.actual_cost,
                };
            }) as RecentProject[];
        },
    });
}
// Fetch recent tasks
export function useRecentTasks(limit = 5, companyId?: string) {
    return useQuery({
        queryKey: ['recent-tasks', limit, companyId],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
          id,
          title,
          stage,
          created_at,
          project:projects!inner(name, company:companies(name)),
          assignee:users!tasks_assignee_id_users_id_fk(name)
        `);

            if (companyId && companyId !== 'all') {
                query = query.eq('project.company_id', companyId);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data?.map((task: any) => ({
                id: task.id,
                title: task.title,
                stage: task.stage,
                project_name: task.project?.name || 'Unknown',
                company_name: task.project?.company?.name || 'Unknown',
                assignee_name: task.assignee?.name || 'Unassigned',
                created_at: task.created_at,
            })) as RecentTask[];
        },
    });
}

// Fetch recent approvals
export function useRecentApprovals(limit = 5, companyId?: string) {
    return useQuery({
        queryKey: ['recent-approvals', limit, companyId],
        queryFn: async () => {
            // Looking at approvals table structure from previous edits
            let query = supabase
                .from('approvals')
                .select(`
          id,
          type,
          title,
          status,
          created_at,
          requester:users!approvals_requester_id_fkey(name),
          project:projects!approvals_project_id_fkey(inner, company:companies(name))
        `);

            if (companyId && companyId !== 'all') {
                query = query.eq('project.company_id', companyId);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data?.map((approval: any) => ({
                id: approval.id,
                type: approval.type,
                title: approval.title,
                requester_name: approval.requester?.name || 'Unknown',
                status: approval.status,
                created_at: approval.created_at,
                company_name: approval.project?.company?.name || 'Unknown',
            })) as RecentApproval[];
        },
    });
}
