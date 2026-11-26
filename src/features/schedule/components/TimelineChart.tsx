import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { eachDayOfInterval, format, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, dayLabel, daysBetween, today } from '../utils/days';
import type { Tone } from '../utils/taskDates';

/**
 * A horizontal timeline (Gantt-style) shared by tasks and projects.
 *
 * Each row is a bar from start to end, with optional progress fill and
 * milestone markers. Labels stay pinned on the left while the dates scroll.
 * Every bar is a button with a full spoken description, in normal tab order.
 */

export interface TimelineMark { date: Date; label: string; done: boolean; late: boolean }
export interface TimelineRow {
    id: string;
    label: string;
    sublabel?: string;
    start: Date;
    end: Date;
    tone: Tone;
    progress?: number;
    marks?: TimelineMark[];
    describe: string;
    onOpen: () => void;
}
export interface TimelineGroup { id: string; label: string; rows: TimelineRow[] }
/**
 * A dependency: `to` waits on `from`. Drawn from the end of `from`'s bar to
 * the start of `to`'s. `conflict` (red): `to` starts before `from` is due.
 * `settled` (faint): `from` is already done.
 */
export interface TimelineLink { from: string; to: string; conflict: boolean; settled: boolean }

type Scale = 'weeks' | 'months';
const PX_PER_DAY: Record<Scale, number> = { weeks: 28, months: 7 };
const ROW_H = 40;
const HEADER_H = 48; // the date header (h-12)
const GROUP_H = 32;  // a group's label row (h-8)
const BAR_MID = 20;  // bars sit at top-2 with h-6

const barTone: Record<Tone, string> = {
    neutral: 'bg-ink/10 border-ink/25 dark:bg-slate-100/10 dark:border-slate-400/40',
    attention: 'bg-blocked/10 border-blocked/60 dark:bg-red-400/10 dark:border-red-400/60',
    done: 'bg-paper border-line dark:bg-slate-800 dark:border-slate-700',
};
// Light enough that the label on top stays readable (the bar keeps a solid edge).
const fillTone: Record<Tone, string> = {
    neutral: 'bg-progress/25 dark:bg-progress/40',
    attention: 'bg-blocked/25 dark:bg-red-400/30',
    done: 'bg-ink-faint/20',
};

