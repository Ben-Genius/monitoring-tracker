import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Ban, CalendarX, ChevronRight, Clock, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brief, BriefSection, BriefTask } from '@/features/brief/hooks/useBrief';
import { Avatar, Card, CardHeader } from './primitives';
import { tx } from './tokens';

const ATTENTION: { key: BriefSection; label: string; icon: typeof AlertTriangle; color: string }[] = [
    { key: 'urgent', label: 'Urgent', icon: AlertTriangle, color: '#B83A24' },
    { key: 'blocked', label: 'Blocked', icon: Ban, color: '#B83A24' },
    { key: 'stuck', label: 'Stuck 2+ days', icon: Clock, color: '#C2410C' },
    { key: 'overdue', label: 'Overdue', icon: CalendarX, color: '#B45309' },
];

const SHOWN = 3;

/**
 * One number, then the worst few. Per-reason counts are deliberately absent:
 * the brief puts each task under a single reason, so those counts disagreed
 * with the Overdue tile and the Blocked stage card. The reason is shown on
 * each row instead.
 */
export default function AttentionCard({ brief, linkTo, moreIn }: { brief?: Brief; linkTo: string; moreIn: string }) {
    const navigate = useNavigate();
    const items = useMemo(() => {
        if (!brief) return [] as { t: BriefTask; key: BriefSection }[];
        return ATTENTION.flatMap(a => brief.sections[a.key].map(t => ({ t, key: a.key })));
    }, [brief]);

    return (
        <Card aria-labelledby="attention-heading" className="flex flex-col">
            <CardHeader id="attention-heading" icon={Siren} title="Needs attention" />

            {/* Focal figure: the one number a lead should act on today. */}
            <div className="mx-5 rounded-[12px] border border-line bg-paper/70 px-4 py-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                <p className={cn('text-[44px] font-bold leading-none tabular-nums tracking-tight', items.length || !brief ? tx.ink : 'text-done dark:text-emerald-300')}>
                    {brief ? items.length : '–'}
                </p>
                <p className={cn('mt-2 text-[13px]', tx.muted)}>
                    {!brief ? 'Checking the brief' : items.length === 0 ? 'Nothing is urgent, blocked, stuck or overdue' : `task${items.length === 1 ? '' : 's'} need a decision or a nudge`}
                </p>
            </div>

            {items.length > 0 && (
                <>
                    <p className={cn('px-5 pt-4 pb-1 text-[12px] font-medium', tx.faint)}>Most pressing</p>
                    <ul className="px-2.5 pb-2">
                        {items.slice(0, SHOWN).map(({ t, key }) => {
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
                    <Link
                        to={linkTo}
                        className={cn('mt-auto flex items-center justify-between border-t border-line px-5 py-3 text-[13px] font-semibold text-progress hover:underline dark:border-slate-800 dark:text-blue-300')}
                    >
                        {items.length > SHOWN ? `See all ${items.length} in the ${moreIn}` : `Open the ${moreIn}`}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                </>
            )}
            {items.length === 0 && <div className="pb-5" />}
        </Card>
    );
}
