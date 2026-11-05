import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import type { Brief, BriefSection } from '../hooks/useBrief';
import { SECTIONS, attentionCount } from '../utils/briefMeta';

/**
 * Emphasis palette, checked with the dataviz validator (adjacent ΔE ≥ 17.6, normal and
 * colour-blind vision, light and dark): red for the two states that cannot wait, two
 * neutral steps for the rest. The list beside the bar names every part, so no part is
 * told apart by colour alone.
 */
const PART_COLOUR: Partial<Record<BriefSection, string>> = {
    urgent: 'bg-attn-urgent dark:bg-attn-urgent-dark',
    blocked: 'bg-attn-blocked dark:bg-attn-blocked-dark',
    stuck: 'bg-attn-stuck dark:bg-attn-stuck-dark',
    overdue: 'bg-attn-overdue dark:bg-attn-overdue-dark',
};
const PARTS = SECTIONS.filter(s => s.key in PART_COLOUR);
const FOLLOW_UPS = SECTIONS.filter(s => !(s.key in PART_COLOUR));

/**
 * The brief's headline: how much needs attention, how it splits, and the smaller
 * follow-ups. `links` makes each part jump to its section (the full view has them).
 */
export default function AttentionSummary({ brief, compact = false, links = false, footnote }: {
    brief: Brief;
    compact?: boolean;
    links?: boolean;
    footnote?: string;
}) {
    const attention = attentionCount(brief);
    const parts = PARTS.map(p => ({ ...p, n: brief.sections[p.key].length }));
    const share = brief.openCount ? Math.round((attention / brief.openCount) * 100) : 0;
    const barLabel = `${attention} of ${brief.openCount} open tasks need attention: ${parts.map(p => `${p.n} ${p.title.toLowerCase()}`).join(', ')}`;

    return (
        <section aria-labelledby="attention-heading" className={cn('min-w-0 rounded-[16px] border border-line bg-surface shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none', compact ? 'p-5' : 'p-5 sm:p-6')}>
            <div className={cn('grid gap-6', !compact && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10')}>
                <div className="min-w-0">
                    <h2 id="attention-heading" className={cn('text-[14px] font-medium', tx.muted)}>Needs attention</h2>
                    {attention === 0 ? (
                        <p className={cn('mt-3 flex items-center gap-2 text-[20px] font-semibold', tx.ink)}>
                            <CheckCircle2 className="h-6 w-6 text-done dark:text-emerald-400" aria-hidden /> Nothing needs attention
                        </p>
                    ) : (
                        <>
                            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className={cn('font-semibold leading-none tabular-nums tracking-tight', compact ? 'text-[44px]' : 'text-[56px]', tx.ink)}>{attention}</span>
                                <span className={cn('text-[15px]', tx.muted)}>of {brief.openCount} open tasks · {share}%</span>
                            </p>
                            {/* Thin segmented bar: no text on it, the list beside it carries the figures. */}
                            <div className="mt-5 flex h-2 gap-[2px]" role="img" aria-label={barLabel}>
                                {parts.filter(p => p.n > 0).map(p => (
                                    <span key={p.key} title={`${p.title}: ${p.n}`} className={cn('h-full min-w-[6px] rounded-full', PART_COLOUR[p.key])} style={{ flexGrow: p.n }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <ul className={cn('grid min-w-0 content-center gap-1', !compact && 'grid-cols-2 gap-x-3 sm:gap-x-4')}>
                    {parts.map(p => {
                        const body = (
                            <>
                                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', p.n ? PART_COLOUR[p.key] : 'bg-line dark:bg-slate-700')} aria-hidden />
                                {/* Names only: each section card already carries its hint, so it isn't repeated here. */}
                                <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', p.n ? tx.ink : tx.muted)}>{p.title}</span>
                                <span className={cn('text-[20px] font-semibold leading-none tabular-nums', p.n ? (p.severe ? 'text-blocked dark:text-red-300' : tx.ink) : tx.muted)}>{p.n}</span>
                            </>
                        );
                        const row = 'flex items-center gap-3 rounded-[10px] px-3 py-2.5';
                        return (
                            <li key={p.key}>
                                {links && p.n > 0 ? (
                                    <a href={`#brief-${p.key}`} aria-label={`${p.title}: ${p.n}. Jump to section`} className={cn(row, 'hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/60')}>{body}</a>
                                ) : <div className={row}>{body}</div>}
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className={cn('mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 dark:border-slate-800')}>
                <span className={cn('mr-1 text-[13px]', tx.muted)}>Also today</span>
                {FOLLOW_UPS.map(s => {
                    const n = brief.sections[s.key].length;
                    const chip = cn('inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] dark:border-slate-700', n ? tx.ink : tx.muted);
                    const body = <><s.icon className="h-3.5 w-3.5" aria-hidden />{s.title} <span className="font-semibold tabular-nums">{n}</span></>;
                    return links && n > 0
                        ? <a key={s.key} href={`#brief-${s.key}`} className={cn(chip, 'hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/60')}>{body}</a>
                        : <span key={s.key} className={chip}>{body}</span>;
                })}
            </div>
            {footnote && <p className={cn('mt-3 text-[13px] leading-snug', tx.muted)}>{footnote}</p>}
        </section>
    );
}
