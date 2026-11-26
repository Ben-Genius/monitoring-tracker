import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Users2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useTasks, type Task } from '@/features/tasks/hooks/useTasks';
import { useUsers } from '@/features/users/hooks/useUsers';
import TaskDetailModal from '@/features/tasks/components/TaskDetailModal';
import { isStale, isUpdateOverdue } from '@/features/tasks/utils/accountability';
import { stageDef } from '@/features/tasks/utils/stages';
import { dayKey, toDay, today } from '@/features/schedule/utils/days';

/**
 * Workload: how much each person has on, what is slipping, and how their
 * next four weeks of deadlines are spread. For deciding who to give the next
 * task to, and spotting someone drowning before it shows up as missed dates.
 *
 * "Busy" is a simple, explainable line (more than BUSY_OPEN open tasks, or
 * more than BUSY_WEEK due in one week), not a capacity model people have to
 * maintain.
 */

const WEEKS = 4;
const BUSY_OPEN = 8;
const BUSY_WEEK = 4;

interface PersonLoad {
    id: string;
    name: string;
    role: string;
    open: Task[];
    overdue: number;
    blocked: number;
    stuck: number;
    unaccepted: number;
    perWeek: number[];
    noDeadline: number;
    busy: boolean;
}

export default function WorkloadPage() {
    const { selectedCompanyId } = useCompanyStore();
    const companyId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    const { data: tasks = [], isLoading } = useTasks({ company_id: companyId });
    const { data: users = [] } = useUsers(companyId);
    const [openPerson, setOpenPerson] = useState<string | null>(null);
    const [openTask, setOpenTask] = useState<string | null>(null);

    const weekStarts = useMemo(() => {
        const first = startOfWeek(today(), { weekStartsOn: 1 });
        return Array.from({ length: WEEKS }, (_, i) => addDays(first, i * 7));
    }, []);

    const { people, unassigned } = useMemo(() => {
        const now = Date.now();
        const t0 = today();
        const byOwner = new Map<string, Task[]>();
        let none = 0;
        for (const t of tasks) {
            if (t.stage === 'completed') continue;
            if (!t.assignee_id) { none++; continue; }
            byOwner.set(t.assignee_id, [...(byOwner.get(t.assignee_id) ?? []), t]);
        }
        const list: PersonLoad[] = users
            .filter(u => !(u as { deactivated_at?: string | null }).deactivated_at && u.role !== 'executive')
            .map(u => {
                const open = byOwner.get(u.id) ?? [];
                const perWeek = weekStarts.map(ws => open.filter(t => {
                    const d = toDay(t.due_date);
                    return d && d >= ws && d < addDays(ws, 7);
                }).length);
                const overdue = open.filter(t => { const d = toDay(t.due_date); return (d && d < t0) || isUpdateOverdue(t, now); }).length;
                return {
                    id: u.id, name: u.name, role: u.role, open,
                    overdue,
                    blocked: open.filter(t => t.stage === 'blockers').length,
                    stuck: open.filter(t => isStale(t, now)).length,
                    unaccepted: open.filter(t => !t.acknowledged_at).length,
                    perWeek,
                    noDeadline: open.filter(t => !t.due_date).length,
                    busy: open.length > BUSY_OPEN || perWeek.some(n => n > BUSY_WEEK),
                };
            })
            // Most loaded first; people with nothing on at the end, alphabetically.
            .sort((a, b) => b.open.length - a.open.length || a.name.localeCompare(b.name));
        return { people: list, unassigned: none };
    }, [tasks, users, weekStarts]);

    const maxWeek = Math.max(1, ...people.flatMap(p => p.perWeek));
    const busyCount = people.filter(p => p.busy).length;
    const free = people.filter(p => p.open.length === 0).length;
    const selected = people.find(p => p.id === openPerson);

    return (
        <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-16">
            <header className="space-y-1">
                <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight text-ink dark:text-slate-100">
                    <Users2 className="h-6 w-6 text-ink-muted" aria-hidden /> Workload
                </h1>
                <p className="max-w-2xl text-sm text-ink-muted dark:text-slate-400">
                    Who has how much on, and how their deadlines fall over the next four weeks. Use it before assigning new work.
                </p>
            </header>

            {isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-[12px]" />)}</div>
            ) : (
                <>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="People" value={people.length} />
                        <Stat label="Busy" value={busyCount} hint={`over ${BUSY_OPEN} open or ${BUSY_WEEK} due in a week`} />
                        <Stat label="With nothing on" value={free} />
                        <Stat label="Unassigned tasks" value={unassigned} />
                    </dl>

                    <section aria-labelledby="people-h" className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                        <h2 id="people-h" className="sr-only">People and their work</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-line text-left text-[12px] font-bold uppercase tracking-wide text-ink-muted dark:border-slate-800 dark:text-slate-400">
                                        <th scope="col" className="px-4 py-3">Person</th>
                                        <th scope="col" className="px-3 py-3 text-right">Open</th>
                                        <th scope="col" className="px-3 py-3 text-right">Overdue</th>
                                        <th scope="col" className="px-3 py-3 text-right">Blocked</th>
                                        <th scope="col" className="px-3 py-3 text-right">Stuck</th>
                                        {weekStarts.map((ws, i) => (
                                            <th key={i} scope="col" className="px-2 py-3 text-center">{i === 0 ? 'This week' : `w/c ${format(ws, 'd MMM')}`}</th>
                                        ))}
                                        <th scope="col" className="w-8" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {people.map(p => (
                                        <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-paper/60 dark:border-slate-800 dark:hover:bg-slate-800/40">
                                            <th scope="row" className="px-4 py-2.5 text-left font-normal">
                                                <button type="button" onClick={() => setOpenPerson(p.id)} className="text-left">
                                                    <span className="block font-semibold text-ink hover:underline dark:text-slate-100">{p.name}</span>
                                                    <span className="text-[12px] capitalize text-ink-muted dark:text-slate-400">
                                                        {p.role === 'pa' ? 'PA' : p.role === 'employee' ? 'Staff' : p.role}
                                                        {p.busy && <span className="ml-1.5 rounded bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-ink">Busy</span>}
                                                    </span>
                                                </button>
                                            </th>
                                            <td className="px-3 py-2.5 text-right text-[15px] font-semibold tabular-nums text-ink dark:text-slate-100">{p.open.length}</td>
                                            <Num n={p.overdue} red />
                                            <Num n={p.blocked} red />
                                            <Num n={p.stuck} />
                                            {p.perWeek.map((n, i) => (
                                                <td key={i} className="px-2 py-2.5">
                                                    <div className="mx-auto flex h-7 w-14 items-end overflow-hidden rounded-[5px] bg-paper dark:bg-slate-800" title={`${n} due`}>
                                                        <div className={cn('w-full', n > BUSY_WEEK ? 'bg-ink dark:bg-slate-200' : 'bg-progress/40')} style={{ height: `${(n / maxWeek) * 100}%` }} />
                                                    </div>
                                                    <span className="sr-only">{n} due</span>
                                                    <span aria-hidden className="block text-center text-[11px] tabular-nums text-ink-muted">{n || ''}</span>
                                                </td>
                                            ))}
                                            <td className="pr-3 text-ink-faint"><ChevronRight className="h-4 w-4" aria-hidden /></td>
                                        </tr>
                                    ))}
                                    {people.length === 0 && (
                                        <tr><td colSpan={6 + WEEKS} className="px-4 py-8 text-center text-ink-muted">No people to show for this company.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {selected && (
                        <section aria-labelledby="person-h" className="rounded-[14px] border border-line bg-surface p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 id="person-h" className="text-lg font-bold text-ink dark:text-slate-100">{selected.name}</h2>
                                    <p className="text-sm text-ink-muted dark:text-slate-400">
                                        {selected.open.length} open · {selected.unaccepted} not accepted · {selected.noDeadline} without a deadline
                                    </p>
                                </div>
                                <button type="button" onClick={() => setOpenPerson(null)} className="h-9 rounded-[8px] px-3 text-sm font-semibold text-ink-muted hover:text-ink">Close</button>
                            </div>
                            <ul className="mt-3 divide-y divide-line dark:divide-slate-800">
                                {[...selected.open].sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')).map(t => {
                                    const late = !!t.due_date && t.due_date < dayKey(today());
                                    return (
                                        <li key={t.id}>
                                            <button type="button" onClick={() => setOpenTask(t.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/60 dark:hover:bg-slate-800/40">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-ink dark:text-slate-100">{t.title}</span>
                                                    <span className="block truncate text-[12px] text-ink-muted dark:text-slate-400">{t.project?.name ?? 'No project'} · {stageDef(t.stage).label}</span>
                                                </span>
                                                <span className={cn('shrink-0 text-[12px] tabular-nums', late || t.stage === 'blockers' ? 'font-semibold text-blocked dark:text-red-300' : 'text-ink-muted')}>
                                                    {t.due_date ? format(toDay(t.due_date)!, 'd MMM') : 'No deadline'}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                                {selected.open.length === 0 && <li className="py-3 text-sm text-ink-muted">Nothing open. Free to take something on.</li>}
                            </ul>
                        </section>
                    )}
                </>
            )}

            <TaskDetailModal taskId={openTask} open={!!openTask} onClose={() => setOpenTask(null)} onOpenTask={setOpenTask} />
        </div>
    );
}

function Stat({ label, value, hint, attention }: { label: string; value: number; hint?: string; attention?: boolean }) {
    return (
        <div className="rounded-[12px] border border-line bg-surface p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <dt className="text-[12px] font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">{label}</dt>
            <dd className={cn('mt-1 text-[28px] font-bold leading-none tabular-nums', attention ? 'text-blocked dark:text-red-300' : 'text-ink dark:text-slate-100')}>{value}</dd>
            {hint && <dd className="mt-1 text-[11px] text-ink-faint">{hint}</dd>}
        </div>
    );
}

function Num({ n, red }: { n: number; red?: boolean }) {
    return (
        <td className={cn('px-3 py-2.5 text-right tabular-nums', n > 0 && red ? 'font-semibold text-blocked dark:text-red-300' : n > 0 ? 'font-medium text-ink dark:text-slate-100' : 'text-ink-faint')}>
            {n || '–'}
        </td>
    );
}
