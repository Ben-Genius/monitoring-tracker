import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import type { Person } from '../hooks/usePeople';

const SHOWN = 6;

interface Props {
    people: Person[];
    unassigned: number;
    onOpen: (p: Person) => void;
}

/**
 * Open tasks per person on one shared scale, so an overloaded person and an idle
 * one are visible at a glance. The overdue share of each bar is the only red.
 */
export default function WorkloadPanel({ people, unassigned, onOpen }: Props) {
    const loaded = people.filter(p => p.open > 0).sort((a, b) => b.open - a.open || b.overdue - a.overdue);
    const totalOpen = loaded.reduce((s, p) => s + p.open, 0);
    const max = loaded[0]?.open ?? 0;
    const idle = people.length - loaded.length;
    const top = loaded[0];
    const topShare = top && totalOpen ? Math.round((top.open / totalOpen) * 100) : 0;

    return (
        <Card aria-labelledby="load-heading" className="flex flex-col">
            <CardHeader
                id="load-heading"
                icon={Scale}
                title="Who's carrying the work"
                action={<span className={cn('text-[12.5px] tabular-nums', tx.muted)}>{totalOpen} open tasks assigned</span>}
            />
            <div className="flex flex-1 flex-col border-t border-line px-5 pb-5 pt-4 dark:border-slate-800">
                {loaded.length === 0 ? (
                    <p className={cn('text-sm', tx.muted)}>No one has open tasks right now.</p>
                ) : (
                    <>
                        <p className={cn('text-[15px] leading-snug', tx.ink)}>
                            {topShare >= 40
                                ? <><span className="font-bold">{top.name.split(' ')[0]}</span> holds <span className="font-bold tabular-nums">{topShare}%</span> of the assigned work{idle ? <>, while <span className="font-bold tabular-nums">{idle}</span> {idle === 1 ? 'person has' : 'people have'} none</> : null}.</>
                                : <>Work is spread across <span className="font-bold tabular-nums">{loaded.length}</span> people{idle ? <>; <span className="font-bold tabular-nums">{idle}</span> have none</> : null}.</>}
                        </p>
                        <ul className="mt-3 space-y-1">
                            {loaded.slice(0, SHOWN).map(p => (
                                <li key={p.id}>
                                    <button type="button" onClick={() => onOpen(p)} className="group grid w-full grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3 rounded-[8px] px-1.5 py-1.5 text-left hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:hover:bg-slate-800/60">
                                        <span className={cn('truncate text-[13px] font-medium', tx.ink)}>{p.name}</span>
                                        <span className="flex h-2.5 overflow-hidden rounded-full bg-line dark:bg-slate-800" role="img" aria-label={`${p.open} open, ${p.overdue} overdue`}>
                                            <span className="flex h-full" style={{ width: `${(p.open / max) * 100}%` }}>
                                                <span className="h-full bg-slate-600 dark:bg-slate-300" style={{ width: `${((p.open - p.overdue) / p.open) * 100}%` }} />
                                                <span className="h-full bg-blocked dark:bg-red-400" style={{ width: `${(p.overdue / p.open) * 100}%` }} />
                                            </span>
                                        </span>
                                        <span className={cn('text-right text-[13px] tabular-nums', tx.ink)}>
                                            <span className="font-semibold">{p.open}</span>
                                            {p.overdue > 0 && <span className="text-blocked dark:text-red-300"> · {p.overdue}</span>}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className={cn('mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]', tx.muted)}>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-600 dark:bg-slate-300" aria-hidden /> Open</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blocked dark:bg-red-400" aria-hidden /> Overdue</span>
                            {loaded.length > SHOWN && <span>+{loaded.length - SHOWN} more in the list below</span>}
                        </p>
                    </>
                )}
                {unassigned > 0 && (
                    <p className={cn('mt-auto border-t border-line pt-3 text-[13px] dark:border-slate-800', tx.ink)}>
                        <span className="font-semibold tabular-nums">{unassigned}</span> open {unassigned === 1 ? 'task has' : 'tasks have'} no owner.{' '}
                        <Link to="/tasks" className="font-semibold text-progress hover:underline dark:text-blue-300">Assign them on the task board</Link>
                    </p>
                )}
            </div>
        </Card>
    );
}
