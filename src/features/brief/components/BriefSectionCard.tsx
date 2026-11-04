import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { stageDef } from '@/features/tasks/utils/stages';
import { companyOf, type BriefTask } from '../hooks/useBrief';
import type { BriefItem } from '../hooks/useBriefItems';
import { reason, type SectionMeta } from '../utils/briefMeta';

const PREVIEW = 5;

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
    onNote: (taskId: string, note: string) => void;
}

export default function BriefSectionCard({ meta, items, companyName, allCompanies, curate, selected, expanded, onToggleExpanded, onOpen, onToggle, onNote }: Props) {
    const shown = expanded ? items : items.slice(0, PREVIEW);
    const headingId = `brief-${meta.key}-heading`;

    return (
        <Card id={`brief-${meta.key}`} aria-labelledby={headingId} className="scroll-mt-4">
            <CardHeader
                id={headingId}
                icon={meta.icon}
                title={meta.title}
                count={items.length}
                action={<span className={cn('hidden text-[12.5px] sm:block', tx.muted)}>{meta.hint}</span>}
            />
            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                {shown.map(t => {
                    const cName = companyName[companyOf(t) ?? ''] ?? '';
                    const pick = selected.get(t.id);
                    return (
                        <li key={t.id} className={cn(pick && 'bg-paper dark:bg-slate-800/50')}>
                            <div className="flex items-center gap-2 pr-4">
                                <button
                                    onClick={() => onOpen(t.id)}
                                    className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3.5 text-left hover:bg-paper/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/50"
                                >
                                    <Avatar name={t.owner?.name} size={32} />
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block text-sm font-semibold', tx.ink)}>{t.title}</span>
                                        <span className={cn('mt-0.5 block text-[12.5px] leading-snug', meta.severe ? 'text-red-700 dark:text-red-300' : tx.muted)}>{reason(t, meta.key)}</span>
                                        <span className={cn('mt-1 flex items-center truncate text-[12px]', tx.faint)}>
                                            <span className="truncate">
                                                {t.owner?.name ?? 'Unassigned'}{t.project?.name ? ` · ${t.project.name}` : ''}{allCompanies && cName ? ` · ${cName}` : ''}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                                        <span className={cn('whitespace-nowrap text-[13px] font-medium', tx.ink)}>{stageDef(t.stage).label}</span>
                                        <Progress value={t.progress_percent} />
                                    </span>
                                    {!curate && <ChevronRight className={cn('h-4 w-4 shrink-0', tx.faint)} aria-hidden />}
                                </button>
                                {curate && (
                                    <button
                                        onClick={() => onToggle(t)}
                                        aria-pressed={!!pick}
                                        aria-label={pick ? 'Remove from Mr Blay’s brief' : 'Add to Mr Blay’s brief'}
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
                })}
            </ul>
            {items.length > PREVIEW && (
                <button
                    onClick={onToggleExpanded}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-line py-3 text-[13px] font-semibold text-ink hover:bg-paper/70 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800/50"
                >
                    {expanded ? <>Show fewer <ChevronUp className="h-4 w-4" aria-hidden /></> : <>Show all {items.length} <ChevronDown className="h-4 w-4" aria-hidden /></>}
                </button>
            )}
        </Card>
    );
}

function Progress({ value }: { value: number }) {
    const pct = Math.min(Math.max(value ?? 0, 0), 100);
    return (
        <span className="flex items-center gap-2" role="img" aria-label={`${pct}% done`}>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line dark:bg-slate-700">
                <span className="block h-full rounded-full bg-slate-500 dark:bg-slate-400" style={{ width: `${pct}%` }} />
            </span>
            <span className={cn('w-8 text-right text-[12px] tabular-nums', tx.muted)}>{pct}%</span>
        </span>
    );
}

function NoteInput({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
    const [value, setValue] = useState(initial);
    useEffect(() => setValue(initial), [initial]);
    return (
        <div className="px-5 pb-3.5 pl-[68px]">
            <input
                aria-label="Your line for Mr Blay"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={() => { if (value.trim() !== initial) onSave(value.trim()); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Your line for Mr Blay, e.g. Kofi expects ECG sign-off Tuesday; I'm following up daily."
                className="h-10 w-full rounded-[8px] border border-line-strong bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
        </div>
    );
}
