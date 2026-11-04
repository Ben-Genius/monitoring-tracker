import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Ban, CalendarX, ChevronRight, Clock, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brief, BriefSection, BriefTask } from '@/features/brief/hooks/useBrief';
import { Avatar, Card, CardHeader } from './primitives';
import { tx } from './tokens';

const ATTENTION: { key: BriefSection; label: string; icon: typeof AlertTriangle; color: string; chip: string }[] = [
    { key: 'urgent', label: 'Urgent', icon: AlertTriangle, color: '#B83A24', chip: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
    { key: 'blocked', label: 'Blocked', icon: Ban, color: '#B83A24', chip: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
    { key: 'stuck', label: 'Stuck 2+ days', icon: Clock, color: '#C2410C', chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
    { key: 'overdue', label: 'Overdue', icon: CalendarX, color: '#B45309', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
];

export default function AttentionCard({ brief, linkTo, linkLabel, moreIn }: { brief?: Brief; linkTo: string; linkLabel: string; moreIn: string }) {
    const navigate = useNavigate();
    const items = useMemo(() => {
        if (!brief) return [] as { t: BriefTask; key: BriefSection }[];
        return ATTENTION.flatMap(a => brief.sections[a.key].map(t => ({ t, key: a.key })));
    }, [brief]);

    return (
        <Card aria-labelledby="attention-heading" className="flex flex-col">
            <CardHeader
                id="attention-heading"
                icon={Siren}
                title="Needs attention"
                action={
                    <Link to={linkTo} className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-line px-2.5 text-[13px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100">
                        {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                }
            />

            {/* Focal figure: the one number a lead should act on today. */}
            <div className="mx-5 rounded-[12px] border border-line bg-paper/70 px-4 py-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                <p className={cn('text-[44px] font-bold leading-none tabular-nums tracking-tight', items.length ? tx.ink : 'text-done dark:text-emerald-300')}>
                    {brief ? items.length : '–'}
                </p>
                <p className={cn('mt-2 text-[13px]', tx.muted)}>
                    {items.length === 0 ? 'Nothing is urgent, blocked, stuck or overdue' : `task${items.length === 1 ? '' : 's'} need a decision or a nudge`}
                </p>
                <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {ATTENTION.map(a => {
                        const n = brief?.sections[a.key].length ?? 0;
                        return (
                            <li key={a.key} className={cn('inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[12px] font-semibold tabular-nums', n ? a.chip : 'bg-surface text-ink-faint dark:bg-slate-900 dark:text-slate-500')}>
                                <a.icon className="h-3 w-3" aria-hidden /> {a.label} {n}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {items.length > 0 && (
                <>
                    <p className={cn('px-5 pt-4 pb-1 text-[12px] font-medium', tx.faint)}>Top items</p>
                    <ul className="flex-1 px-2.5 pb-3">
                        {items.slice(0, 4).map(({ t, key }) => {
                            const a = ATTENTION.find(x => x.key === key)!;
                            return (
                                <li key={t.id}>
                                    <button
                                        onClick={() => navigate(`/tasks?task=${t.id}`)}
                                        className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left hover:bg-paper dark:hover:bg-slate-800/60"
                                    >
                                        <Avatar name={t.owner?.name} size={30} />
                                        <span className="min-w-0 flex-1">
                                            <span className={cn('block truncate text-sm font-semibold', tx.ink)}>{t.title}</span>
                                            <span className={cn('block truncate text-[12.5px]', tx.muted)}>
                                                <span style={{ color: a.color }}>{a.label}</span>
                                                {' · '}{t.owner?.name ?? 'No owner'}
                                                {t.project?.name ? ` · ${t.project.name}` : ''}
                                            </span>
                                        </span>
                                        <ChevronRight className={cn('h-4 w-4 shrink-0', tx.faint)} aria-hidden />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {items.length > 4 && (
                        <p className={cn('border-t border-line px-5 py-2.5 text-[12.5px] dark:border-slate-800', tx.muted)}>
                            {items.length - 4} more in the {moreIn}.
                        </p>
                    )}
                </>
            )}
            {items.length === 0 && <div className="pb-5" />}
        </Card>
    );
}
