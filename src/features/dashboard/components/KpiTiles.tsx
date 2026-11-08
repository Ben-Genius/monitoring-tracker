import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, CalendarClock, CalendarX, CheckCircle2, ListTodo, Minus, type LucideIcon } from 'lucide-react';
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { KebabMenu } from './primitives';
import { tx } from './tokens';

/** Which direction of change is good news for a metric. */
type Tone = 'neutral' | 'upIsGood' | 'upIsBad';

interface Tile {
    label: string;
    value: number;
    icon: LucideIcon;
    /** Tile tint: a soft wash of the colour the metric stands for. */
    tint: string;
    iconColor: string;
    note: string;
    change: Change;
    tone: Tone;
    menu: { label: string; to: string }[];
}

interface Change { now: number; before: number }

const doneAt = (t: Task) => (t.stage === 'completed' ? parseISO(t.completed_at ?? t.updated_at) : null);

/**
 * The same three figures measured at a moment in time. Used for "now" and for
 * "7 days ago", so each tile compares like with like. Rebuilt from created and
 * completed dates; a due date that was edited since cannot be known, so the
 * past figure is a close estimate rather than a stored value.
 */
function snapshot(tasks: Task[], at: Date) {
    const atMs = at.getTime();
    const open = tasks.filter(t => {
        const done = doneAt(t);
        return parseISO(t.created_at).getTime() <= atMs && (!done || done.getTime() > atMs);
    });
    const daysUntilDue = (t: Task) => (t.due_date ? differenceInCalendarDays(parseISO(t.due_date), at) : null);
    return {
        open: open.length,
        overdue: open.filter(t => (daysUntilDue(t) ?? 0) < 0).length,
        dueSoon: open.filter(t => { const d = daysUntilDue(t); return d !== null && d >= 0 && d <= 6; }).length,
    };
}

function computeMetrics(tasks: Task[], now = new Date()) {
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);
    const cur = snapshot(tasks, now);
    const prev = snapshot(tasks, weekAgo);

    // Only a recorded completion date counts as "done this week", the same
    // rule the morning brief uses. The updated_at fallback in doneAt is for
    // the open-at-a-date snapshot only.
    const doneBetween = (from: Date, to: Date) => tasks.filter(t => {
        if (t.stage !== 'completed' || !t.completed_at) return false;
        const d = parseISO(t.completed_at);
        return d > from && d <= to;
    }).length;
    const doneNow = doneBetween(weekAgo, now);
    const donePrev = doneBetween(twoWeeksAgo, weekAgo);

    const open = tasks.filter(t => t.stage !== 'completed');
    const newThisWeek = open.filter(t => parseISO(t.created_at) >= weekAgo).length;
    const oldestLate = open.reduce((m, t) => {
        const d = t.due_date ? differenceInCalendarDays(now, parseISO(t.due_date)) : 0;
        return Math.max(m, d);
    }, 0);
    const dueToday = open.filter(t => t.due_date && differenceInCalendarDays(parseISO(t.due_date), now) === 0).length;

    return { cur, prev, doneNow, donePrev, newThisWeek, oldestLate, dueToday };
}

