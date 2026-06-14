import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import { useMemo } from 'react';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { getCompanyTheme } from '@/lib/utils';

import { useTaskDistribution } from '@/features/dashboard/hooks/useDashboard';
import {
    useCompanyPerformance,
    useMonthlyTrend,
    useTopPerformers
} from '../hooks/useAnalytics';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: taskStageData = [], isLoading: taskLoading } = useTaskDistribution();
    const { data: companyPerformance = [], isLoading: companyLoading } = useCompanyPerformance();
    const { data: monthlyTrend = [], isLoading: trendLoading } = useMonthlyTrend();
    const { data: topPerformers = [], isLoading: performersLoading } = useTopPerformers();

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    const isLoading = taskLoading || companyLoading || trendLoading || performersLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-slate-200/60 shadow-sm">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                            <Skeleton className="h-6 w-48" />
                        </CardHeader>
                        <CardContent className="pt-6 h-[300px]">
                            <Skeleton className="h-full w-full rounded-full" />
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200/60 shadow-sm">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                            <Skeleton className="h-6 w-48" />
                        </CardHeader>
                        <CardContent className="pt-6 h-[300px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2 border-slate-200/60 shadow-md">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                            <Skeleton className="h-6 w-64" />
                        </CardHeader>
                        <CardContent className="pt-6 h-[300px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
                <p className="text-slate-500 mt-1 font-medium italic">
                    Comprehensive insights into performance and productivity for {currentCompanyName}
                </p>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Stage Distribution */}
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-lg font-bold">Task Stage Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={taskStageData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {taskStageData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name.toLowerCase() === 'active' || entry.name.toLowerCase() === 'in progress' ? theme.primary : entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Company Performance */}
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-lg font-bold">Financial Realization</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={companyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="company" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill={theme.primary} radius={[4, 4, 0, 0]} name="Revenue" />
                                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="lg:col-span-2 border-slate-200/60 shadow-md overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-lg font-bold">Momentum & Revenue Growth</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tasks"
                                    stroke={theme.primary}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: theme.primary, strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Tasks Completed"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Revenue"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="lg:col-span-2 border-slate-200/60overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-lg font-bold">Execution Leaders</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {topPerformers.length === 0 ? (
                                <p className="text-center text-slate-500 py-16 font-bold">No completion data available yet.</p>
                            ) : (
                                topPerformers.map((performer, index) => (
                                    <div
                                        key={performer.name}
                                        className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors group"
                                    >
                                        <div className="flex items-center space-x-5">
                                            <div
                                                className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: index === 0 ? theme.primary : `${theme.primary}15`, color: index === 0 ? '#fff' : theme.primary }}
                                            >
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-lg tracking-tight">
                                                    {performer.name}
                                                </p>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {performer.tasksCompleted} Milestones Delivered
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">On-Time Velocity</p>
                                                <p className="text-2xl font-black text-green-600 tabular-nums">
                                                    {performer.onTimeRate}%
                                                </p>
                                            </div>
                                            <Badge
                                                className="h-8 px-4 font-black uppercase text-[10px] tracking-tighter"
                                                style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
                                            >
                                                High Performer
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
