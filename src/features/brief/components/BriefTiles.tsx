import { cn } from '@/lib/utils';
import type { Brief } from '../hooks/useBrief';
import { SECTIONS } from '../utils/briefMeta';
import { Card } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';

/**
 * The seven sections as one summary strip. Neutral by default; only urgent and
 * blocked turn red when something is there. Each cell jumps to its section.
 */
export default function BriefTiles({ brief }: { brief: Brief }) {
    return (
        <Card aria-label="Brief summary">
            <ul className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
                {SECTIONS.map(s => {
                    const n = brief.sections[s.key].length;
                    const alert = n > 0 && (s.key === 'urgent' || s.key === 'blocked');
                    const body = (
                        <>
                            <span className={cn('flex items-center gap-2 text-[13px] font-medium', tx.muted)}>
                                <s.icon className="h-4 w-4 shrink-0" aria-hidden /> {s.title}
                            </span>
                            <span className={cn('mt-3 text-[28px] font-bold leading-none tabular-nums tracking-tight', alert ? 'text-blocked dark:text-red-300' : n ? tx.ink : tx.faint)}>{n}</span>
                        </>
                    );
                    const cell = 'flex h-full flex-col px-5 py-4';
                    return (
                        <li key={s.key} className="min-w-0 border-line dark:border-slate-800 [&:not(:first-child)]:border-l max-sm:[&:nth-child(odd)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t">
                            {n > 0 ? (
                                <a href={`#brief-${s.key}`} aria-label={`${s.title}: ${n}. Jump to section`} className={cn(cell, 'hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/50')}>{body}</a>
                            ) : (
                                <div className={cell}>{body}</div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
