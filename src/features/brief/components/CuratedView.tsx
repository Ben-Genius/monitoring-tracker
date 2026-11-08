import { useMemo, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, History, PenLine } from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { Avatar, Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { stageDef } from '@/features/tasks/utils/stages';
import { Skeleton } from '@/components/ui/skeleton';
import { companyOf, type Brief, type BriefTask } from '../hooks/useBrief';
import { useBriefDay, useBriefItems, todayISO, type BriefItem } from '../hooks/useBriefItems';
import { addressAs, reason } from '../utils/briefMeta';
import AttentionSummary from './AttentionSummary';

interface Props {
    brief: Brief;
    companyName: Record<string, string>;
    scope: string;
    /** Name of the tab that opens the complete list, for the hint under the numbers. */
    fullLabel: string;
    onOpen: (id: string) => void;
}

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** The executive's view: only what the PA selected, plus anything urgent. */
export default function CuratedView({ brief, companyName, scope, fullLabel, onOpen }: Props) {
    const { data, isLoading } = useBriefItems({ latestIfEmpty: true });
    const { data: day } = useBriefDay();
    const items = useMemo(() => data?.items ?? [], [data]);
    const isToday = data?.date === todayISO();
    const preparedBy = items.find(i => i.added_by_user)?.added_by_user?.name;
    const by = preparedBy ? addressAs(preparedBy) : 'Your PA';
    const curatedIds = new Set(items.map(i => i.task_id));
    const urgent = brief.sections.urgent.filter(t => !curatedIds.has(t.id));

    const groups = useMemo(() => {
        const g = new Map<string, BriefItem[]>();
        items.forEach(i => {
            const key = (i.task?.project?.company_id ?? i.task?.company_id) || 'none';
            g.set(key, [...(g.get(key) ?? []), i]);
        });
        return [...g.entries()];
    }, [items]);

    if (isLoading) {
        return (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
                <div className="space-y-4"><Skeleton className="h-16 w-full rounded-[14px]" /><Skeleton className="h-48 w-full rounded-[16px]" /></div>
                <Skeleton className="hidden h-72 w-full rounded-[16px] xl:block" />
            </div>
        );
    }

    // Three honest states for the brief itself: an older day's, today's still being prepared, or today's ready.
    const stale = items.length > 0 && !isToday;
    const draft = items.length > 0 && isToday && !!day?.available && !day.readyAt;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
                {stale ? (
                    <Notice icon={History}>
                        <span className={cn('font-semibold', tx.ink)}>Today’s brief isn’t ready yet.</span>{' '}
                        Below is the brief {by} prepared for <span className={cn('font-semibold', tx.ink)}>{longDate(data!.date)}</span> ({daysAgo(data!.date)}),
                        so some notes may be out of date. Urgent items are always current.
                    </Notice>
                ) : draft ? (
                    <Notice icon={PenLine}>
                        <span className={cn('font-semibold', tx.ink)}>{by} is still preparing today’s brief.</span>{' '}
                        {items.length} item{items.length === 1 ? '' : 's'} so far; more may be added before it’s marked ready.
                    </Notice>
                ) : items.length > 0 ? (
                    <p className={cn('flex items-center gap-2 text-[15px]', tx.muted)}>
                        {day?.readyAt && <CheckCircle2 className="h-4 w-4 text-done dark:text-emerald-400" aria-hidden />}
                        <span>
                            Today’s brief from <span className={cn('font-semibold', tx.ink)}>{by}</span>: {items.length} update{items.length === 1 ? '' : 's'}
                            {day?.readyAt ? `, ready since ${new Date(day.readyAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                        </span>
                    </p>
                ) : null}

                {urgent.length > 0 && (
                    <Card aria-labelledby="urgent-heading" className="overflow-hidden shadow-card dark:shadow-none">
                        <CardHeader
                            id="urgent-heading"
                            icon={AlertTriangle}
                            title="Urgent"
                            count={urgent.length}
                            action={<span className={cn('text-[13px]', tx.muted)}>Always shown</span>}
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
                        <Card key={companyId} aria-labelledby={headingId} className="overflow-hidden shadow-card dark:shadow-none">
                            <header className="flex min-h-[56px] items-center gap-3 px-5 py-3">
                                <h2 id={headingId} className={cn('flex items-center gap-2.5 text-[16px] font-semibold', tx.ink)}>
                                    {companyName[companyId] && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getCompanyTheme(name).primary }} aria-hidden />}
                                    {name} <span className={cn('font-semibold tabular-nums', tx.faint)}>{list.length}</span>
                                </h2>
                            </header>
                            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                {list.map(i => i.task && <CuratedRow key={i.id} item={i} onOpen={() => onOpen(i.task_id)} />)}
                            </ul>
                        </Card>
                    );
                })}

                {items.length === 0 && (
                    <Card className="border-dashed px-6 py-12 text-center">
                        <p className={cn('text-[16px] font-semibold', tx.ink)}>No brief has been prepared yet</p>
                        <p className={cn('mx-auto mt-1 max-w-md text-[14px]', tx.muted)}>
                            Your PA prepares the brief each morning. Until then, {fullLabel} shows everything that needs attention{urgent.length ? ', and urgent items appear above' : ''}.
                        </p>
                    </Card>
                )}
            </div>

            <aside className="min-w-0 xl:sticky xl:top-0">
                <AttentionSummary brief={brief} compact footnote={`${scope}. ${fullLabel} lists every item behind these numbers.`} />
            </aside>
        </div>
    );
}

function Notice({ icon: Icon, children }: { icon: typeof History; children: ReactNode }) {
    return (
        <div role="status" className="flex items-start gap-3 rounded-[14px] border border-line-strong bg-surface px-4 py-3.5 shadow-card dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-paper dark:bg-slate-800">
                <Icon className={cn('h-4 w-4', tx.ink)} aria-hidden />
            </span>
            <p className={cn('pt-1 text-[14px] leading-snug', tx.muted)}>{children}</p>
        </div>
    );
}

function daysAgo(iso: string) {
    const days = Math.round((new Date(`${todayISO()}T00:00:00`).getTime() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

function UrgentRow({ t, companyName, onOpen }: { t: BriefTask; companyName: Record<string, string>; onOpen: () => void }) {
    const company = companyName[companyOf(t) ?? ''];
    return (
        <li>
            <button onClick={onOpen} className="flex w-full items-start gap-3 border-l-[3px] border-blocked px-5 py-4 text-left hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-progress dark:border-red-400 dark:hover:bg-slate-800/50">
                <Avatar name={t.owner?.name} size={36} />
                <span className="min-w-0 flex-1">
                    <span className={cn('block text-[15px] font-semibold', tx.ink)}>{t.title}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-red-700 dark:text-red-300">{reason(t, 'urgent')}</span>
                    <span className={cn('mt-1 block truncate text-[13px]', tx.faint)}>
                        {t.owner?.name ?? 'Unassigned'}{company ? ` · ${company}` : ''}
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
                className={cn('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-progress dark:hover:bg-slate-800/50', t.is_urgent && 'border-l-[3px] border-blocked dark:border-red-400')}
            >
                <Avatar name={t.owner?.name} size={36} />
                <span className="min-w-0 flex-1">
                    {/* The PA's line is what Mr Blay reads first, at body size; the task title supports it. */}
                    {item.note ? (
                        <>
                            <span className={cn('block text-[16px] leading-snug', tx.ink)}>{item.note}</span>
                            <span className={cn('mt-1.5 block truncate text-[14px] font-medium', tx.muted)}>{t.title}</span>
                        </>
                    ) : (
                        <span className={cn('block text-[15px] font-semibold', tx.ink)}>{t.title}</span>
                    )}
                    <span className={cn('mt-0.5 block text-[13px]', tx.faint)}>
                        {t.owner?.name ?? 'Unassigned'}{t.project?.name ? ` · ${t.project.name}` : ''}
                        {t.stage === 'blockers' && t.blocker?.name ? ` · waiting on ${t.blocker.name}` : ''}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('text-[13px] font-medium', tx.ink)}>{stageDef(t.stage).label}</span>
                    <span className={cn('text-[13px] font-semibold tabular-nums', tx.muted)}>{t.progress_percent}%</span>
                </span>
            </button>
        </li>
    );
}
