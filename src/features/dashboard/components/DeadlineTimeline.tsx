import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { stageDef } from '@/features/tasks/utils/stages';
import { Card, CardHeader } from './primitives';
import { PRIORITY_WEIGHT, tx } from './tokens';

const DAYS_BEFORE = 1;
const DAYS_SHOWN = 5;
const PER_DAY = 4;

/**
 * Open tasks laid out by due day around today: yesterday shows what just
 * slipped, the rest show what is coming. Older overdue work is covered by the
 * Overdue tile and Needs attention, so it is not repeated here.
 */
export default function DeadlineTimeline({ tasks }: { tasks: Task[] }) {
    const navigate = useNavigate();
    const todayMs = startOfDay(new Date()).getTime();
    const days = useMemo(
        () => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(todayMs, i - DAYS_BEFORE)),
        [todayMs]
    );

    const byDay = useMemo(() => {
        const open = tasks.filter(t => t.stage !== 'completed' && t.due_date);
        return days.map(d => open
            .filter(t => isSameDay(parseISO(t.due_date!), d))
            .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]));
    }, [tasks, days]);

    const empty = byDay.every(l => l.length === 0);
    const range = `${format(days[0], 'd MMM')} – ${format(days[days.length - 1], 'd MMM')}`;

    return (
        <Card aria-labelledby="deadlines-heading" className="flex flex-col">
            <CardHeader
                id="deadlines-heading"
                icon={CalendarRange}
                title="Deadlines"
                action={<span className={cn('text-[12.5px] tabular-nums', tx.muted)}>{range}</span>}
            />
            <div className="flex flex-1 flex-col overflow-x-auto px-5 pb-5">
                <div className="grid min-h-[220px] min-w-[520px] flex-1 grid-cols-5">
                    {days.map((d, i) => {
                        const isToday = i === DAYS_BEFORE;
                        const past = i < DAYS_BEFORE;
                        const list = byDay[i];
                        return (
                            <div
                                key={d.toISOString()}
                                className={cn(
                                    'flex flex-col border-dashed border-line dark:border-slate-800',
                                    i > 0 && 'border-l',
                                    isToday && 'rounded-[10px] border-l-0 bg-brand/[0.07] dark:bg-brand/10',
                                    i === DAYS_BEFORE + 1 && 'border-l-0'
                                )}
                            >
                                <p className={cn('flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium tabular-nums', isToday ? 'text-[#B45309] dark:text-orange-300' : tx.muted)}>
                                    {isToday && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />}
                                    {isToday ? 'Today' : format(d, 'EEE d')}
                                </p>
                                <ul className="flex flex-1 flex-col gap-1.5 px-1.5 pb-1.5">
                                    {list.slice(0, PER_DAY).map(t => {
                                        const s = stageDef(t.stage);
                                        return (
                                            <li key={t.id}>
                                                <button
                                                    onClick={() => navigate(`/tasks?task=${t.id}`)}
                                                    title={`${t.title} · ${s.label}${past ? ' · overdue' : ''}`}
                                                    className={cn(
                                                        'flex w-full items-start gap-1.5 rounded-[8px] border bg-surface px-1.5 py-1.5 text-left shadow-[0_1px_0_rgba(23,32,43,0.04)] transition-colors hover:border-ink/25 dark:bg-slate-900',
                                                        past ? 'border-red-200 dark:border-red-500/30' : 'border-line dark:border-slate-700'
                                                    )}
                                                >
                                                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]" style={{ backgroundColor: `${s.accent}1F` }}>
                                                        <s.icon className="h-3 w-3" style={{ color: s.accent }} aria-hidden />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className={cn('line-clamp-2 text-[12px] font-medium leading-[1.3]', tx.ink)}>{t.title}</span>
                                                        {t.project?.name && <span className={cn('mt-0.5 block truncate text-[11px]', tx.faint)}>{t.project.name}</span>}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                    {list.length > PER_DAY && (
                                        <li>
                                            <Link to="/tasks" className={cn('block px-1.5 text-[12px] font-medium hover:underline', tx.muted)}>
                                                +{list.length - PER_DAY} more
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
                {empty && (
                    <p className={cn('mt-3 text-center text-[13px]', tx.muted)}>No open tasks are due between {range}.</p>
                )}
            </div>
        </Card>
    );
}
