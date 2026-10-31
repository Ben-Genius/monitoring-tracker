import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
    AlertTriangle, Ban, Clock, CalendarX, UserX, CheckCircle2, ChevronRight, RefreshCw, TrendingUp,
    Plus, Check, Eye, ListChecks, Send,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, formatDate, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canReadBrief } from '@/lib/permissions';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { daysSinceMovement } from '@/features/tasks/utils/accountability';
import { stageDef } from '@/features/tasks/utils/stages';
import TaskDetailModal from '@/features/tasks/components/TaskDetailModal';
import { useBrief, companyOf, type Brief, type BriefSection, type BriefTask } from '../hooks/useBrief';
import { useBriefItems, useBriefMutations, todayISO, type BriefItem } from '../hooks/useBriefItems';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW = 5;

const SECTIONS: { key: BriefSection; title: string; hint: string; icon: typeof AlertTriangle; tone: string; tile: string }[] = [
    { key: 'urgent', title: 'Urgent', hint: 'Flagged as an emergency', icon: AlertTriangle, tone: 'text-red-700 dark:text-red-300', tile: 'bg-red-600 text-white' },
    { key: 'blocked', title: 'Blocked', hint: 'Waiting on someone else', icon: Ban, tone: 'text-red-700 dark:text-red-300', tile: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
    { key: 'stuck', title: 'Stuck', hint: 'In progress, no movement for 2+ days', icon: Clock, tone: 'text-orange-700 dark:text-orange-300', tile: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
    { key: 'overdue', title: 'Overdue', hint: 'Past the deadline or the promised update', icon: CalendarX, tone: 'text-amber-700 dark:text-amber-300', tile: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    { key: 'unaccepted', title: 'Not accepted', hint: 'Assigned, but the owner hasn’t accepted it', icon: UserX, tone: 'text-slate-700 dark:text-slate-300', tile: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    { key: 'moved', title: 'Moved today', hint: 'Progress or status changed in the last 24 hours', icon: TrendingUp, tone: 'text-blue-700 dark:text-blue-300', tile: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
    { key: 'done', title: 'Done', hint: 'Completed in the last 24 hours', icon: CheckCircle2, tone: 'text-emerald-700 dark:text-emerald-300', tile: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
];

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|rev|hon|sir|madam)\.?$/i;
/** "Mr Blay" stays "Mr Blay"; "Ama Owusu" becomes "Ama". */
function addressAs(name: string) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 && HONORIFICS.test(parts[0]) ? `${parts[0]} ${parts[1]}` : parts[0];
}
function greeting(d: Date) {
    const h = d.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function daysLate(iso: string | null) {
    return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)) : 0;
}

/** One short line saying why this task is in the brief. */
function reason(t: BriefTask, section: BriefSection): string {
    const blocked = t.blocker?.name
        ? `Waiting on ${t.blocker.name}: ${t.blocker_description || 'no reason given'}`
        : t.blocker_description || 'No reason given';
    switch (section) {
        case 'urgent': return t.stage === 'blockers' ? `Urgent and blocked. ${blocked}` : `${stageDef(t.stage).label}, ${t.progress_percent}% done`;
        case 'blocked': return blocked;
        case 'stuck': return `No movement for ${daysSinceMovement(t)} days, ${t.progress_percent}% done`;
        case 'overdue':
            return t.due_date && new Date(t.due_date).getTime() < Date.now()
                ? `Deadline was ${formatDate(t.due_date)}, ${daysLate(t.due_date)} days late`
                : `Promised update ${t.next_update_due ? formatDate(t.next_update_due) : ''} not received`;
        case 'unaccepted': return 'Owner hasn’t accepted this yet';
        case 'moved': return `${stageDef(t.stage).label}, now ${t.progress_percent}% done`;
        case 'done': return t.completed_at ? `Completed ${formatDate(t.completed_at)}` : 'Completed';
    }
}

export default function BriefPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: brief, isLoading, isFetching, refetch, error } = useBrief(selectedCompanyId);
    const [openTaskId, setOpenTaskId] = useState<string | null>(null);

    const isExecutive = user?.role === 'executive';
    // The executive reads the PA's selection; the PA prepares it from everything.
    const [view, setView] = useState<'curated' | 'full'>(isExecutive ? 'curated' : 'full');
    useEffect(() => { setView(isExecutive ? 'curated' : 'full'); }, [isExecutive]);

    const companyName = useMemo(() => {
        const map: Record<string, string> = {};
        companies.forEach((c: { id: string; name: string }) => { map[c.id] = c.name; });
        return map;
    }, [companies]);

    if (!canReadBrief(user)) return <Navigate to="/dashboard" replace />;

    const now = brief?.generatedAt ?? new Date();
    const scope = selectedCompanyId === 'all' ? 'All three companies' : companyName[selectedCompanyId] ?? '';

    return (
        <div className="w-full space-y-5 pb-16">
            <header className="space-y-1">
                <p className="text-sm text-ink-muted">
                    {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="flex items-start justify-between gap-3">
                    <h1 className="text-[26px] font-bold tracking-tight text-ink">
                        {greeting(now)}{user?.name ? `, ${addressAs(user.name)}` : ''}
                    </h1>
                    <button onClick={() => refetch()} className="icon-btn shrink-0 text-slate-400 hover:text-slate-700" aria-label="Refresh brief">
                        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                    </button>
                </div>
            </header>

            {/* View switch */}
            <div className="inline-grid w-full sm:w-auto grid-cols-2 gap-1 rounded-[10px] border border-line bg-surface p-1 text-sm font-semibold">
                {((isExecutive
                    ? [['curated', 'My brief', Send], ['full', 'Full picture', ListChecks]]
                    : [['full', 'Prepare today’s brief', ListChecks], ['curated', 'Preview Mr Blay’s view', Eye]]
                ) as ['curated' | 'full', string, typeof Send][]).map(([key, label, Icon]) => (
                    <button
                        key={key}
                        onClick={() => setView(key)}
                        className={cn('flex items-center justify-center gap-1.5 rounded-[7px] px-4 py-2 transition-colors', view === key ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink')}
                    >
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">The brief couldn't be loaded. {(error as Error).message}</div>}
            {isLoading && <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}

            {brief && (view === 'curated'
                ? <CuratedView brief={brief} companyName={companyName} scope={scope} onOpen={setOpenTaskId} />
                : <FullView brief={brief} companies={companies} companyName={companyName} scope={scope} allCompanies={selectedCompanyId === 'all'} curate={!isExecutive} onOpen={setOpenTaskId} />)}

            <TaskDetailModal taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
        </div>
    );
}

/* ─────────────── Mr Blay's view: only what the PA selected, plus anything urgent ─────────────── */

function CuratedView({ brief, companyName, scope, onOpen }: {
    brief: Brief; companyName: Record<string, string>; scope: string; onOpen: (id: string) => void;
}) {
    const { data, isLoading } = useBriefItems({ latestIfEmpty: true });
    const items = useMemo(() => data?.items ?? [], [data]);
    const isToday = data?.date === todayISO();
    const preparedBy = items.find(i => i.added_by_user)?.added_by_user?.name;
    const curatedIds = new Set(items.map(i => i.task_id));
    const urgent = brief.sections.urgent.filter(t => !curatedIds.has(t.id));
    const attention = brief.sections.urgent.length + brief.sections.blocked.length + brief.sections.stuck.length + brief.sections.overdue.length;

    const groups = useMemo(() => {
        const g = new Map<string, BriefItem[]>();
        items.forEach(i => {
            const key = (i.task?.project?.company_id ?? i.task?.company_id) || 'none';
            g.set(key, [...(g.get(key) ?? []), i]);
        });
        return [...g.entries()];
    }, [items]);

    if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-5 min-w-0">
            <p className="text-[15px] text-ink-muted">
                {items.length === 0
                    ? 'No brief has been prepared yet.'
                    : isToday
                        ? <>Today's brief{preparedBy ? <> from <span className="font-semibold text-slate-700 dark:text-slate-200">{addressAs(preparedBy)}</span></> : null}: {items.length} update{items.length === 1 ? '' : 's'}.</>
                        : <>Today's brief isn't ready yet. Showing {formatDate(data!.date)}'s{preparedBy ? ` from ${addressAs(preparedBy)}` : ''}.</>}
            </p>

            {urgent.length > 0 && (
                <section className="space-y-2">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-blocked">
                        <AlertTriangle className="h-4 w-4" /> Urgent <span className="font-semibold text-slate-400">{urgent.length}</span>
                        <span className="ml-auto text-[12px] font-normal text-ink-faint">Always shown</span>
                    </h2>
                    <ul className="space-y-2">
                        {urgent.map(t => (
                            <li key={t.id}>
                                <button onClick={() => onOpen(t.id)} className="w-full rounded-xl border-l-4 border-red-600 border-y border-r border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900">
                                    <p className="font-semibold text-slate-900 dark:text-slate-50">{t.title}</p>
                                    <p className="mt-0.5 text-sm text-red-700">{reason(t, 'urgent')}</p>
                                    <p className="mt-1 text-xs text-slate-400">{t.owner?.name ?? 'Unassigned'}, {companyName[companyOf(t) ?? ''] ?? ''}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {groups.map(([companyId, list]) => {
                const name = companyName[companyId] ?? 'Other';
                const theme = getCompanyTheme(name);
                return (
                    <section key={companyId} className="space-y-2">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                            <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: theme.primary }} /> {name}
                        </h2>
                        <ul className="space-y-2">
                            {list.map(i => i.task && (
                                <li key={i.id}>
                                    <CuratedCard item={i} onOpen={() => onOpen(i.task_id)} />
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}

            {items.length === 0 && urgent.length === 0 && (
                <p className="rounded-[12px] border border-dashed border-line-strong p-6 text-sm text-ink-muted">
                    Nothing has been sent yet. Your PA prepares the brief each morning; until then, Full picture shows everything that needs attention.
                </p>
            )}
        </div>
        <aside className="space-y-3 xl:sticky xl:top-4">
            <div className="rounded-[12px] border border-line bg-surface p-4">
                <p className="text-sm font-semibold text-ink">{scope}</p>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                    <Stat label="Open" value={brief.openCount} />
                    <Stat label="Need attention" value={attention} tone={attention ? 'text-blocked' : undefined} />
                    <Stat label="Done today" value={brief.sections.done.length} tone="text-done" />
                </dl>
                <p className="mt-3 text-[13px] text-ink-muted">Switch to Full picture to see every item behind these numbers.</p>
            </div>
        </aside>
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
    return (
        <div>
            <dt className="text-[12px] text-ink-muted">{label}</dt>
            <dd className={cn('text-[24px] font-bold leading-tight tabular-nums text-ink', tone)}>{value}</dd>
        </div>
    );
}

function CuratedCard({ item, onOpen }: { item: BriefItem; onOpen: () => void }) {
    const t = item.task!;
    const st = stageDef(t.stage);
    return (
        <button onClick={onOpen} className={cn('w-full rounded-xl border bg-white p-4 text-left dark:bg-slate-900', t.is_urgent ? 'border-red-300' : 'border-slate-200 dark:border-slate-800')}>
            {item.note && <p className="text-[15px] leading-snug text-slate-900 dark:text-slate-50">{item.note}</p>}
            <div className={cn('flex items-start justify-between gap-3', item.note && 'mt-2 pt-2 border-t border-slate-100 dark:border-slate-800')}>
                <div className="min-w-0">
                    <p className={cn('truncate', item.note ? 'text-xs font-medium text-slate-500' : 'font-semibold text-slate-900 dark:text-slate-50')}>{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        {t.owner?.name ?? 'Unassigned'}{t.project?.name ? `, ${t.project.name}` : ''}
                        {t.stage === 'blockers' && t.blocker?.name ? `, waiting on ${t.blocker.name}` : ''}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', st.chip)}>{st.label}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{t.progress_percent}%</span>
                </div>
            </div>
        </button>
    );
}

/* ─────────────── Full picture: everything, and for the PA, the curation controls ─────────────── */

function FullView({ brief, companies, companyName, scope, allCompanies, curate, onOpen }: {
    brief: Brief; companies: { id: string; name: string }[]; companyName: Record<string, string>; scope: string;
    allCompanies: boolean; curate: boolean; onOpen: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState<Partial<Record<BriefSection, boolean>>>({});
    const { data: today } = useBriefItems();
    const { add, remove, setNote } = useBriefMutations();
    const selected = useMemo(() => new Map((today?.items ?? []).map(i => [i.task_id, i])), [today]);
    const attention = brief.sections.urgent.length + brief.sections.blocked.length + brief.sections.stuck.length + brief.sections.overdue.length;

    const toggle = (t: BriefTask) => {
        if (selected.has(t.id)) remove.mutate(t.id, { onError: (e: Error) => toast.error(e.message) });
        else add.mutate({ taskId: t.id }, { onError: (e: Error) => toast.error(e.message) });
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="order-2 xl:order-1 space-y-6 min-w-0">
            <p className="text-[15px] text-ink-muted">
                {attention === 0 ? `${scope}: nothing needs attention.` : `${scope}: ${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} attention across ${brief.openCount} open tasks.`}
            </p>

            {curate && (
                <div className="sticky top-0 z-10 flex items-center gap-3 rounded-[10px] bg-ink px-4 py-3 text-sm text-white">
                    <Send className="h-4 w-4 shrink-0" />
                    <p className="flex-1">
                        <span className="font-semibold">{selected.size} selected</span> for Mr Blay today. Tap <Plus className="inline h-3.5 w-3.5" /> on an item to include it, then add a one-line note in your words.
                    </p>
                </div>
            )}

            {SECTIONS.map(s => {
                const items = brief.sections[s.key];
                if (items.length === 0) return null;
                const shown = expanded[s.key] ? items : items.slice(0, PREVIEW);
                return (
                    <section key={s.key} id={`brief-${s.key}`} className="scroll-mt-24 space-y-2">
                        <div className="flex items-baseline justify-between">
                            <h2 className={cn('flex items-center gap-2 text-[15px] font-semibold', s.tone)}>
                                <s.icon className="h-4 w-4" /> {s.title} <span className="font-semibold text-slate-400">{items.length}</span>
                            </h2>
                            <span className="hidden text-xs text-slate-400 sm:block">{s.hint}</span>
                        </div>
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                            {shown.map(t => {
                                const cName = companyName[companyOf(t) ?? ''] ?? '';
                                const pick = selected.get(t.id);
                                return (
                                    <li key={t.id} className={cn(pick && 'bg-blue-50/40 dark:bg-blue-950/20')}>
                                        <div className="flex items-start gap-2 pr-2">
                                            <button onClick={() => onOpen(t.id)} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(cName).primary }} title={cName} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{t.title}</span>
                                                    <span className={cn('block text-xs', s.key === 'done' ? 'text-slate-500' : s.tone)}>{reason(t, s.key)}</span>
                                                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                                        {t.owner?.name ?? 'Unassigned'}{t.project?.name ? `, ${t.project.name}` : ''}{allCompanies && cName ? `, ${cName}` : ''}
                                                    </span>
                                                </span>
                                                {!curate && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />}
                                            </button>
                                            {curate && (
                                                <button
                                                    onClick={() => toggle(t)}
                                                    aria-pressed={!!pick}
                                                    aria-label={pick ? 'Remove from Mr Blay’s brief' : 'Add to Mr Blay’s brief'}
                                                    className={cn('mt-2.5 h-8 w-8 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                                                        pick ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600')}
                                                >
                                                    {pick ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                </button>
                                            )}
                                        </div>
                                        {curate && pick && <NoteInput initial={pick.note ?? ''} onSave={note => setNote.mutate({ taskId: t.id, note })} />}
                                    </li>
                                );
                            })}
                        </ul>
                        {items.length > PREVIEW && (
                            <button onClick={() => setExpanded(e => ({ ...e, [s.key]: !e[s.key] }))} className="w-full rounded-lg py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {expanded[s.key] ? 'Show fewer' : `Show all ${items.length}`}
                            </button>
                        )}
                    </section>
                );
            })}
        </div>
        <aside className="order-1 xl:order-2 space-y-3 xl:sticky xl:top-4">
            <nav aria-label="Brief sections" className="rounded-[12px] border border-line bg-surface p-2">
                <ul>
                    {SECTIONS.map(sec => (
                        <li key={sec.key}>
                            <a href={`#brief-${sec.key}`} className="flex items-center gap-3 rounded-[8px] px-2.5 py-2 hover:bg-paper">
                                <sec.icon className={cn('h-4 w-4', sec.tone)} />
                                <span className="flex-1 text-sm text-ink">{sec.title}</span>
                                <span className={cn('text-sm font-bold tabular-nums', brief.sections[sec.key].length ? sec.tone : 'text-ink-faint')}>{brief.sections[sec.key].length}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            {allCompanies && (
                <ul className="rounded-[12px] border border-line bg-surface divide-y divide-line">
                    {companies.map(c => {
                        const stats = brief.byCompany[c.id] ?? { open: 0, atRisk: 0 };
                        return (
                            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="h-7 w-1 rounded-full" style={{ backgroundColor: getCompanyTheme(c.name).primary }} />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.name}</span>
                                <span className="text-[13px] text-ink-muted tabular-nums">{stats.open} open</span>
                                <span className={cn('w-16 text-right text-[13px] tabular-nums', stats.atRisk ? 'font-semibold text-blocked' : 'text-ink-faint')}>{stats.atRisk} at risk</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </aside>
        </div>
    );
}

function NoteInput({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
    const [value, setValue] = useState(initial);
    useEffect(() => setValue(initial), [initial]);
    return (
        <div className="px-4 pb-3 pl-9">
            <input
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={() => { if (value.trim() !== initial) onSave(value.trim()); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Your line for Mr Blay, e.g. Kofi expects ECG sign-off Tuesday; I'm following up daily."
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900 dark:bg-slate-950"
            />
        </div>
    );
}
