import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    ArrowUpRight,
    FolderKanban,
    CheckCircle2,
    Clock,
    ClipboardCheck,
    ShieldCheck,
    TrendingUp,
    Users
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
            <div className="space-y-8 p-1 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="rounded-xl">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-xl">
                        <CardContent className="p-6 h-[400px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl">
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
            icon: Users,
            color: 'bg-green-500',
        },
        {
            title: 'Total Revenue',
            value: formatCurrency(stats?.totalRevenue || 0),
            change: stats?.revenueChange || 0,
            icon: TrendingUp,
            color: 'bg-indigo-500',
        },
    ];

    return (
        <div className="space-y-8 p-1 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Overview of project performance</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, i) => (
                    <Card
                        key={stat.title}
                        className="rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift hover:shadow-lg"
                        style={{
                            animation: `spring-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s both`,
                        }}
                    >
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">{stat.value}</h3>
                                </div>
                                {stat.change !== 0 && (
                                    <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 flex items-center gap-1 text-xs font-semibold">
                                        <ArrowUpRight className="w-3 h-3" />
                                        {stat.change}%
                                    </Badge>
                                )}
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-apple"
                                    style={{
                                        width: `${Math.min(Math.abs(stat.change || 70), 100)}%`,
                                        backgroundColor: selectedCompanyId !== 'all' ? theme.primary : '#3b82f6'
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Trend */}
                <Card className="lg:col-span-2 rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Performance Trend</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Project velocity over time</p>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs rounded-pill">
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
                                        contentStyle={{
                                            backgroundColor: 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(20px)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                        }}
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
                <Card className="rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift">
                    <CardContent className="p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Task Distribution</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Current breakdown by status</p>
                        </div>
                        <div className="h-[200px] w-full flex items-center justify-center relative">
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
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {taskDistribution.map((item, i) => (
                                <div key={item.name} className="flex items-center text-sm animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                    <div className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-600 dark:text-slate-300 truncate">{item.name}</span>
                                    <span className="ml-auto font-semibold text-gray-900 dark:text-slate-50 tabular-nums">
                                        {Math.round((item.value / (taskDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1)) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activities & Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Projects */}
                <Card className="lg:col-span-2 rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Recent Projects</h3>
                            <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="font-semibold rounded-pill">
                                View All
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recentProjects?.map((project, i) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-4 border border-gray-100/80 dark:border-slate-700/80 rounded-2xl hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all duration-200 bg-white dark:bg-slate-900 group card-lift"
                                    style={{ animation: `slide-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.08}s both` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
                                            project.status === 'healthy' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                project.status === 'at_risk' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        )}>
                                            <FolderKanban className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-slate-50 text-sm">{project.name}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">{project.company_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold tabular-nums">{formatCurrency(project.contract_value)}</p>
                                        <Badge variant={project.status as any} className="capitalize text-[9px] h-5 px-1.5">
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
                <Card className="rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift">
                    <CardContent className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Idle Tasks</h3>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase">Not updated in 48+h</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-primary hover:bg-primary/5 active:scale-90">
                                <Activity className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {idleTasks?.map((task, i) => (
                                <div
                                    key={task.id}
                                    className="p-3.5 bg-red-50/30 dark:bg-red-900/20 border border-red-100/80 dark:border-red-800/30 rounded-2xl hover:bg-red-50/50 dark:hover:bg-red-900/30 transition-all duration-200"
                                    style={{ animation: `slide-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.06}s both` }}
                                >
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate">{task.title}</p>
                                    <div className="flex justify-between items-center mt-2.5">
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{task.assignee_name}</p>
                                        <Badge variant="destructive" className="text-[9px] h-5 px-1.5 font-semibold uppercase">
                                            {task.days_idle}D Idle
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {(!idleTasks || idleTasks.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-10 text-center bg-green-50/30 dark:bg-green-900/20 rounded-2xl border border-dashed border-green-200/80 dark:border-green-800/30">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider">All tasks tracked!</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Items Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                {/* Recent Tasks */}
                <Card className="rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift hover:shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Recent Tasks</h3>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-primary hover:text-primary hover:bg-primary/5 font-semibold rounded-pill">
                                View Board
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {recentTasks?.map((task, i) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3.5 border border-gray-100/80 dark:border-slate-700/80 rounded-2xl hover:border-blue-200/80 dark:hover:border-blue-500/50 transition-all duration-200 bg-white dark:bg-slate-900 group card-lift"
                                    style={{ animation: `slide-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.05}s both` }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125",
                                            task.stage === 'completed' ? 'bg-success' :
                                                task.stage === 'in_progress' ? 'bg-primary' :
                                                    task.stage === 'blockers' ? 'bg-error' : 'bg-slate-300 dark:bg-slate-600'
                                        )} />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate max-w-[200px] group-hover:text-primary transition-colors">
                                                {task.title}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                                                {task.project_name} &bull; {task.assignee_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 font-semibold capitalize h-6">
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
                <Card className="rounded-xl border-gray-200/60 dark:border-slate-700/60 card-lift hover:shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight">Pending Approvals</h3>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/approvals')} className="text-primary hover:text-primary hover:bg-primary/5 font-semibold rounded-pill">
                                View All
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {recentApprovals?.map((approval, i) => (
                                <div
                                    key={approval.id}
                                    className="flex items-center justify-between p-3.5 border border-gray-100/80 dark:border-slate-700/80 rounded-2xl hover:border-purple-200/80 dark:hover:border-purple-500/50 transition-all duration-200 bg-white dark:bg-slate-900 group card-lift"
                                    style={{ animation: `slide-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) ${i * 0.05}s both` }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30 transition-colors duration-200">
                                            <ClipboardCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate max-w-[180px] group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                                {approval.title}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                                                {approval.company_name} &bull; By {approval.requester_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            approval.status === 'approved' ? 'success' :
                                                approval.status === 'pending' ? 'warning' : 'destructive'
                                        }
                                        className="text-[9px] font-semibold capitalize h-6"
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
