import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Ban, CalendarX, CheckCircle2, ListTodo, type LucideIcon } from 'lucide-react';
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { tx } from './tokens';

interface Tile {
    label: string;
    value: number;
    icon: LucideIcon;
    /** Tile tint: a soft wash of the status colour it stands for. */
    tint: string;
    iconColor: string;
    note: string;
    delta?: number | null;
}

function computeTaskMetrics(tasks: Task[], now = new Date()) {
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);
    const open = tasks.filter(t => t.stage !== 'completed');
    const overdue = open.filter(t => t.due_date && differenceInCalendarDays(now, parseISO(t.due_date)) > 0);
    const blocked = open.filter(t => t.stage === 'blockers');
    const doneAt = (t: Task) => (t.completed_at ? parseISO(t.completed_at) : null);
    const doneThisWeek = tasks.filter(t => t.stage === 'completed' && (doneAt(t) ?? 0) >= weekAgo).length;
    const doneLastWeek = tasks.filter(t => {
        const d = doneAt(t);
        return t.stage === 'completed' && d && d >= twoWeeksAgo && d < weekAgo;
    }).length;
    const newThisWeek = open.filter(t => parseISO(t.created_at) >= weekAgo).length;
    const oldestLate = overdue.reduce((m, t) => Math.max(m, differenceInCalendarDays(now, parseISO(t.due_date!))), 0);
    const blockedProjects = new Set(blocked.map(t => t.project_id).filter(Boolean)).size;

    return {
        open: open.length,
        overdue: overdue.length,
        blocked: blocked.length,
        doneThisWeek,
        doneLastWeek,
        newThisWeek,
        oldestLate,
        blockedProjects,
        // No baseline means no honest percentage, so show none.
        doneDelta: doneLastWeek > 0 ? Math.round(((doneThisWeek - doneLastWeek) / doneLastWeek) * 100) : null,
    };
}

export default function KpiTiles({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
    const m = useMemo(() => computeTaskMetrics(tasks), [tasks]);

    const tiles: Tile[] = [
        {
            label: 'Open tasks', value: m.open, icon: ListTodo,
            tint: 'bg-[#EEF3FC] dark:bg-blue-500/10', iconColor: '#1F5FD1',
            note: m.newThisWeek ? `${m.newThisWeek} added in the last 7 days` : 'Nothing new in the last 7 days',
        },
        {
            label: 'Overdue', value: m.overdue, icon: CalendarX,
            tint: 'bg-[#FDF5E7] dark:bg-amber-500/10', iconColor: '#B45309',
            note: m.overdue ? `Oldest is ${m.oldestLate} day${m.oldestLate === 1 ? '' : 's'} late` : 'Everything is on schedule',
        },
        {
            label: 'Blocked', value: m.blocked, icon: Ban,
            tint: 'bg-[#FCEFEC] dark:bg-red-500/10', iconColor: '#B83A24',
            note: m.blocked ? `Across ${m.blockedProjects} project${m.blockedProjects === 1 ? '' : 's'}` : 'No work is stopped',
        },
        {
            label: 'Done this week', value: m.doneThisWeek, icon: CheckCircle2,
            tint: 'bg-[#EBF6F0] dark:bg-emerald-500/10', iconColor: '#1F7A4D',
            note: `${m.doneLastWeek} the week before`, delta: m.doneDelta,
        },
    ];

    return (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="Task summary">
            {tiles.map(t => (
                <li key={t.label}>
                    <Link
                        to="/tasks"
                        className={cn('group flex h-full flex-col rounded-[12px] p-4 transition-shadow hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress sm:p-5', t.tint)}
                    >
                        <span className={cn('flex items-center gap-2 text-[13px] font-semibold sm:text-sm', tx.ink)}>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-surface shadow-sm dark:bg-slate-900">
                                <t.icon className="h-3.5 w-3.5" style={{ color: t.iconColor }} aria-hidden />
                            </span>
                            {t.label}
                        </span>
                        <span className="mt-4 flex items-baseline gap-2">
                            {isLoading
                                ? <Skeleton className="h-8 w-12" />
                                : <span className={cn('text-[30px] font-bold leading-none tabular-nums tracking-tight', tx.ink)}>{t.value}</span>}
                            {t.delta != null && !isLoading && <Delta value={t.delta} />}
                        </span>
                        <span className={cn('mt-2 text-[12.5px] leading-snug', tx.muted)}>{t.note}</span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function Delta({ value }: { value: number }) {
    const up = value >= 0;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
                up ? 'bg-surface text-done dark:bg-slate-900 dark:text-emerald-300' : 'bg-surface text-blocked dark:bg-slate-900 dark:text-red-300'
            )}
            aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(value)}% on the week before`}
        >
            <Icon className="h-3 w-3" aria-hidden /> {Math.abs(value)}%
        </span>
    );
}
