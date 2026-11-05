import { useEffect, useId, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, FolderKanban, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daysSinceMovement } from '@/features/tasks/utils/accountability';
import { Avatar, Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { companyOf, type BriefSection, type BriefTask } from '../hooks/useBrief';
import type { BriefItem } from '../hooks/useBriefItems';
import { daysLate, reason, type SectionMeta } from '../utils/briefMeta';

const PREVIEW = 5;
/** A project with this many tasks in one section is shown as one row, so a backlog reads as one fact. */
const GROUP_MIN = 3;
const GROUPED: BriefSection[] = ['stuck', 'overdue', 'unaccepted'];

type Entry =
    | { kind: 'task'; t: BriefTask }
    | { kind: 'group'; key: string; project: string; tasks: BriefTask[] };

interface Props {
    meta: SectionMeta;
    items: BriefTask[];
    companyName: Record<string, string>;
    allCompanies: boolean;
    /** The PA's mode: each row can be added to the executive's brief. */
    curate: boolean;
    selected: Map<string, BriefItem>;
    expanded: boolean;
    onToggleExpanded: () => void;
    onOpen: (id: string) => void;
    onToggle: (t: BriefTask) => void;
    onNote: (taskId: string, note: string) => Promise<unknown>;
}

/**
 * Keeps the section's own order (most serious first); a group sits where its first task would.
 * Tasks with no project group by company instead, since they pile up the same way.
 */
function toEntries(section: BriefSection, items: BriefTask[], companyName: Record<string, string>): Entry[] {
    if (!GROUPED.includes(section)) return items.map(t => ({ kind: 'task', t }));
    const label = (t: BriefTask) => t.project?.name ?? (companyName[companyOf(t) ?? ''] ? `${companyName[companyOf(t) ?? '']}, no project` : null);
    const byLabel = new Map<string, BriefTask[]>();
    items.forEach(t => { const l = label(t); if (l) byLabel.set(l, [...(byLabel.get(l) ?? []), t]); });
    const placed = new Set<string>();
    const out: Entry[] = [];
    for (const t of items) {
        const name = label(t);
        const group = name ? byLabel.get(name)! : null;
        if (name && group && group.length >= GROUP_MIN) {
            if (!placed.has(name)) { placed.add(name); out.push({ kind: 'group', key: `${section}-${name}`, project: name, tasks: group }); }
        } else out.push({ kind: 'task', t });
    }
    return out;
}

function groupSummary(section: BriefSection, tasks: BriefTask[]): string {
    const n = `${tasks.length} tasks`;
    if (section === 'overdue') {
        const worst = Math.max(...tasks.map(t => daysLate(t.due_date)));
        return worst > 0 ? `${n} overdue, the oldest ${worst} days late` : `${n} with a promised update not received`;
    }
    if (section === 'stuck') return `${n} with no movement, the longest for ${Math.max(...tasks.map(t => daysSinceMovement(t) ?? 0))} days`;
    return `${n} not yet accepted by their owners`;
}

function people(tasks: BriefTask[]): string {
    const names = [...new Set(tasks.map(t => t.owner?.name ?? 'Unassigned'))];
    return names.length === 1 ? names[0] : `${names[0]} and ${names.length - 1} other${names.length === 2 ? '' : 's'}`;
}

export default function BriefSectionCard({ meta, items, companyName, allCompanies, curate, selected, expanded, onToggleExpanded, onOpen, onToggle, onNote }: Props) {
    const entries = useMemo(() => toEntries(meta.key, items, companyName), [meta.key, items, companyName]);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const shown = expanded ? entries : entries.slice(0, PREVIEW);
    const headingId = `brief-${meta.key}-heading`;

    const row = (t: BriefTask, nested = false) => (
        <TaskRow
            key={t.id} t={t} meta={meta} nested={nested}
            cName={allCompanies ? companyName[companyOf(t) ?? ''] ?? '' : ''}
            curate={curate} pick={selected.get(t.id)}
            onOpen={onOpen} onToggle={onToggle} onNote={onNote}
        />
    );

    return (
        <Card
            id={`brief-${meta.key}`}
            aria-labelledby={headingId}
            // Only the two states that cannot wait get a red edge, and only when they have items.
            className={cn('scroll-mt-4 overflow-hidden shadow-card dark:shadow-none', meta.severe && items.length > 0 && 'border-t-2 border-t-blocked dark:border-t-red-400')}
        >
            <CardHeader
                id={headingId}
                icon={meta.icon}
                title={meta.title}
                count={items.length}
                action={<span className={cn('hidden text-[13px] sm:block', tx.muted)}>{meta.hint}</span>}
            />
            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                {shown.map(e => {
                    if (e.kind === 'task') return row(e.t);
                    const open = !!openGroups[e.key];
                    // A no-project group already names its company in the title.
                    const company = allCompanies && e.tasks[0].project ? companyName[companyOf(e.tasks[0]) ?? ''] : '';
                    const picked = e.tasks.filter(t => selected.has(t.id)).length;
                    return (
                        <li key={e.key}>
                            <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => setOpenGroups(g => ({ ...g, [e.key]: !g[e.key] }))}
                                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/50"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-paper dark:border-slate-700 dark:bg-slate-800">
                                    <FolderKanban className={cn('h-4 w-4', tx.muted)} aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn('block truncate text-[15px] font-semibold', tx.ink)} title={e.project}>{e.project}</span>
                                    <span className={cn('mt-0.5 block text-[14px] leading-snug', tx.muted)}>{groupSummary(meta.key, e.tasks)}</span>
                                    <span className={cn('mt-1 block truncate text-[13px]', tx.faint)}>
                                        {people(e.tasks)}{company ? ` · ${company}` : ''}{curate && picked ? ` · ${picked} in Mr Blay’s brief` : ''}
                                    </span>
                                </span>
                                <span className={cn('flex shrink-0 items-center gap-1 text-[13px] font-medium', tx.ink)}>
                                    {open ? 'Hide' : 'Show'} {e.tasks.length}
                                    {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                                </span>
                            </button>
                            {open && (
                                <ul className="divide-y divide-line border-t border-line bg-paper/40 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/30">
                                    {e.tasks.map(t => row(t, true))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
            {entries.length > PREVIEW && (
                <button
                    onClick={onToggleExpanded}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-line py-3 text-[13px] font-semibold text-ink hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/50"
                >
                    {expanded ? <>Show fewer <ChevronUp className="h-4 w-4" aria-hidden /></> : <>Show {entries.length - PREVIEW} more <ChevronDown className="h-4 w-4" aria-hidden /></>}
                </button>
            )}
        </Card>
    );
}

function TaskRow({ t, meta, nested, cName, curate, pick, onOpen, onToggle, onNote }: {
    t: BriefTask; meta: SectionMeta; nested: boolean; cName: string; curate: boolean; pick?: BriefItem;
    onOpen: (id: string) => void; onToggle: (t: BriefTask) => void; onNote: (taskId: string, note: string) => Promise<unknown>;
}) {
    // Inside a project group the project is already named, so the meta line drops it.
    const metaLine = [t.owner?.name ?? 'Unassigned', !nested && t.project?.name, cName].filter(Boolean).join(' · ');
    return (
        <li className={cn(pick && 'bg-paper dark:bg-slate-800/50')}>
            <div className="flex items-center gap-2 pr-4">
                <button
                    onClick={() => onOpen(t.id)}
                    className={cn('flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-2 text-left hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/50', nested ? 'pl-[72px]' : 'pl-5')}
                >
                    {!nested && <Avatar name={t.owner?.name} size={36} />}
                    <span className="min-w-0 flex-1">
                        <span className={cn('block text-[15px] font-semibold', tx.ink)}>{t.title}</span>
                        <span className={cn('mt-0.5 block text-[14px] leading-snug', meta.severe ? 'text-red-700 dark:text-red-300' : tx.muted)}>{reason(t, meta.key)}</span>
                        <span className={cn('mt-1 block truncate text-[13px]', tx.faint)} title={metaLine}>{metaLine}</span>
                    </span>
                    {!curate && <ChevronRight className={cn('h-4 w-4 shrink-0', tx.faint)} aria-hidden />}
                </button>
                {curate && (
                    <button
                        onClick={() => onToggle(t)}
                        aria-pressed={!!pick}
                        aria-label={pick ? `Remove “${t.title}” from Mr Blay’s brief` : `Add “${t.title}” to Mr Blay’s brief`}
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                            pick
                                ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink'
                                : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-300 dark:hover:text-slate-100'
                        )}
                    >
                        {pick ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                    </button>
                )}
            </div>
            {curate && pick && <NoteInput initial={pick.note ?? ''} onSave={note => onNote(t.id, note)} />}
        </li>
    );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function NoteInput({ initial, onSave }: { initial: string; onSave: (note: string) => Promise<unknown> }) {
    const [value, setValue] = useState(initial);
    const [state, setState] = useState<SaveState>('idle');
    const inputId = useId();
    const statusId = useId();
    useEffect(() => setValue(initial), [initial]);

    const save = async () => {
        const next = value.trim();
        if (next === initial && state !== 'error') return;
        setState('saving');
        try {
            await onSave(next);
            setState('saved');
        } catch {
            // Keep the typed text in the box so nothing is lost; blur or Enter retries.
            setState('error');
        }
    };

    return (
        <div className="px-5 pb-4 pl-[68px]">
            <div className="mb-1 flex items-baseline justify-between gap-3">
                <label htmlFor={inputId} className="block text-xs font-semibold text-ink dark:text-slate-200">Your line for Mr Blay</label>
                <span id={statusId} role="status" className={cn('text-[12px]', state === 'error' ? 'font-semibold text-blocked dark:text-red-300' : tx.muted)}>
                    {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Couldn’t save. Press Enter to try again.' : ''}
                </span>
            </div>
            <input
                id={inputId}
                value={value}
                aria-describedby={statusId}
                aria-invalid={state === 'error'}
                onChange={e => { setValue(e.target.value); if (state === 'saved') setState('idle'); }}
                onBlur={save}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
                placeholder="e.g. Kofi expects ECG sign-off Tuesday; I'm following up daily."
                className={cn(
                    'h-10 w-full rounded-[8px] border bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/10 dark:bg-slate-950 dark:text-slate-100',
                    state === 'error' ? 'border-blocked dark:border-red-400' : 'border-line-strong dark:border-slate-600'
                )}
            />
        </div>
    );
}
