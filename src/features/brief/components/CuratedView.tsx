import { useMemo } from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Avatar, Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { stageDef } from '@/features/tasks/utils/stages';
import { Skeleton } from '@/components/ui/skeleton';
import { companyOf, type Brief, type BriefTask } from '../hooks/useBrief';
import { useBriefItems, todayISO, type BriefItem } from '../hooks/useBriefItems';
import { addressAs, attentionCount, reason } from '../utils/briefMeta';

interface Props {
    brief: Brief;
    companyName: Record<string, string>;
    scope: string;
    /** Name of the tab that opens the complete list, for the hint under the numbers. */
    fullLabel: string;
    onOpen: (id: string) => void;
}

/** The executive's view: only what the PA selected, plus anything urgent. */
export default function CuratedView({ brief, companyName, scope, fullLabel, onOpen }: Props) {
    const { data, isLoading } = useBriefItems({ latestIfEmpty: true });
    const items = useMemo(() => data?.items ?? [], [data]);
    const isToday = data?.date === todayISO();
    const preparedBy = items.find(i => i.added_by_user)?.added_by_user?.name;
    const curatedIds = new Set(items.map(i => i.task_id));
    const urgent = brief.sections.urgent.filter(t => !curatedIds.has(t.id));
    const attention = attentionCount(brief);

    const groups = useMemo(() => {
        const g = new Map<string, BriefItem[]>();
        items.forEach(i => {
            const key = (i.task?.project?.company_id ?? i.task?.company_id) || 'none';
            g.set(key, [...(g.get(key) ?? []), i]);
        });
        return [...g.entries()];
    }, [items]);

    if (isLoading) return <Skeleton className="h-40 w-full rounded-[14px]" />;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
                <p className={cn('text-[15px]', tx.muted)}>
                    {items.length === 0
                        ? 'No brief has been prepared yet.'
                        : isToday
                            ? <>Today’s brief{preparedBy ? <> from <span className={cn('font-semibold', tx.ink)}>{addressAs(preparedBy)}</span></> : null}: {items.length} update{items.length === 1 ? '' : 's'}.</>
                            : <>Today’s brief isn’t ready yet. Showing {formatDate(data!.date)}’s{preparedBy ? ` from ${addressAs(preparedBy)}` : ''}.</>}
                </p>

                {urgent.length > 0 && (
                    <Card aria-labelledby="urgent-heading">
                        <CardHeader
                            id="urgent-heading"
                            icon={AlertTriangle}
                            title="Urgent"
                            count={urgent.length}
                            action={<span className={cn('text-[12.5px]', tx.muted)}>Always shown</span>}
                        />
                        <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                            {urgent.map(t => <UrgentRow key={t.id} t={t} companyName={companyName} onOpen={() => onOpen(t.id)} />)}
                        </ul>
                    </Card>
                )}

                {groups.map(([companyId, list]) => {
                    const name = companyName[companyId] ?? 'Other';
                    const headingId = `company-${companyId}-heading`;
                    return (
                        <Card key={companyId} aria-labelledby={headingId}>
                            <header className="flex min-h-[56px] items-center gap-3 px-5 py-3">
                                <h2 id={headingId} className={cn('text-[15px] font-semibold', tx.ink)}>
                                    {name} <span className={cn('ml-1 font-semibold tabular-nums', tx.faint)}>{list.length}</span>
                                </h2>
                            </header>
                            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                {list.map(i => i.task && <CuratedRow key={i.id} item={i} onOpen={() => onOpen(i.task_id)} />)}
                            </ul>
                        </Card>
                    );
                })}

                {items.length === 0 && urgent.length === 0 && (
                    <Card className="border-dashed px-5 py-10 text-center">
                        <p className={cn('text-sm', tx.muted)}>
                            Nothing has been sent yet. Your PA prepares the brief each morning; until then, {fullLabel} shows everything that needs attention.
                        </p>
                    </Card>
                )}
            </div>

            <aside className="min-w-0 xl:sticky xl:top-0">
                <Card aria-labelledby="scope-heading">
                    <CardHeader id="scope-heading" icon={ClipboardList} title={scope} />
                    <dl className="grid grid-cols-3 gap-2 px-3 pb-3">
                        <Stat label="Open" value={brief.openCount} />
                        <Stat label="Need attention" value={attention} />
                        <Stat label="Done today" value={brief.sections.done.length} />
                    </dl>
                    <p className={cn('border-t border-line px-5 py-3.5 text-[12.5px] leading-snug dark:border-slate-800', tx.muted)}>
                        {fullLabel} lists every item behind these numbers.
                    </p>
                </Card>
            </aside>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col rounded-[10px] bg-paper p-3 dark:bg-slate-800/50">
            <dt className={cn('text-[12px] leading-tight', tx.muted)}>{label}</dt>
            <dd className={cn('mt-2 text-[26px] font-bold leading-none tabular-nums tracking-tight', tx.ink)}>{value}</dd>
        </div>
    );
}

function UrgentRow({ t, companyName, onOpen }: { t: BriefTask; companyName: Record<string, string>; onOpen: () => void }) {
    return (
        <li>
            <button onClick={onOpen} className="flex w-full items-start gap-3 border-l-[3px] border-red-600 px-5 py-3.5 text-left hover:bg-paper/70 dark:hover:bg-slate-800/50">
                <Avatar name={t.owner?.name} size={32} />
                <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm font-semibold', tx.ink)}>{t.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-red-700 dark:text-red-300">{reason(t, 'urgent')}</span>
                    <span className={cn('mt-1 block truncate text-[12px]', tx.faint)}>
                        {t.owner?.name ?? 'Unassigned'}{companyName[companyOf(t) ?? ''] ? ` · ${companyName[companyOf(t) ?? '']}` : ''}
                    </span>
                </span>
            </button>
        </li>
    );
}

function CuratedRow({ item, onOpen }: { item: BriefItem; onOpen: () => void }) {
    const t = item.task!;
    return (
        <li>
            <button
                onClick={onOpen}
                className={cn('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-paper/70 dark:hover:bg-slate-800/50', t.is_urgent && 'border-l-[3px] border-red-600')}
            >
                <Avatar name={t.owner?.name} size={32} />
                <span className="min-w-0 flex-1">
                    {item.note ? (
                        <>
                            <span className={cn('block text-[15px] leading-snug', tx.ink)}>{item.note}</span>
                            <span className={cn('mt-1.5 block truncate text-[12.5px]', tx.muted)}>{t.title}</span>
                        </>
                    ) : (
                        <span className={cn('block text-sm font-semibold', tx.ink)}>{t.title}</span>
                    )}
                    <span className={cn('mt-0.5 block text-[12px]', tx.faint)}>
                        {t.owner?.name ?? 'Unassigned'}{t.project?.name ? ` · ${t.project.name}` : ''}
                        {t.stage === 'blockers' && t.blocker?.name ? ` · waiting on ${t.blocker.name}` : ''}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cn('text-[12px] font-medium', tx.ink)}>{stageDef(t.stage).label}</span>
                    <span className={cn('text-[12px] font-bold tabular-nums', tx.muted)}>{t.progress_percent}%</span>
                </span>
            </button>
        </li>
    );
}
