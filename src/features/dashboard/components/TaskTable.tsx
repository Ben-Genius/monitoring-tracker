import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ListChecks, Search } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { cn, getCompanyTheme } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { STAGES } from '@/features/tasks/utils/stages';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, Card, CardHeader, PriorityChip, StageDot } from './primitives';
import { PRIORITY_WEIGHT, tx } from './tokens';

const ROWS = 8;
type Filter = 'open' | Task['stage'];

const dueTime = (t: Task) => (t.due_date ? parseISO(t.due_date).getTime() : Infinity);

export default function TaskTable({ tasks, isLoading, showCompany }: { tasks: Task[]; isLoading: boolean; showCompany: boolean }) {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<Filter>('open');

    const rows = useMemo(() => {
        const term = q.trim().toLowerCase();
        return tasks
            .filter(t => (filter === 'open' ? t.stage !== 'completed' : t.stage === filter))
            .filter(t => !term
                || t.title.toLowerCase().includes(term)
                || t.project?.name?.toLowerCase().includes(term)
                || t.assignee?.name?.toLowerCase().includes(term))
            // Most pressing first: priority, then the nearest deadline.
            .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || dueTime(a) - dueTime(b));
    }, [tasks, q, filter]);

    const now = new Date();

    return (
        <Card aria-labelledby="tasklist-heading">
            <div className="flex flex-col gap-3 pr-5 sm:flex-row sm:items-center sm:justify-between">
                <CardHeader id="tasklist-heading" icon={ListChecks} title="Task list" />
                <div className="flex gap-2 pl-5 sm:pl-0">
                    <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                        <span className="sr-only">Search tasks</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                        <input
                            type="search"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search tasks"
                            className="h-10 w-full rounded-[8px] border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-progress dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </label>
                    <label className="relative">
                        <span className="sr-only">Filter by stage</span>
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value as Filter)}
                            className="h-10 cursor-pointer appearance-none rounded-[8px] border border-line bg-surface pl-3 pr-8 text-sm font-medium text-ink outline-none focus:border-progress dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            <option value="open">All open</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                    </label>
                </div>
            </div>

            <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className={cn('border-y border-line text-left text-[12px] dark:border-slate-800', tx.muted)}>
                            <th scope="col" className="px-5 py-2.5 font-medium">Task</th>
                            <th scope="col" className="px-3 py-2.5 font-medium">Priority</th>
                            <th scope="col" className="px-3 py-2.5 font-medium">Created</th>
                            <th scope="col" className="px-3 py-2.5 font-medium">Owner</th>
                            <th scope="col" className="px-3 py-2.5 font-medium">Due</th>
                            <th scope="col" className="px-5 py-2.5 font-medium">Stage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line dark:divide-slate-800">
                        {isLoading && Array.from({ length: 4 }, (_, i) => (
                            <tr key={i}><td colSpan={6} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td></tr>
                        ))}
                        {!isLoading && rows.slice(0, ROWS).map(t => {
                            const late = t.stage !== 'completed' && t.due_date && differenceInCalendarDays(now, parseISO(t.due_date)) > 0;
                            const company = t.project?.company?.name ?? '';
                            return (
                                <tr
                                    key={t.id}
                                    onClick={() => navigate(`/tasks?task=${t.id}`)}
                                    className="cursor-pointer hover:bg-paper/70 dark:hover:bg-slate-800/50"
                                >
                                    <td className="max-w-[320px] px-5 py-3">
                                        <Link
                                            to={`/tasks?task=${t.id}`}
                                            onClick={e => e.stopPropagation()}
                                            className={cn('block truncate font-semibold hover:underline', tx.ink)}
                                        >
                                            {t.title}
                                        </Link>
                                        <span className={cn('flex items-center gap-1.5 truncate text-[12.5px]', tx.muted)}>
                                            {showCompany && company && (
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(company).primary }} title={company} />
                                            )}
                                            {t.project?.name ?? 'No project'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3"><PriorityChip priority={t.priority} /></td>
                                    <td className={cn('whitespace-nowrap px-3 py-3 tabular-nums', tx.muted)}>{format(parseISO(t.created_at), 'd MMM yyyy')}</td>
                                    <td className="px-3 py-3">
                                        <span className="flex items-center gap-2">
                                            <Avatar name={t.assignee?.name} />
                                            <span className={cn('truncate', t.assignee?.name ? tx.ink : tx.faint)}>{t.assignee?.name ?? 'Unassigned'}</span>
                                        </span>
                                    </td>
                                    <td className={cn('whitespace-nowrap px-3 py-3 tabular-nums', late ? 'font-semibold text-blocked dark:text-red-300' : tx.muted)}>
                                        {t.due_date ? format(parseISO(t.due_date), 'd MMM yyyy') : 'No date'}
                                    </td>
                                    <td className="px-5 py-3"><StageDot stage={t.stage} /></td>
                                </tr>
                            );
                        })}
                        {!isLoading && rows.length === 0 && (
                            <tr><td colSpan={6} className={cn('px-5 py-10 text-center', tx.muted)}>
                                {q ? `No tasks match “${q}”.` : 'No tasks in this stage.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {rows.length > ROWS && (
                <p className={cn('flex items-center justify-between border-t border-line px-5 py-3 text-[13px] dark:border-slate-800', tx.muted)}>
                    Showing {ROWS} of {rows.length}
                    <Link to={q ? `/tasks?q=${encodeURIComponent(q)}` : '/tasks'} className="font-semibold text-progress hover:underline dark:text-blue-300">
                        View all on the task board
                    </Link>
                </p>
            )}
        </Card>
    );
}
