import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Flag, MoreVertical, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { stageDef } from '@/features/tasks/utils/stages';
import { tx } from './tokens';

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
    return (
        <section
            className={cn('min-w-0 rounded-[14px] border border-line bg-surface dark:border-slate-800 dark:bg-slate-900', className)}
            {...rest}
        >
            {children}
        </section>
    );
}

export function CardHeader({ id, icon: Icon, title, count, action }: {
    id: string;
    icon: LucideIcon;
    title: string;
    count?: number;
    action?: ReactNode;
}) {
    return (
        <header className="flex min-h-[56px] items-center justify-between gap-3 px-5 py-3">
            <h2 id={id} className={cn('flex items-center gap-2.5 text-[15px] font-semibold', tx.ink)}>
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-line bg-paper dark:border-slate-700 dark:bg-slate-800">
                    <Icon className={cn('h-3.5 w-3.5', tx.muted)} aria-hidden />
                </span>
                {title}
                {count !== undefined && <span className={cn('font-semibold tabular-nums', tx.faint)}>{count}</span>}
            </h2>
            {action}
        </header>
    );
}

/**
 * Segmented "tick" meter: a row of thin bars, the first share of them filled.
 * Reads faster than a thin progress bar at small sizes.
 */
export function TickMeter({ value, color, ticks = 28, label }: { value: number; color: string; ticks?: number; label: string }) {
    const filled = Math.round(Math.min(Math.max(value, 0), 1) * ticks);
    return (
        <div className="flex h-5 items-stretch gap-[3px]" role="img" aria-label={label}>
            {Array.from({ length: ticks }, (_, i) => (
                <span
                    key={i}
                    className={cn('flex-1 rounded-full', i >= filled && 'bg-line dark:bg-slate-700')}
                    style={i < filled ? { backgroundColor: color } : undefined}
                />
            ))}
        </div>
    );
}

const PRIORITY: Record<Task['priority'], { label: string; cls: string }> = {
    critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
    high: { label: 'High', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
    medium: { label: 'Medium', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
    low: { label: 'Low', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

export function PriorityChip({ priority }: { priority: Task['priority'] }) {
    const p = PRIORITY[priority] ?? PRIORITY.low;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[12px] font-medium', p.cls)}>
            <Flag className="h-3 w-3" aria-hidden /> {p.label}
        </span>
    );
}

export function StageDot({ stage }: { stage: Task['stage'] }) {
    const s = stageDef(stage);
    return (
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium', tx.ink)}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.accent }} aria-hidden />
            {s.label}
        </span>
    );
}

export function Avatar({ name, size = 28 }: { name?: string | null; size?: number }) {
    const label = name?.trim() || '';
    const initials = label.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return (
        <span
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 ring-2 ring-surface dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-900"
            style={{ width: size, height: size, fontSize: size * 0.38 }}
            aria-hidden
        >
            {initials || '?'}
        </span>
    );
}

/**
 * The vertical-dots menu from the stat cards. Position it with `className`
 * (it is not positioned itself). Closes on outside click and Escape.
 */
export function KebabMenu({ label, items, className }: {
    label: string;
    items: { label: string; to: string }[];
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    return (
        <div ref={ref} className={className}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen(o => !o)}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-muted hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-400 dark:hover:bg-white/10"
            >
                <MoreVertical className="h-4 w-4" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-8 z-30 min-w-[188px] rounded-[10px] border border-line bg-surface p-1 shadow-pop dark:border-slate-700 dark:bg-slate-900">
                    {items.map(i => (
                        <Link
                            key={i.to + i.label}
                            to={i.to}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className="block rounded-[6px] px-3 py-2 text-sm font-medium text-ink hover:bg-paper dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            {i.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
