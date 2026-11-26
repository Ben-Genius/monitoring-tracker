import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { lazy, Suspense, useMemo } from 'react';

// recharts is about 400 KB. Loading it separately lets the page, its figures
// and its data requests start straight away while the charts arrive.
const charts = () => import('../components/AnalyticsCharts');
const StageDonut = lazy(() => charts().then(m => ({ default: m.StageDonut })));
const RevenueBars = lazy(() => charts().then(m => ({ default: m.RevenueBars })));
const TrendLines = lazy(() => charts().then(m => ({ default: m.TrendLines })));

function ChartFallback() {
    return <Skeleton className="h-[280px] w-full rounded-xl" />;
}
import {
    BarChart3,
    TrendingUp,
    CheckCircle2,
    Trophy,
    Sparkles,
    Coins,
    Layers,
    Calendar,
} from 'lucide-react';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import {
    getCompanyTheme,
    formatCurrency,
    formatCurrencyCompact,
    cn,
    DEFAULT_BRAND_COLOR
} from '@/lib/utils';
import { useTaskDistribution } from '@/features/dashboard/hooks/useDashboard';
import {
    useCompanyPerformance,
    useMonthlyTrend,
    useTopPerformers
} from '../hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

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
    const primaryColor = theme.primary || DEFAULT_BRAND_COLOR;

    const isLoading = taskLoading || companyLoading || trendLoading || performersLoading;

    // Total tasks in the distribution pipeline
    const totalPipelineTasks = useMemo(() => {
        return taskStageData.reduce((acc, curr) => acc + (curr.value || 0), 0);
    }, [taskStageData]);

    // High level KPI calculations
    const kpis = useMemo(() => {
        const totalRevenue = companyPerformance.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        const totalProfit = companyPerformance.reduce((acc, curr) => acc + (curr.profit || 0), 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const totalTasksDelivered = monthlyTrend.reduce((acc, curr) => acc + (curr.tasks || 0), 0);
        const avgOnTime = topPerformers.length > 0
            ? Math.round(topPerformers.reduce((acc, curr) => acc + (curr.onTimeRate || 0), 0) / topPerformers.length)
            : 0;

        return {
            totalRevenue,
            totalProfit,
            profitMargin,
            totalTasksDelivered,
            avgOnTime
        };
    }, [companyPerformance, monthlyTrend, topPerformers]);

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
                <div>
                    <Skeleton className="h-8 w-56 mb-2" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>

                {/* KPI Ribbon Skeletons */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-[14px] border border-line p-4 dark:border-slate-800">
                            <Skeleton className="h-4 w-28 mb-3" />
                            <Skeleton className="h-7 w-36 mb-2" />
                            <Skeleton className="h-3.5 w-20" />
                        </div>
                    ))}
                </div>

                {/* Charts Skeletons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-[14px] border border-line p-5 dark:border-slate-800 h-[380px]">
                        <Skeleton className="h-5 w-44 mb-4" />
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                    </div>
                    <div className="rounded-[14px] border border-line p-5 dark:border-slate-800 h-[380px]">
                        <Skeleton className="h-5 w-44 mb-4" />
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                    </div>
                    <div className="lg:col-span-2 rounded-[14px] border border-line p-5 dark:border-slate-800 h-[380px]">
                        <Skeleton className="h-5 w-52 mb-4" />
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
            {/* Page Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                        <BarChart3 className="h-6 w-6" aria-hidden />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Analytics & Performance
                            </h1>
                            <Badge
                                variant="outline"
                                className="text-xs font-semibold px-2.5 py-0.5 border"
                                style={{
                                    color: primaryColor,
                                    borderColor: `${primaryColor}40`,
                                    backgroundColor: `${primaryColor}10`
                                }}
                            >
                                {currentCompanyName}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Executive visibility into financial realization, delivery velocity, and operational performance.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        <span>Last 6 Months</span>
                    </span>
                </div>
            </header>

            {/* KPI Summary Ribbon */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Realized Revenue */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Tracked Revenue</span>
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            <Coins className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                            {formatCurrencyCompact(kpis.totalRevenue)}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate" title={`Exact: ${formatCurrency(kpis.totalRevenue)}`}>
                            Across active contracts
                        </p>
                    </div>
                </div>

                {/* 2. Realized Net Profit */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Net Profit</span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                                {formatCurrencyCompact(kpis.totalProfit)}
                            </p>
                            <span className={cn(
                                "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md",
                                kpis.profitMargin >= 15
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : kpis.profitMargin < 0
                                        ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            )}>
                                {kpis.profitMargin.toFixed(1)}% margin
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate" title={`Exact: ${formatCurrency(kpis.totalProfit)}`}>
                            Revenue minus actual costs
                        </p>
                    </div>
                </div>

                {/* 3. Delivered Milestones */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Delivered Milestones</span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                            {kpis.totalTasksDelivered}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            Completed task milestones
                        </p>
                    </div>
                </div>

                {/* 4. Team Delivery Velocity */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Delivery Velocity</span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
                                {kpis.avgOnTime}%
                            </p>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                On-Time
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            Average on-time performance
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Task Stage Distribution (Donut with center label) */}
                <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="border-b border-line dark:border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Task Stage Distribution
                                </CardTitle>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Active Pipeline</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {taskStageData.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                                No task distribution data available.
                            </div>
                        ) : (
                            <div className="relative">
                                <Suspense fallback={<ChartFallback />}><StageDonut data={taskStageData} primaryColor={primaryColor} /></Suspense>
                                {/* Donut Center Metric */}
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
                                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                        {totalPipelineTasks}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        Total Tasks
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Financial Realization by Company */}
                <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="border-b border-line dark:border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Financial Realization
                                </CardTitle>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Revenue vs Profit</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {companyPerformance.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                                No company performance data recorded.
                            </div>
                        ) : (
                            <Suspense fallback={<ChartFallback />}><RevenueBars data={companyPerformance} primaryColor={primaryColor} /></Suspense>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Momentum & Delivery Trends */}
                <Card className="lg:col-span-2 rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="border-b border-line dark:border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Momentum & Revenue Delivery
                                </CardTitle>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">6-Month Trend</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {monthlyTrend.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                                No monthly trend data found.
                            </div>
                        ) : (
                            <Suspense fallback={<ChartFallback />}><TrendLines data={monthlyTrend} primaryColor={primaryColor} /></Suspense>
                        )}
                    </CardContent>
                </Card>

                {/* 4. Execution Leaders / Top Performers */}
                <Card className="lg:col-span-2 rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="border-b border-line dark:border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Execution Leaders
                                </CardTitle>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Ranked by on-time completion</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-line dark:divide-slate-800">
                            {topPerformers.length === 0 ? (
                                <p className="text-center text-slate-400 py-12 text-sm font-medium">
                                    No completion milestones recorded yet.
                                </p>
                            ) : (
                                topPerformers.map((performer, index) => {
                                    const isTop = index === 0;
                                    const isRunnerUp = index === 1;
                                    const isThird = index === 2;

                                    return (
                                        <div
                                            key={performer.name}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-paper/70 dark:hover:bg-slate-800/40 transition-colors gap-3"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                {/* Rank Badge */}
                                                <div
                                                    className={cn(
                                                        "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
                                                        isTop
                                                            ? "bg-amber-500 text-white"
                                                            : isRunnerUp
                                                                ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                                                : isThird
                                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                                    : "border border-line bg-surface text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                                    )}
                                                >
                                                    {isTop ? <Trophy className="h-4 w-4" aria-hidden /> : `#${index + 1}`}
                                                </div>

                                                {/* Avatar with Initials */}
                                                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0 border border-line dark:border-slate-700">
                                                    {getInitials(performer.name)}
                                                </div>

                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                                        {performer.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                                            {performer.tasksCompleted}
                                                        </span> milestones delivered
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Velocity Metric & Bar */}
                                            <div className="flex items-center justify-between sm:justify-end gap-6 pl-12 sm:pl-0">
                                                <div className="text-left sm:text-right">
                                                    <div className="flex items-center sm:justify-end gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            On-Time
                                                        </span>
                                                        <span className={cn(
                                                            "text-sm font-bold tabular-nums",
                                                            performer.onTimeRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"
                                                        )}>
                                                            {performer.onTimeRate}%
                                                        </span>
                                                    </div>
                                                    <div className="w-24 h-1.5 bg-line dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-500",
                                                                performer.onTimeRate >= 80 ? "bg-emerald-500" : "bg-amber-500"
                                                            )}
                                                            style={{ width: `${Math.min(performer.onTimeRate, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <Badge
                                                    variant="secondary"
                                                    className="font-semibold text-[11px] px-2.5 py-0.5 border-none shadow-none"
                                                    style={{
                                                        backgroundColor: `${primaryColor}15`,
                                                        color: primaryColor
                                                    }}
                                                >
                                                    {isTop ? 'Star Performer' : 'High Performer'}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