export default function TimelineChart({ groups, emptyText, footnote, links = [] }: {
    groups: TimelineGroup[];
    emptyText: string;
    footnote?: string;
    links?: TimelineLink[];
}) {
    const [scale, setScale] = useState<Scale>('weeks');
    const scroller = useRef<HTMLDivElement>(null);
    const px = PX_PER_DAY[scale];
    const rows = groups.flatMap(g => g.rows);

    // The visible range: everything shown, plus a little air, and always today.
    const range = useMemo(() => {
        const t = today();
        let min = t, max = t;
        for (const r of rows) {
            if (r.start < min) min = r.start;
            if (r.end > max) max = r.end;
            r.marks?.forEach(m => { if (m.date < min) min = m.date; if (m.date > max) max = m.date; });
        }
        const start = startOfWeek(addDays(min, -7), { weekStartsOn: 1 });
        const end = endOfWeek(addDays(max, 14), { weekStartsOn: 1 });
        return { start, end, days: daysBetween(start, end) + 1 };
    }, [rows]);

    const x = (d: Date) => daysBetween(range.start, d) * px;
    const todayX = x(today());

    // Open on today, with a little of the past visible.
    useLayoutEffect(() => {
        if (scroller.current) scroller.current.scrollLeft = Math.max(0, todayX - 160);
    }, [todayX, scale]);

    // One segment per month; its name sticks to the left edge while you scroll through it.
    const months = useMemo(() => {
        const list: { key: number; label: string; left: number; width: number }[] = [];
        let cursor = startOfMonth(range.start);
        while (cursor <= range.end) {
            const next = startOfMonth(addDays(cursor, 32));
            const from = cursor < range.start ? range.start : cursor;
            const to = next > addDays(range.end, 1) ? addDays(range.end, 1) : next;
            list.push({
                key: cursor.getTime(),
                label: format(cursor, cursor.getMonth() === 0 || list.length === 0 ? 'MMMM yyyy' : 'MMMM'),
                left: daysBetween(range.start, from) * px,
                width: daysBetween(from, to) * px,
            });
            cursor = next;
        }
        return list;
    }, [range, px]);

    const ticks = useMemo(() => eachDayOfInterval({ start: range.start, end: range.end })
        .filter(d => scale === 'weeks' || d.getDay() === 1), [range, scale]);

    const [labelW, setLabelW] = useState(220);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const set = () => setLabelW(mq.matches ? 136 : 220);
        set(); mq.addEventListener('change', set);
        return () => mq.removeEventListener('change', set);
    }, []);

    // Where each row's bar sits, for drawing dependency lines between them.
    const paths = useMemo(() => {
        if (!links.length) return [];
        const pos = new Map<string, { y: number; left: number; right: number }>();
        let y = HEADER_H;
        for (const g of groups) {
            if (g.label) y += GROUP_H;
            for (const r of g.rows) {
                const left = daysBetween(range.start, r.start) * px;
                const w = Math.max(px, (daysBetween(r.start, r.end) + 1) * px);
                pos.set(r.id, { y: y + BAR_MID, left, right: left + w });
                y += ROW_H;
            }
        }
        return links.flatMap(l => {
            const a = pos.get(l.from), b = pos.get(l.to);
            if (!a || !b) return [];
            const x1 = a.right, y1 = a.y, x2 = b.left, y2 = b.y;
            const down = y2 >= y1 ? 1 : -1;
            // Straight elbow when there's room; otherwise loop between the rows and come in from the left.
            const d = x2 - x1 >= 16
                ? `M${x1} ${y1} H${x1 + 8} V${y2} H${x2 - 1}`
                : `M${x1} ${y1} H${x1 + 8} V${y2 - down * (ROW_H / 2)} H${x2 - 10} V${y2} H${x2 - 1}`;
            return [{ key: `${l.from}>${l.to}`, d, conflict: l.conflict, settled: l.settled }];
        });
    }, [links, groups, range.start, px]);

    if (!rows.length) {
        return <p className="rounded-[12px] border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted dark:border-slate-700 dark:text-slate-400">{emptyText}</p>;
    }

    const width = range.days * px;

    return (
        <section aria-label="Timeline" className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label="Zoom" className="flex rounded-[8px] border border-line bg-surface p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    {(['weeks', 'months'] as Scale[]).map(s => (
                        <button key={s} type="button" aria-pressed={scale === s} onClick={() => setScale(s)}
                            className={cn('h-8 rounded-[6px] px-3 text-sm font-semibold capitalize',
                                scale === s ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-slate-400')}>
                            {s}
                        </button>
                    ))}
                </div>
                <button type="button" onClick={() => scroller.current?.scrollTo({ left: Math.max(0, todayX - 160), behavior: 'smooth' })}
                    className="h-9 rounded-[8px] border border-line bg-surface px-3 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    Today
                </button>
                {footnote && <p className="text-sm text-ink-muted dark:text-slate-400">{footnote}</p>}
            </div>

            <div ref={scroller} tabIndex={0} aria-label="Timeline, scroll sideways to see other dates"
                className="relative min-h-0 flex-1 overflow-auto overscroll-x-contain rounded-[12px] border border-line bg-surface shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div style={{ width: labelW + width }} className="relative">
                    {/* Date header */}
                    <div className="sticky top-0 z-20 flex border-b border-line bg-surface dark:border-slate-800 dark:bg-slate-900">
                        <div style={{ width: labelW }} className="sticky left-0 z-10 shrink-0 border-r border-line bg-surface dark:border-slate-800 dark:bg-slate-900" />
                        <div className="relative h-12" style={{ width }} aria-hidden>
                            {months.map(m => (
                                <div key={m.key} className="absolute top-0 h-6 border-l border-line dark:border-slate-800" style={{ left: m.left, width: m.width }}>
                                    <span className="sticky inline-block whitespace-nowrap px-1.5 pt-1 text-[12px] font-bold text-ink dark:text-slate-200" style={{ left: labelW }}>{m.label}</span>
                                </div>
                            ))}
                            {ticks.map(d => (
                                <span key={d.getTime()} className={cn('absolute bottom-1 text-center text-[11px] tabular-nums',
                                    daysBetween(d, today()) === 0 ? 'font-bold text-ink dark:text-slate-100' : 'text-ink-faint dark:text-slate-500')}
                                    style={{ left: x(d), width: scale === 'weeks' ? px : px * 7 }}>
                                    {format(d, 'd')}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Week bands and today line */}
                    <div className="pointer-events-none absolute bottom-0 top-12" style={{ left: labelW, width }} aria-hidden>
                        {ticks.filter(d => d.getDay() === 1).map(d => (
                            <span key={d.getTime()} className="absolute bottom-0 top-0 border-l border-line/70 dark:border-slate-800" style={{ left: x(d) }} />
                        ))}
                        <span className="absolute bottom-0 top-0 z-10 w-0.5 bg-ink dark:bg-white" style={{ left: todayX + px / 2 - 1 }} />
                    </div>

                    {/* Dependency lines, under the bars; the row labels cover them as you scroll. */}
                    {paths.length > 0 && (
                        <svg aria-hidden className="pointer-events-none absolute top-0 overflow-visible" style={{ left: labelW, width, height: 1 }}>
                            <defs>
                                {(['plain', 'conflict', 'settled'] as const).map(k => (
                                    <marker key={k} id={`dep-arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                                        <path d="M0 0 L8 4 L0 8 z" className={k === 'conflict' ? 'fill-blocked dark:fill-red-400' : k === 'settled' ? 'fill-ink-faint/60' : 'fill-ink/55 dark:fill-slate-300/70'} />
                                    </marker>
                                ))}
                            </defs>
                            {paths.map(p => (
                                <path key={p.key} d={p.d} fill="none" strokeWidth={p.conflict ? 1.75 : 1.25} strokeLinejoin="round"
                                    strokeDasharray={p.settled ? '3 3' : undefined}
                                    markerEnd={`url(#dep-arrow-${p.conflict ? 'conflict' : p.settled ? 'settled' : 'plain'})`}
                                    className={p.conflict ? 'stroke-blocked dark:stroke-red-400' : p.settled ? 'stroke-ink-faint/60' : 'stroke-ink/45 dark:stroke-slate-300/60'} />
                            ))}
                        </svg>
                    )}

                    {groups.map(g => (
                        <div key={g.id} role="group" aria-label={g.label}>
                            {g.label && (
                                <div className="sticky left-0 z-10 flex h-8 items-end border-b border-line bg-paper/80 px-3 pb-1 text-[12px] font-bold uppercase tracking-wide text-ink-muted backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
                                    style={{ width: labelW + width }}>
                                    <span className="sticky left-3 truncate">{g.label}</span>
                                </div>
                            )}
                            <ul>
                                {g.rows.map(r => {
                                    const left = x(r.start);
                                    const w = Math.max(px, (daysBetween(r.start, r.end) + 1) * px);
                                    return (
                                        <li key={r.id} className="flex border-b border-line/70 dark:border-slate-800" style={{ height: ROW_H }}>
                                            <div style={{ width: labelW }} className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-line bg-surface px-3 dark:border-slate-800 dark:bg-slate-900">
                                                <span className="truncate text-[13px] font-semibold text-ink dark:text-slate-100">{r.label}</span>
                                                {r.sublabel && <span className="truncate text-[11px] text-ink-muted dark:text-slate-400">{r.sublabel}</span>}
                                            </div>
                                            <div className="relative" style={{ width }}>
                                                <button type="button" onClick={r.onOpen} aria-label={r.describe} title={r.describe}
                                                    className={cn('absolute top-2 h-6 overflow-hidden rounded-[6px] border text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-progress',
                                                        barTone[r.tone], r.tone === 'done' && 'opacity-70')}
                                                    style={{ left, width: w }}>
                                                    {r.progress != null && r.progress > 0 && (
                                                        <span className={cn('absolute inset-y-0 left-0', fillTone[r.tone])} style={{ width: `${Math.min(100, r.progress)}%` }} aria-hidden />
                                                    )}
                                                    {w > 90 && (
                                                        <span className={cn('relative block truncate px-2 text-[11px] font-semibold leading-[22px]',
                                                            r.tone === 'done' ? 'text-ink-muted line-through' : 'text-ink dark:text-slate-100')}>
                                                            {r.label}
                                                        </span>
                                                    )}
                                                </button>
                                                {r.marks?.map((m, i) => (
                                                    <span key={i} title={`${m.label}, ${dayLabel(m.date)}${m.done ? ', done' : m.late ? ', overdue' : ''}`}
                                                        className="absolute top-[11px] -translate-x-1/2" style={{ left: x(m.date) + px / 2 }}>
                                                        <Diamond aria-hidden className={cn('h-3.5 w-3.5',
                                                            m.done ? 'fill-ink-faint text-ink-faint' : m.late ? 'fill-blocked text-blocked' : 'fill-surface text-ink dark:fill-slate-900 dark:text-slate-100')} />
                                                    </span>
                                                ))}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
