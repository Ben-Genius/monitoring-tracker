import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { dayKey, dayLabel, today, type DayKey } from '../utils/days';
import { taskDue, taskStatusWords, taskTone, type Tone } from '../utils/taskDates';

/**
 * Tasks by deadline, one month at a time. Weeks start on Monday.
 *
 * Desktop: a month grid; drag a task to another day to move its deadline
 * (when the person may edit it). Keyboard users change the deadline in the
 * task panel, which every task here opens. Phone: the same month as a list
 * of days, since seven columns don't fit.
 */

const SHOWN_PER_DAY = 3;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toneClass: Record<Tone, string> = {
    neutral: 'border-line bg-surface text-ink hover:border-ink/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
    attention: 'border-blocked/40 bg-surface text-ink hover:border-blocked shadow-[inset_3px_0_0_#B83A24] dark:shadow-[inset_3px_0_0_#F08A73] dark:border-red-400/40 dark:bg-slate-900 dark:text-slate-100',
    done: 'border-transparent bg-paper text-ink-muted line-through hover:text-ink dark:bg-slate-800/60 dark:text-slate-400',
};

function Chip({ task, onOpen, draggable }: { task: Task; onOpen: (id: string) => void; draggable: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: task, disabled: !draggable });
    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={() => onOpen(task.id)}
            {...(draggable ? listeners : {})}
            {...(draggable ? { 'aria-roledescription': attributes['aria-roledescription'] } : {})}
            aria-label={`${task.title}, ${taskStatusWords(task)}`}
            className={cn(
                'block w-full truncate rounded-[6px] border px-1.5 py-1 text-left text-[12px] font-medium leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                toneClass[taskTone(task)],
                draggable && 'cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-40',
            )}
        >
            {task.title}
        </button>
    );
}

function DayCell({ day, inMonth, tasks, onOpen, canReschedule, expanded, onExpand }: {
    day: Date; inMonth: boolean; tasks: Task[]; onOpen: (id: string) => void; canReschedule: (t: Task) => boolean;
    expanded: boolean; onExpand: () => void;
}) {
    const key = dayKey(day);
    const { setNodeRef, isOver } = useDroppable({ id: key });
    const isToday = key === dayKey(today());
    const shown = expanded ? tasks : tasks.slice(0, SHOWN_PER_DAY);
    return (
        <li ref={setNodeRef} aria-label={`${format(day, 'EEEE d MMMM')}${tasks.length ? `, ${tasks.length} due` : ''}`}
            className={cn(
                'flex min-h-[112px] min-w-0 flex-col gap-1 border-b border-r border-line p-1.5 dark:border-slate-800',
                !inMonth && 'bg-paper/60 dark:bg-slate-950/40',
                isOver && 'bg-progress/5 outline outline-2 -outline-offset-2 outline-progress',
            )}>
            <span className={cn(
                'self-start rounded-full px-1.5 text-[12px] font-semibold tabular-nums',
                isToday ? 'bg-ink text-white dark:bg-white dark:text-ink' : inMonth ? 'text-ink dark:text-slate-200' : 'text-ink-faint dark:text-slate-500',
            )}>
                {format(day, 'd')}
            </span>
            {shown.map(t => <Chip key={t.id} task={t} onOpen={onOpen} draggable={canReschedule(t)} />)}
            {!expanded && tasks.length > SHOWN_PER_DAY && (
                <button type="button" onClick={onExpand}
                    className="self-start rounded px-1 text-[12px] font-semibold text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-400">
                    +{tasks.length - SHOWN_PER_DAY} more
                </button>
            )}
        </li>
    );
}