export default function KpiTiles({ tasks, isLoading, briefTo }: { tasks: Task[]; isLoading: boolean; briefTo?: string }) {
    const m = useMemo(() => computeMetrics(tasks), [tasks]);
    const board = { label: 'View on task board', to: '/tasks' };

    const tiles: Tile[] = [
        {
            label: 'Open tasks', value: m.cur.open, icon: ListTodo,
            tint: 'bg-[#EEF3FC] dark:bg-blue-500/10', iconColor: '#1F5FD1', tone: 'neutral',
            note: m.newThisWeek ? `${m.newThisWeek} added in the last 7 days` : 'Nothing new in the last 7 days',
            change: { now: m.cur.open, before: m.prev.open },
            menu: [board, { label: 'Open analytics', to: '/analytics' }],
        },
        {
            label: 'Overdue', value: m.cur.overdue, icon: CalendarX,
            tint: 'bg-[#FDF5E7] dark:bg-amber-500/10', iconColor: '#B45309', tone: 'upIsBad',
            note: m.cur.overdue ? `Oldest is ${m.oldestLate} day${m.oldestLate === 1 ? '' : 's'} late` : 'Everything is on schedule',
            change: { now: m.cur.overdue, before: m.prev.overdue },
            menu: briefTo ? [board, { label: 'Open the morning brief', to: briefTo }] : [board, { label: 'Open analytics', to: '/analytics' }],
        },
        {
            label: 'Due this week', value: m.cur.dueSoon, icon: CalendarClock,
            tint: 'bg-[#E9F5F7] dark:bg-cyan-500/10', iconColor: '#0E7490', tone: 'neutral',
            note: m.dueToday ? `${m.dueToday} due today` : 'Nothing due today',
            change: { now: m.cur.dueSoon, before: m.prev.dueSoon },
            menu: [board, { label: 'Open analytics', to: '/analytics' }],
        },
        {
            label: 'Done this week', value: m.doneNow, icon: CheckCircle2,
            tint: 'bg-[#EBF6F0] dark:bg-emerald-500/10', iconColor: '#1F7A4D', tone: 'upIsGood',
            note: `${m.donePrev} done the week before`,
            change: { now: m.doneNow, before: m.donePrev },
            menu: [board, { label: 'Open analytics', to: '/analytics' }],
        },
    ];

    return (
        <ul className="grid flex-1 auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3" aria-label="Task summary">
            {tiles.map(t => (
                <li key={t.label} className="relative min-w-0">
                    <Link
                        to="/tasks"
                        className={cn('group flex h-full flex-col rounded-[12px] p-4 transition-shadow hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress sm:p-5', t.tint)}
                    >
                        <span className={cn('flex items-center gap-2 pr-7 text-[13px] font-semibold sm:text-sm', tx.ink)}>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-surface shadow-sm dark:bg-slate-900">
                                <t.icon className="h-3.5 w-3.5" style={{ color: t.iconColor }} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 leading-tight">{t.label}</span>
                        </span>
                        <span className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            {isLoading
                                ? <Skeleton className="h-8 w-12" />
                                : <span className={cn('text-[30px] font-bold leading-none tabular-nums tracking-tight', tx.ink)}>{t.value}</span>}
                            {!isLoading && <ChangeChip change={t.change} tone={t.tone} />}
                        </span>
                        <span className={cn('mt-auto pt-2 text-[12.5px] leading-snug', tx.muted)}>{t.note}</span>
                    </Link>
                    <KebabMenu label={`${t.label} options`} items={t.menu} className="absolute right-2.5 top-3 sm:right-3.5 sm:top-4" />
                </li>
            ))}
        </ul>
    );
}

const TONE_COLOR: Record<'good' | 'bad' | 'neutral', string> = {
    good: 'text-done dark:text-emerald-300',
    bad: 'text-blocked dark:text-red-300',
    neutral: 'text-progress dark:text-blue-300',
};

/** "↗ 20%" next to the figure. Percent against 7 days ago; a count when there was nothing to compare to. */
function ChangeChip({ change, tone }: { change: Change; tone: Tone }) {
    const diff = change.now - change.before;
    const up = diff > 0;
    const flat = diff === 0;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    const text = flat ? '0%' : change.before > 0 ? `${Math.abs(Math.round((diff / change.before) * 100))}%` : `+${diff}`;

    const good = tone === 'upIsGood' ? up : tone === 'upIsBad' ? !up : null;
    const color = flat || good === null ? TONE_COLOR.neutral : good ? TONE_COLOR.good : TONE_COLOR.bad;
    const word = flat ? 'No change' : `${up ? 'Up' : 'Down'} ${Math.abs(diff)}`;

    return (
        <span
            className={cn('inline-flex items-center gap-0.5 rounded-[6px] bg-surface px-1.5 py-0.5 text-[12px] font-semibold tabular-nums dark:bg-slate-900', color)}
            title={`${word} on 7 days ago (was ${change.before})`}
        >
            <Icon className="h-3 w-3" aria-hidden />
            {text}
            <span className="sr-only"> {word} on 7 days ago</span>
        </span>
    );
}
