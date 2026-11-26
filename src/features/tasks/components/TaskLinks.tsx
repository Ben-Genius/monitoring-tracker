import { useId, useState } from 'react';
import { Link2, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { dayLabel, toDay } from '@/features/schedule/utils/days';
import { stageDef } from '../utils/stages';
import { useLinkCandidates, useLinkTasks, useTaskLinks, type LinkedTask } from '../hooks/useTaskLinks';

/**
 * "Waits on" and "Holding up" for one task. Hidden entirely until the
 * dependencies migration is in place (the query errors, nothing shows).
 */
export default function TaskLinks({ taskId, canEdit, onOpen, startDate, dueDate }: {
    taskId: string;
    canEdit: boolean;
    onOpen: (id: string) => void;
    /** This task's planned start and deadline, to warn when they come before what it waits on. */
    startDate?: string | null;
    dueDate?: string | null;
}) {
    const { data, isError } = useTaskLinks(taskId);
    const { add, remove } = useLinkTasks();
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const { data: candidates = [], isFetching } = useLinkCandidates(taskId, search);
    const inputId = useId();

    if (isError || !data) return null;
    const open = data.waitsOn.filter(t => t.stage !== 'completed').length;
    const already = new Set(data.waitsOn.map(t => t.id));
    // Same rule as the timeline's red lines (TaskTimeline.tsx).
    const start = toDay(startDate), due = toDay(dueDate);
    const tooEarly = data.waitsOn.filter(t => {
        const theirs = toDay(t.due_date);
        return t.stage !== 'completed' && !!theirs && ((!!due && due < theirs) || (!!start && start < theirs));
    });

    const row = (t: LinkedTask, removable: boolean) => {
        const done = t.stage === 'completed';
        return (
            <li key={t.id} className="flex items-center gap-2">
                <button type="button" onClick={() => onOpen(t.id)}
                    className={cn('min-w-0 flex-1 truncate rounded-md py-1 text-left text-sm hover:underline', done ? 'text-ink-muted line-through' : 'text-ink dark:text-slate-100')}>
                    {t.title}
                </button>
                <span className={cn('shrink-0 text-[11px] font-semibold', done ? 'text-ink-faint' : t.stage === 'blockers' ? 'text-blocked' : 'text-ink-muted')}>
                    {done ? <Check className="inline h-3.5 w-3.5" aria-label="Done" /> : stageDef(t.stage).label}
                </span>
                {removable && (
                    <button type="button" aria-label={`Stop waiting on ${t.title}`}
                        onClick={() => remove.mutate({ taskId, dependsOn: t.id }, { onError: e => toast.error((e as Error).message) })}
                        className="icon-btn h-7 w-7 shrink-0"><X className="h-3.5 w-3.5" /></button>
                )}
            </li>
        );
    };

    return (
        <div className="space-y-3">
            <div>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    <Link2 className="h-3.5 w-3.5" aria-hidden /> Waits on
                    {open > 0 && <span className="rounded bg-ink/10 px-1.5 text-ink dark:bg-white/10 dark:text-slate-100">{open} open</span>}
                </p>
                {tooEarly.length > 0 && (
                    <p role="note" className="mb-2 flex gap-1.5 rounded-lg border border-blocked/30 bg-blocked/5 px-2.5 py-2 text-[13px] text-ink dark:border-red-400/30 dark:bg-red-400/10 dark:text-slate-100">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blocked dark:text-red-400" aria-hidden />
                        <span>
                            Planned to {start && tooEarly.some(t => start < toDay(t.due_date)!) ? 'start' : 'finish'} before {tooEarly.length === 1
                                ? <><strong className="font-semibold">{tooEarly[0].title}</strong> is due ({dayLabel(toDay(tooEarly[0].due_date)!)})</>
                                : <>{tooEarly.length} tasks it waits on are due</>}. Move the dates or check the order.
                        </span>
                    </p>
                )}
                {data.waitsOn.length ? <ul className="space-y-0.5">{data.waitsOn.map(t => row(t, canEdit))}</ul>
                    : <p className="text-sm text-ink-muted">Nothing. It can start any time.</p>}

                {canEdit && (adding ? (
                    <div className="mt-2 space-y-1.5">
                        <label htmlFor={inputId} className="sr-only">Find a task this one waits on</label>
                        <input id={inputId} autoFocus value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setSearch(''); } }}
                            placeholder="Type a task name"
                            className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                        {search.trim().length >= 2 && (
                            <ul className="max-h-48 overflow-auto rounded-lg border border-line bg-surface p-1 dark:border-slate-700 dark:bg-slate-900" aria-label="Matching tasks">
                                {candidates.filter(c => !already.has(c.id)).map(c => (
                                    <li key={c.id}>
                                        <button type="button"
                                            onClick={() => add.mutate({ taskId, dependsOn: c.id }, {
                                                onSuccess: () => { setAdding(false); setSearch(''); toast.success('Added'); },
                                                onError: e => toast.error((e as Error).message),
                                            })}
                                            className="flex min-h-10 w-full flex-col justify-center rounded-md px-2 text-left hover:bg-paper dark:hover:bg-slate-800">
                                            <span className="truncate text-sm font-medium text-ink dark:text-slate-100">{c.title}</span>
                                            {c.project?.name && <span className="truncate text-[11px] text-ink-muted">{c.project.name}</span>}
                                        </button>
                                    </li>
                                ))}
                                {!isFetching && candidates.filter(c => !already.has(c.id)).length === 0 && (
                                    <li className="px-2 py-2 text-sm text-ink-muted">No open tasks match.</li>
                                )}
                            </ul>
                        )}
                    </div>
                ) : (
                    <button type="button" onClick={() => setAdding(true)} className="mt-1 text-[13px] font-semibold text-ink-muted hover:text-ink">
                        + Add a task it waits on
                    </button>
                ))}
            </div>

            {data.holdsUp.length > 0 && (
                <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Holding up</p>
                    <ul className="space-y-0.5">{data.holdsUp.map(t => row(t, false))}</ul>
                </div>
            )}
        </div>
    );
}