export default function TaskCalendar({ tasks, onOpen, canReschedule, onReschedule }: {
    tasks: Task[];
    onOpen: (id: string) => void;
    canReschedule: (t: Task) => boolean;
    onReschedule: (t: Task, day: DayKey) => void;
}) {
    const [month, setMonth] = useState(() => startOfMonth(new Date()));
    const [expanded, setExpanded] = useState<Set<DayKey>>(new Set());
    const [dragging, setDragging] = useState<Task | null>(null);
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    );

    const days = useMemo(() => eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    }), [month]);

    const { byDay, undated } = useMemo(() => {
        const map = new Map<DayKey, Task[]>();
        let none = 0;
        for (const t of tasks) {
            const due = taskDue(t);
            if (!due) { if (t.stage !== 'completed') none++; continue; }
            const k = dayKey(due);
            map.set(k, [...(map.get(k) ?? []), t]);
        }
        // Within a day: what needs attention first, finished work last.
        const order: Record<Tone, number> = { attention: 0, neutral: 1, done: 2 };
        map.forEach(list => list.sort((a, b) => order[taskTone(a)] - order[taskTone(b)] || a.title.localeCompare(b.title)));
        return { byDay: map, undated: none };
    }, [tasks]);

    const monthDays = days.filter(d => isSameMonth(d, month));
    const dueThisMonth = monthDays.reduce((n, d) => n + (byDay.get(dayKey(d))?.length ?? 0), 0);

    const onDragEnd = (e: DragEndEvent) => {
        setDragging(null);
        const task = e.active.data.current as Task | undefined;
        const target = e.over?.id as DayKey | undefined;
        if (task && target && target !== task.due_date) onReschedule(task, target);
    };

    return (
        <section aria-label="Calendar" className="flex h-full flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-ink dark:text-slate-100" aria-live="polite">{format(month, 'MMMM yyyy')}</h2>
                <span className="text-sm text-ink-muted dark:text-slate-400">{dueThisMonth} due</span>
                <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => setMonth(m => addMonths(m, -1))} aria-label="Previous month"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-surface text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setMonth(startOfMonth(new Date()))}
                        className="inline-flex h-9 items-center rounded-[8px] border border-line bg-surface px-3 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        Today
                    </button>
                    <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} aria-label="Next month"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-surface text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            </div>

            {/* Desktop and tablet: month grid */}
            <DndContext sensors={sensors} onDragStart={e => setDragging(e.active.data.current as Task)} onDragCancel={() => setDragging(null)} onDragEnd={onDragEnd}>
                <div className="hidden overflow-hidden rounded-[12px] border-l border-t border-line bg-surface shadow-card md:block dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <div className="grid grid-cols-7 border-b border-r border-line dark:border-slate-800" aria-hidden>
                        {WEEKDAYS.map(d => <div key={d} className="px-2 py-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">{d}</div>)}
                    </div>
                    <ol className="grid grid-cols-7">
                        {days.map(d => {
                            const k = dayKey(d);
                            return (
                                <DayCell key={k} day={d} inMonth={isSameMonth(d, month)} tasks={byDay.get(k) ?? []} onOpen={onOpen}
                                    canReschedule={canReschedule} expanded={expanded.has(k)}
                                    onExpand={() => setExpanded(s => new Set(s).add(k))} />
                            );
                        })}
                    </ol>
                </div>
                <DragOverlay dropAnimation={null}>
                    {dragging && (
                        <div className="w-44 truncate rounded-[6px] border border-ink bg-surface px-1.5 py-1 text-[12px] font-medium text-ink shadow-lg dark:bg-slate-900 dark:text-slate-100">
                            {dragging.title}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Phone: the month as a list of days that have something due */}
            <ol className="space-y-3 md:hidden">
                {monthDays.filter(d => byDay.has(dayKey(d))).map(d => {
                    const k = dayKey(d);
                    const isToday = k === dayKey(today());
                    return (
                        <li key={k} className="rounded-[12px] border border-line bg-surface p-3 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                            <h3 className={cn('mb-2 text-[13px] font-bold uppercase tracking-wide', isToday ? 'text-ink dark:text-slate-100' : 'text-ink-muted dark:text-slate-400')}>
                                {isToday ? 'Today · ' : ''}{format(d, 'EEEE d MMM')}
                            </h3>
                            <div className="space-y-1.5">
                                {byDay.get(k)!.map(t => (
                                    <button key={t.id} type="button" onClick={() => onOpen(t.id)} aria-label={`${t.title}, ${taskStatusWords(t)}`}
                                        className={cn('flex min-h-11 w-full items-center rounded-[8px] border px-3 text-left text-[15px] font-medium', toneClass[taskTone(t)])}>
                                        <span className="truncate">{t.title}</span>
                                    </button>
                                ))}
                            </div>
                        </li>
                    );
                })}
                {dueThisMonth === 0 && (
                    <li className="rounded-[12px] border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted dark:border-slate-700 dark:text-slate-400">
                        Nothing due in {format(month, 'MMMM')}.
                    </li>
                )}
            </ol>

            {undated > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-ink-muted dark:text-slate-400">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {undated} open {undated === 1 ? 'task has' : 'tasks have'} no deadline, so {undated === 1 ? 'it isn’t' : 'they aren’t'} shown. Set one in the task to place it here.
                </p>
            )}
            <p className="sr-only">Today is {dayLabel(today())}.</p>
        </section>
    );
}
