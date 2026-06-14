import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    ArrowUpRight,
    FolderKanban,
    CheckCircle2,
    DollarSign,
    Clock,
    ClipboardCheck,
    ShieldCheck
} from 'lucide-react';
import { useDashboardStats, useIdleTasks, useRecentProjects, useTaskDistribution, usePerformanceTrend, useRecentTasks, useRecentApprovals } from '../hooks/useDashboard';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn, getCompanyTheme } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart,
    Area,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { selectedCompanyId } = useCompanyStore();
    const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedCompanyId);
    const { data: idleTasks } = useIdleTasks(selectedCompanyId);
    const { data: recentProjects = [] } = useRecentProjects(3, selectedCompanyId);
    const { data: taskDistribution = [] } = useTaskDistribution(selectedCompanyId);
    const { data: performanceTrend = [] } = usePerformanceTrend(selectedCompanyId);
    const { data: recentTasks } = useRecentTasks(5, selectedCompanyId);
    const { data: companies = [] } = useCompanies();
    const { data: recentApprovals } = useRecentApprovals(5, selectedCompanyId);

    const currentCompanyName = selectedCompanyId === 'all'
        ? 'Global View'
        : companies.find(c => c.id === selectedCompanyId)?.name || '';
    const theme = getCompanyTheme(currentCompanyName);

    if (statsLoading) {
        return (
            <div className="space-y-8 p-1">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                {/* KPI Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-full space-y-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-8 w-3/4" />
                                    </div>
                                </div>
                                <Skeleton className="h-1.5 w-full mt-4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Charts Section Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardContent className="p-6 h-[400px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 h-[400px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const statsCards = [
        {
            title: 'Total Projects',
            value: stats?.totalProjects.toString() || '0',
            change: stats?.projectChange || 0,
            icon: FolderKanban,
            color: 'bg-blue-500',
        },
        {
            title: 'Active Tasks',
            value: stats?.activeTasks.toString() || '0',
            change: stats?.taskChange || 0,
            icon: Activity,
            color: 'bg-orange-500',
        },
        {
            title: 'Team Members',
            value: stats?.teamMembers.toString() || '0',
            change: stats?.memberChange || 0,
            icon: CheckCircle2,
            color: 'bg-green-500',
        },
        {
            title: 'Total Revenue',
            value: formatCurrency(stats?.totalRevenue || 0),
            change: stats?.revenueChange || 0,
            icon: DollarSign,
            color: 'bg-indigo-500',
        },
    ];

    return (
        <div className="space-y-8 p-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Overview of project performance</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-50 mt-2">{stat.value}</h3>
                                </div>
                                {stat.change !== 0 && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                        <ArrowUpRight className="w-3 h-3" />
                                        +{stat.change}%
                                    </Badge>
                                )}
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: '70%',
                                        backgroundColor: selectedCompanyId !== 'all' ? theme.primary : stat.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : stat.color.replace('bg-', '') === 'orange-500' ? '#f97316' : stat.color.replace('bg-', '') === 'green-500' ? '#22c55e' : '#6366f1'
                                    }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Trend */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Performance Trend</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Project velocity over time</p>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs">
                                Export
                            </Button>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceTrend}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={selectedCompanyId !== 'all' ? theme.primary : "#3b82f6"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={selectedCompanyId !== 'all' ? theme.primary : "#3b82f6"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={selectedCompanyId !== 'all' ? theme.primary : "#3b82f6"}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Task Distribution */}
                <Card>
                    <CardContent className="p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Task Distribution</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Current breakdown by status</p>
                        </div>
                        <div className="h-[200px] w-full flex items-center justify-center relative">
                            {/* Inner Circle Label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900 dark:text-slate-50">{stats?.activeTasks || 0}</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active</span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={taskDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {taskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom Legend */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {taskDistribution.map((item) => (
                                <div key={item.name} className="flex items-center text-sm">
                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-gray-600 dark:text-slate-300 line-clamp-1">{item.name}</span>
                                    <span className="ml-auto font-medium text-gray-900 dark:text-slate-50">
                                        {Math.round((item.value / (taskDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1)) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activities & Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Projects */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Recent Projects</h3>
                            <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="font-bold">
                                View All
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recentProjects?.map((project) => (
                                <div key={project.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-md flex items-center justify-center",
                                            project.status === 'healthy' ? 'bg-green-50 text-green-600' :
                                                project.status === 'at_risk' ? 'bg-orange-50 text-orange-600' :
                                                    'bg-red-50 text-red-600'
                                        )}>
                                            <FolderKanban className="w-5 h-5 transition-transform group-hover:scale-110" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-slate-50 text-sm">{project.name}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">{project.company_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mb-1">{formatCurrency(project.contract_value)}</p>
                                        <Badge variant={project.status as any} className="capitalize text-[10px] h-5">
                                            {project.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {(!recentProjects || recentProjects.length === 0) && (
                                <p className="col-span-2 text-center text-gray-500 dark:text-slate-400 py-4 text-sm">No recent projects found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Idle Tasks */}
                <Card>
                    <CardContent className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Idle Tasks</h3>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase">Not updated in 48+h</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-primary hover:bg-primary/5">
                                <Activity className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {idleTasks?.map((task) => (
                                <div key={task.id} className="p-3 bg-red-50/30 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                                    <p className="text-sm font-bold text-gray-900 dark:text-slate-50 line-clamp-1">{task.title}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">{task.assignee_name}</p>
                                        <Badge variant="destructive" className="text-[9px] h-5 px-1.5 font-black uppercase">
                                            {task.days_idle}D Idle
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {(!idleTasks || idleTasks.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50/30 rounded-xl border border-dashed border-green-200">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                                    <p className="text-xs text-green-700 font-bold uppercase">All tasks tracked!</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Items Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                {/* Recent Tasks */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-md">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Recent Tasks</h3>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-primary hover:text-primary hover:bg-primary/5 font-bold">
                                View Board
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {recentTasks?.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-700 rounded-xl hover:border-blue-200 dark:hover:border-blue-500 transition-all bg-white dark:bg-slate-900 group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            task.stage === 'completed' ? 'bg-success' :
                                                task.stage === 'in_progress' ? 'bg-primary' :
                                                    task.stage === 'blockers' ? 'bg-error' : 'bg-slate-300'
                                        )} />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-slate-50 line-clamp-1 group-hover:text-primary transition-colors">{task.title}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                                                {task.project_name} • {task.assignee_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 font-bold capitalize h-6">
                                        {task.stage.replace('_', ' ')}
                                    </Badge>
                                </div>
                            ))}
                            {(!recentTasks || recentTasks.length === 0) && (
                                <p className="text-center text-gray-500 dark:text-slate-400 py-8 text-sm">No recent tasks found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Approvals */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-md">
                                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Pending Approvals</h3>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/approvals')} className="text-primary hover:text-primary hover:bg-primary/5 font-bold">
                                View All
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {recentApprovals?.map((approval) => (
                                <div key={approval.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-700 rounded-xl hover:border-purple-200 dark:hover:border-purple-500 transition-all bg-white dark:bg-slate-900 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-md group-hover:bg-purple-50 transition-colors">
                                            <ClipboardCheck className="w-4 h-4 text-slate-500 group-hover:text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-slate-50 line-clamp-1 group-hover:text-purple-700 transition-colors">{approval.title}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                                                {approval.company_name} • By {approval.requester_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            approval.status === 'approved' ? 'success' :
                                                approval.status === 'pending' ? 'warning' : 'destructive'
                                        }
                                        className="text-[10px] font-bold capitalize h-6"
                                    >
                                        {approval.status}
                                    </Badge>
                                </div>
                            ))}
                            {(!recentApprovals || recentApprovals.length === 0) && (
                                <p className="text-center text-gray-500 dark:text-slate-400 py-8 text-sm">No pending approvals found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
