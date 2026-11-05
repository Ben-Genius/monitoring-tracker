import { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Coins } from 'lucide-react';
import { formatCurrencyCompact, formatCurrency, cn } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import type { ProjectRow } from '../utils/projectRow';

interface ProjectStatsRibbonProps {
    projects: ProjectRow[];
}

export default function ProjectStatsRibbon({ projects }: ProjectStatsRibbonProps) {
    const stats = useMemo(() => {
        const totalProjects = projects.length;
        const activeProjects = projects.filter((p) => p.status === 'active').length;
        const totalValue = projects.reduce((acc, p) => acc + (Number(p.contract_value) || 0), 0);
        const totalBlocked = projects.reduce((acc, p) => acc + p.blocked_tasks, 0);

        // Average progress across all projects with tasks
        const projectsWithTasks = projects.filter((p) => p.total_tasks > 0);
        const avgProgress =
            projectsWithTasks.length > 0
                ? Math.round(
                      projectsWithTasks.reduce((acc, p) => acc + p.progress, 0) /
                          projectsWithTasks.length
                  )
                : 0;

        // Weighted or average margin
        const projectsWithMargin = projects.filter((p) => p.margin !== null);
        const avgMargin =
            projectsWithMargin.length > 0
                ? projectsWithMargin.reduce((acc, p) => acc + (p.margin ?? 0), 0) /
                  projectsWithMargin.length
                : null;

        return {
            totalProjects,
            activeProjects,
            totalValue,
            totalBlocked,
            avgProgress,
            avgMargin,
        };
    }, [projects]);

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Total Portfolio Contract Value */}
            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className={tx.muted}>Portfolio Value</span>
                    <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-600 dark:text-orange-400">
                        <Coins className="h-4 w-4" aria-hidden />
                    </div>
                </div>
                <div className="mt-2">
                    <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                        {stats.totalValue > 0 ? formatCurrencyCompact(stats.totalValue) : 'GHS 0'}
                    </p>
                    <p className={cn('mt-0.5 text-[11px] font-medium truncate', tx.muted)} title={`Exact total: ${formatCurrency(stats.totalValue)}`}>
                        Across {stats.totalProjects} {stats.totalProjects === 1 ? 'project' : 'projects'}
                    </p>
                </div>
            </div>

            {/* 2. Active Projects */}
            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className={tx.muted}>Active Execution</span>
                    <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
                        <Activity className="h-4 w-4" aria-hidden />
                    </div>
                </div>
                <div className="mt-2">
                    <div className="flex items-baseline justify-between">
                        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                            {stats.activeProjects}
                        </p>
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 tabular-nums">
                            {stats.totalProjects > 0
                                ? `${Math.round((stats.activeProjects / stats.totalProjects) * 100)}%`
                                : '0%'}
                        </span>
                    </div>
                    <p className={cn('mt-0.5 text-[11px] font-medium', tx.muted)}>
                        In active delivery phase
                    </p>
                </div>
            </div>

            {/* 3. Average Execution Progress */}
            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className={tx.muted}>Average Progress</span>
                    <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                    </div>
                </div>
                <div className="mt-2">
                    <div className="flex items-baseline justify-between">
                        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                            {stats.avgProgress}%
                        </p>
                        {stats.avgMargin !== null && (
                            <span
                                className={cn(
                                    'rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
                                    stats.avgMargin >= 15
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : stats.avgMargin < 0
                                            ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                )}
                            >
                                {stats.avgMargin.toFixed(1)}% margin
                            </span>
                        )}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${stats.avgProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 4. Attention & Blockers */}
            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className={tx.muted}>Attention Needed</span>
                    <div
                        className={cn(
                            'rounded-lg p-1.5',
                            stats.totalBlocked > 0
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        )}
                    >
                        <AlertTriangle className="h-4 w-4" aria-hidden />
                    </div>
                </div>
                <div className="mt-2">
                    <div className="flex items-baseline justify-between">
                        <p
                            className={cn(
                                'text-2xl font-bold tracking-tight tabular-nums',
                                stats.totalBlocked > 0 ? 'text-blocked dark:text-red-300' : tx.ink
                            )}
                        >
                            {stats.totalBlocked}
                        </p>
                        <span
                            className={cn(
                                'rounded-md px-1.5 py-0.5 text-xs font-bold',
                                stats.totalBlocked > 0
                                    ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            )}
                        >
                            {stats.totalBlocked === 0 ? 'Healthy' : 'Blocked tasks'}
                        </span>
                    </div>
                    <p className={cn('mt-0.5 text-[11px] font-medium', tx.muted)}>
                        {stats.totalBlocked === 0
                            ? 'No active milestone blockers'
                            : 'Tasks requiring executive intervention'}
                    </p>
                </div>
            </div>
        </div>
    );
}
