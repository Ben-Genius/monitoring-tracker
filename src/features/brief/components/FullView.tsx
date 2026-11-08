import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, PenLine, Search, Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, getCompanyTheme } from '@/lib/utils';
import { Card, CardHeader, TickMeter } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import type { Brief, BriefSection, BriefTask } from '../hooks/useBrief';
import { useBriefDay, useBriefDayMutation, useBriefItems, useBriefMutations, type BriefDay } from '../hooks/useBriefItems';
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

const primaryBtn = 'inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-semibold transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progress';

/** Everything that needs a look, and for the PA, the controls to curate it. */
export default function FullView({ brief, companies, companyName, allCompanies, curate, onOpen }: Props) {
    const [expanded, setExpanded] = useState<Partial<Record<BriefSection, boolean>>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const { data: today } = useBriefItems();
    const { data: day } = useBriefDay();
    const setReady = useBriefDayMutation();
    const { add, remove, setNote } = useBriefMutations();
    const selected = useMemo(() => new Map((today?.items ?? []).map(i => [i.task_id, i])), [today]);
    const withNote = useMemo(() => [...selected.values()].filter(i => i.note?.trim()).length, [selected]);

    const toggle = (t: BriefTask) => {
        if (selected.has(t.id)) remove.mutate(t.id, { onError: (e: Error) => toast.error(e.message) });
        else add.mutate({ taskId: t.id }, { onError: (e: Error) => toast.error(e.message) });
    };
    const markReady = (ready: boolean) => setReady.mutate(ready, {
        onSuccess: () => toast.success(ready ? 'Marked ready. Mr Blay will see it as today’s brief.' : 'Reopened. Mr Blay will see it as still being prepared.'),
        onError: (e: Error) => toast.error(`Couldn’t update the brief: ${e.message}`),
    });

    const q = searchQuery.trim().toLowerCase();
    const visibleSections = useMemo(() => {
        return SECTIONS.map(s => {
            const raw = brief.sections[s.key];
            const items = q
                ? raw.filter(t =>
                    t.title.toLowerCase().includes(q) ||
                    t.project?.name?.toLowerCase().includes(q) ||
                    t.owner?.name?.toLowerCase().includes(q)
                )
                : raw;
            return { meta: s, items };
        }).filter(s => s.items.length > 0);
    }, [brief, q]);

    const totalRawTasks = useMemo(() => SECTIONS.reduce((sum, s) => sum + brief.sections[s.key].length, 0), [brief]);
    const hasRail = curate || allCompanies;

    return (
        <div className={cn('grid grid-cols-[minmax(0,1fr)] items-start gap-5', hasRail && 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
            <div className="flex min-w-0 flex-col gap-5">
                {totalRawTasks > 0 && (
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint dark:text-slate-400" aria-hidden />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Filter by task, project or owner"
                            aria-label="Filter brief items"
                            className="h-11 w-full rounded-[12px] border border-line bg-surface pl-10 pr-9 text-[15px] text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear filter"
                                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-ink-faint hover:bg-paper hover:text-ink dark:hover:bg-slate-800">
                                <X className="h-4 w-4" aria-hidden />
                            </button>
                        )}
                    </div>
                )}

                {/* Small screens have no rail, so the selection and the ready action stay pinned on top. */}
                {curate && (
                    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-[12px] bg-ink px-4 py-2.5 text-sm text-white shadow-lift xl:hidden dark:bg-slate-100 dark:text-slate-900">
                        <Send className="h-4 w-4 shrink-0" aria-hidden />
                        <p className="min-w-0 flex-1 truncate">
                            <span className="font-semibold">{selected.size} picked</span>{selected.size > 0 && <span className="opacity-80"> · {withNote} with a note</span>}
                            {day?.readyAt && <span className="font-semibold"> · Ready</span>}
                        </p>
                        {day?.available && selected.size > 0 && (
                            <button type="button" onClick={() => markReady(!day.readyAt)} disabled={setReady.isPending}
                                className="shrink-0 rounded-[8px] bg-white/15 px-3 py-1.5 text-[13px] font-semibold hover:bg-white/25 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white dark:bg-slate-900/10 dark:hover:bg-slate-900/20">
                                {day.readyAt ? 'Reopen' : 'Mark ready'}
                            </button>
                        )}
                    </div>
                )}

                {visibleSections.length === 0 && (
                    <Card className="px-5 py-10 text-center">
                        <p className={cn('text-[15px]', tx.muted)}>
                            {searchQuery
                                ? `No task matches “${searchQuery}”.`
                                : 'Nothing to report. No task is urgent, blocked, stuck, overdue or recently moved.'}
                        </p>
                    </Card>
                )}

                {visibleSections.map(({ meta: s, items }) => (
                    <BriefSectionCard
                        key={s.key}
                        meta={s}
                        items={items}
                        companyName={companyName}
                        allCompanies={allCompanies}
                        curate={curate}
                        selected={selected}
                        expanded={!!expanded[s.key]}
                        onToggleExpanded={() => setExpanded(e => ({ ...e, [s.key]: !e[s.key] }))}
                        onOpen={onOpen}
                        onToggle={toggle}
                        onNote={(taskId, note) => setNote.mutateAsync({ taskId, note })}
                    />
                ))}
            </div>

            {hasRail && (
                // Below xl the rail would land under every section, so the company summary moves
                // above them (overview before detail); the builder card gives way to the sticky bar.
                <aside className={cn('order-first min-w-0 space-y-5 xl:sticky xl:top-0 xl:order-none', !allCompanies && 'hidden xl:block')}>
                    {curate && (
                        <BriefBuilder picked={selected.size} withNote={withNote} day={day} pending={setReady.isPending} onReady={markReady} />
                    )}

                    {allCompanies && (
                        <Card aria-labelledby="by-company-heading" className="shadow-card dark:shadow-none">
                            <CardHeader id="by-company-heading" icon={Building2} title="By company" />
                            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                {companies.map(c => {
                                    const stats = brief.byCompany[c.id] ?? { open: 0, atRisk: 0 };
                                    const share = stats.open ? stats.atRisk / stats.open : 0;
                                    return (
                                        <li key={c.id} className="px-5 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(c.name).primary }} aria-hidden />
                                                <span className={cn('min-w-0 flex-1 truncate text-[15px] font-semibold', tx.ink)}>{c.name}</span>
                                                <span className={cn('text-[13px] tabular-nums', tx.muted)}>{stats.open} open</span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1 text-slate-500 dark:text-slate-400">
                                                    <TickMeter value={share} color="currentColor" ticks={24} label={`${c.name}: ${stats.atRisk} of ${stats.open} open tasks at risk`} />
                                                </div>
                                                <span className={cn('w-[76px] text-right text-[13px] tabular-nums', stats.atRisk ? cn('font-semibold', tx.ink) : tx.muted)}>{stats.atRisk} at risk</span>
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

/** The PA's progress on today's brief, and the one action that finishes it. */
function BriefBuilder({ picked, withNote, day, pending, onReady }: {
    picked: number; withNote: number; day?: BriefDay; pending: boolean; onReady: (ready: boolean) => void;
}) {
    const ready = !!day?.readyAt;
    const steps = [
        { done: picked > 0, label: picked ? `${picked} item${picked === 1 ? '' : 's'} picked` : 'Pick what Mr Blay should see', hint: 'Tap + on any item below' },
        { done: picked > 0 && withNote === picked, label: picked ? `${withNote} of ${picked} with a note` : 'Add a line in your words', hint: 'One sentence on what’s happening' },
    ];
    return (
        <Card aria-labelledby="builder-heading" className="hidden shadow-card xl:block dark:shadow-none">
            <CardHeader id="builder-heading" icon={Send} title="Today’s brief for Mr Blay" action={ready ? <span className="inline-flex items-center gap-1 rounded-full bg-done/10 px-2.5 py-1 text-[12.5px] font-semibold text-done dark:bg-emerald-400/10 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Ready</span> : undefined} />
            <div className="border-t border-line px-5 py-5 dark:border-slate-800">
                <ol className="space-y-3.5">
                    {steps.map((s, i) => (
                        <li key={i} className="flex gap-3">
                            <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                                s.done ? 'bg-ink text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-line-strong text-ink-muted dark:border-slate-600 dark:text-slate-400')}>
                                {s.done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                            </span>
                            <span className="min-w-0">
                                <span className={cn('block text-[15px] font-semibold tabular-nums', tx.ink)}>{s.label}</span>
                                <span className={cn('block text-[13px]', tx.muted)}>{i === 1 && picked > 0 && withNote < picked ? <><PenLine className="mr-1 inline h-3.5 w-3.5" aria-hidden />{picked - withNote} still without a note</> : s.hint}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                {day?.available ? (
                    <div className="mt-5 border-t border-line pt-4 dark:border-slate-800">
                        {ready ? (
                            <>
                                <p className={cn('text-[13px]', tx.muted)}>
                                    Marked ready {new Date(day.readyAt!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{day.readyBy ? ` by ${day.readyBy}` : ''}. Changes you make now show to Mr Blay straight away.
                                </p>
                                <button type="button" onClick={() => onReady(false)} disabled={pending} className={cn(primaryBtn, 'mt-3 w-full border border-line-strong text-ink hover:bg-paper dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800')}>
                                    Reopen to keep editing
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => onReady(true)} disabled={pending || picked === 0} className={cn(primaryBtn, 'w-full bg-ink text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white')}>
                                    <Send className="h-4 w-4" aria-hidden /> {pending ? 'Saving…' : 'Mark ready for Mr Blay'}
                                </button>
                                <p className={cn('mt-2 text-[13px] leading-snug', tx.muted)}>
                                    {picked === 0 ? 'Pick at least one item first.' : 'Until then, he sees it labelled as still being prepared.'}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <p className={cn('mt-5 border-t border-line pt-4 text-[13px] leading-snug dark:border-slate-800', tx.muted)}>
                        Items you pick show to Mr Blay straight away.
                    </p>
                )}
            </div>
        </Card>
    );
}
