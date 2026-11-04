import { useMemo, useState } from 'react';
import { Building2, PenLine, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Card, CardHeader, TickMeter } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import type { Brief, BriefSection, BriefTask } from '../hooks/useBrief';
import { useBriefItems, useBriefMutations } from '../hooks/useBriefItems';
import { SECTIONS } from '../utils/briefMeta';
import BriefSectionCard from './BriefSectionCard';

interface Props {
    brief: Brief;
    companies: { id: string; name: string }[];
    companyName: Record<string, string>;
    allCompanies: boolean;
    /** The PA's mode: pick items for the executive's brief and write a line for each. */
    curate: boolean;
    onOpen: (id: string) => void;
}

/** Everything that needs a look, and for the PA, the controls to curate it. */
export default function FullView({ brief, companies, companyName, allCompanies, curate, onOpen }: Props) {
    const [expanded, setExpanded] = useState<Partial<Record<BriefSection, boolean>>>({});
    const { data: today } = useBriefItems();
    const { add, remove, setNote } = useBriefMutations();
    const selected = useMemo(() => new Map((today?.items ?? []).map(i => [i.task_id, i])), [today]);
    const withNote = useMemo(() => [...selected.values()].filter(i => i.note?.trim()).length, [selected]);

    const toggle = (t: BriefTask) => {
        if (selected.has(t.id)) remove.mutate(t.id, { onError: (e: Error) => toast.error(e.message) });
        else add.mutate({ taskId: t.id }, { onError: (e: Error) => toast.error(e.message) });
    };

    const visible = SECTIONS.filter(s => brief.sections[s.key].length > 0);
    const hasRail = curate || allCompanies;

    return (
        <div className={cn('grid grid-cols-[minmax(0,1fr)] items-start gap-5', hasRail && 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
            <div className="flex min-w-0 flex-col gap-5">
                {/* Small screens have no rail, so the running count stays pinned on top. */}
                {curate && (
                    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-[10px] bg-ink px-4 py-3 text-sm text-white shadow-lift xl:hidden">
                        <Send className="h-4 w-4 shrink-0" aria-hidden />
                        <p className="flex-1"><span className="font-semibold">{selected.size} selected</span> for Mr Blay today</p>
                    </div>
                )}

                {visible.length === 0 && (
                    <Card className="px-5 py-10 text-center">
                        <p className={cn('text-sm', tx.muted)}>Nothing to report. No task is urgent, blocked, stuck, overdue or recently moved.</p>
                    </Card>
                )}

                {visible.map(s => (
                    <BriefSectionCard
                        key={s.key}
                        meta={s}
                        items={brief.sections[s.key]}
                        companyName={companyName}
                        allCompanies={allCompanies}
                        curate={curate}
                        selected={selected}
                        expanded={!!expanded[s.key]}
                        onToggleExpanded={() => setExpanded(e => ({ ...e, [s.key]: !e[s.key] }))}
                        onOpen={onOpen}
                        onToggle={toggle}
                        onNote={(taskId, note) => setNote.mutate({ taskId, note })}
                    />
                ))}
            </div>

            {hasRail && (
                <aside className="min-w-0 space-y-5 xl:sticky xl:top-0">
                    {curate && (
                        <Card aria-labelledby="selection-heading">
                            <CardHeader id="selection-heading" icon={Send} title="Today’s brief for Mr Blay" />
                            <div className="border-t border-line px-5 py-5 dark:border-slate-800">
                                <p className={cn('text-[40px] font-bold leading-none tabular-nums tracking-tight', tx.ink)}>{selected.size}</p>
                                <p className={cn('mt-2 text-[13px]', tx.muted)}>{selected.size === 1 ? 'item selected' : 'items selected'}</p>
                                {selected.size > 0 && (
                                    <p className={cn('mt-3 flex items-center gap-1.5 text-[12.5px] font-medium', tx.muted)}>
                                        <PenLine className="h-3.5 w-3.5" aria-hidden /> {withNote} of {selected.size} {withNote === 1 && selected.size === 1 ? 'has' : 'have'} a note
                                    </p>
                                )}
                                <p className={cn('mt-4 border-t border-line pt-4 text-[12.5px] leading-snug dark:border-slate-800', tx.muted)}>
                                    Tap + on an item to include it, then add a one-line note in your words.
                                </p>
                            </div>
                        </Card>
                    )}

                    {allCompanies && (
                        <Card aria-labelledby="by-company-heading">
                            <CardHeader id="by-company-heading" icon={Building2} title="By company" />
                            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                {companies.map(c => {
                                    const stats = brief.byCompany[c.id] ?? { open: 0, atRisk: 0 };
                                    const share = stats.open ? stats.atRisk / stats.open : 0;
                                    return (
                                        <li key={c.id} className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', tx.ink)}>{c.name}</span>
                                                <span className={cn('text-[12.5px] tabular-nums', tx.muted)}>{stats.open} open</span>
                                            </div>
                                            <div className="mt-2.5 flex items-center gap-3">
                                                <div className="flex-1 text-slate-500 dark:text-slate-400">
                                                    <TickMeter value={share} color="currentColor" ticks={24} label={`${c.name}: ${stats.atRisk} of ${stats.open} open tasks at risk`} />
                                                </div>
                                                <span className={cn('w-[68px] text-right text-[12.5px] tabular-nums', stats.atRisk ? cn('font-semibold', tx.ink) : tx.faint)}>{stats.atRisk} at risk</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    )}
                </aside>
            )}
        </div>
    );
}
