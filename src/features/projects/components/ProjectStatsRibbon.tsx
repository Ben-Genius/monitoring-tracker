import { useMemo } from 'react';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import type { ProjectRow } from '../utils/projectRow';

interface Figure {
    label: string;
    value: string;
    note: string;
    alert?: boolean;
    muted?: boolean;
    title?: string;
}

/**
 * Portfolio totals for every project in scope, regardless of the tab or search below.
 * Counts already shown elsewhere (project totals, tab counts) are deliberately left out.
 */
export default function ProjectStatsRibbon({ projects }: { projects: ProjectRow[] }) {
    const figures = useMemo<Figure[]>(() => {
        const value = projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);
        const unvalued = projects.filter(p => !(Number(p.contract_value) > 0)).length;

        // Margin only from projects with a recorded cost, weighted by contract value,
        // and labelled with how much of the portfolio it actually covers.
        const costed = projects.filter(p => p.margin !== null);
        const costedValue = costed.reduce((s, p) => s + Number(p.contract_value), 0);
        const costedCost = costed.reduce((s, p) => s + Number(p.actual_cost), 0);
        const margin = costedValue > 0 ? ((costedValue - costedCost) / costedValue) * 100 : null;
        const coverage = value > 0 ? Math.round((costedValue / value) * 100) : 0;

        // Progress counts tasks, so a one-task project does not weigh as much as an eighty-task one.
        const doneTasks = projects.reduce((s, p) => s + p.done_tasks, 0);
        const allTasks = projects.reduce((s, p) => s + p.total_tasks, 0);

        const blocked = projects.reduce((s, p) => s + p.blocked_tasks, 0);
        const blockedProjects = projects.filter(p => p.blocked_tasks > 0).length;

        return [
            {
                label: 'Contract value',
                value: value > 0 ? formatCurrencyCompact(value) : 'Not set',
                note: unvalued ? `${unvalued} ${unvalued === 1 ? 'project has' : 'projects have'} no value yet` : 'Every project has a value',
                title: value > 0 ? `Exact total: ${formatCurrency(value)}` : undefined,
                muted: value === 0,
            },
            {
                label: 'Margin',
                value: margin === null ? 'No costs yet' : `${margin.toFixed(1)}%`,
                note: margin === null
                    ? 'No project has a cost recorded'
                    : `Based on ${costed.length} of ${projects.length} projects (${coverage}% of value) with costs`,
                alert: margin !== null && margin < 0,
                muted: margin === null,
            },
            {
                label: 'Tasks done',
                value: allTasks ? `${Math.round((doneTasks / allTasks) * 100)}%` : 'No tasks',
                note: allTasks ? `${doneTasks.toLocaleString('en-GB')} of ${allTasks.toLocaleString('en-GB')} tasks` : 'No tasks have been added',
                muted: allTasks === 0,
            },
            {
                label: 'Blocked',
                value: String(blocked),
                note: blocked
                    ? `${blocked === 1 ? 'Task' : 'Tasks'} in ${blockedProjects} ${blockedProjects === 1 ? 'project' : 'projects'}`
                    : 'Nothing is blocked',
                alert: blocked > 0,
            },
        ];
    }, [projects]);

    return (
        <section aria-label="Portfolio summary" className="rounded-[14px] border border-line bg-surface dark:border-slate-800 dark:bg-slate-900">
            <dl className="grid grid-cols-2 lg:grid-cols-4">
                {figures.map((f, i) => (
                    <div
                        key={f.label}
                        className={cn(
                            'min-w-0 border-line px-4 py-4 dark:border-slate-800 sm:px-5',
                            i % 2 === 1 && 'border-l',
                            i >= 2 && 'border-t lg:border-t-0',
                            i === 2 && 'lg:border-l'
                        )}
                    >
                        <dt className={cn('text-[13px] font-medium', tx.muted)}>{f.label}</dt>
                        <dd
                            className={cn(
                                'mt-1.5 text-[22px] font-bold leading-none tabular-nums tracking-tight sm:text-[26px]',
                                f.alert ? 'text-blocked dark:text-red-300' : f.muted ? cn('text-[18px] font-semibold', tx.muted) : tx.ink
                            )}
                            title={f.title}
                        >
                            {f.value}
                        </dd>
                        <dd className={cn('mt-1.5 text-[12.5px] leading-snug', tx.muted)}>{f.note}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
