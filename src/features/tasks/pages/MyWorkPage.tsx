import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { useAcknowledgeTask, useTasks, type Task } from '../hooks/useTasks';
import { useTaskMover } from '../components/TaskMover';
import { awaitingAcceptance, daysSinceMovement, isStale, isUpdateOverdue, PROGRESS_STEPS } from '../utils/accountability';
import { useWaitingCounts } from '../hooks/useTaskLinks';

/**
 * My work: the phone-first page for the people doing the work. Every open
 * task assigned to you, the ones waiting on you first, each with the one
 * action it needs next under your thumb.
 *
 * Accepting is a single tap. Progress, blocked and done open the usual update
 * sheet already set to what you tapped, so the update still says what moved
 * (and Done still needs proof) without hunting through the board.
 */

type Why = 'accept' | 'blocked' | 'stuck' | 'overdue' | 'urgent' | null;

function whyItNeedsYou(t: Task, now: number): Why {
    if (awaitingAcceptance(t)) return 'accept';
    if (t.stage === 'blockers') return 'blocked';
    if (isStale(t, now)) return 'stuck';
    if (isUpdateOverdue(t, now) || (!!t.due_date && new Date(t.due_date).getTime() < now)) return 'overdue';
    if (t.is_urgent) return 'urgent';
    return null;
}

function statusLine(t: Task, why: Why): string {
    switch (why) {
        case 'accept': return 'Assigned to you. Accept it so your lead knows you have it.';
        case 'blocked': return t.blocker?.name ? `Blocked, waiting on ${t.blocker.name}` : `Blocked: ${t.blocker_description || 'no reason given'}`;
        case 'stuck': return `No update for ${daysSinceMovement(t)} days`;
        case 'overdue':
            return t.due_date && new Date(t.due_date).getTime() < Date.now()
                ? `Deadline was ${formatDate(t.due_date)}`
                : `Update was due ${t.next_update_due ? formatDate(t.next_update_due) : 'already'}`;
        case 'urgent':
        default:
            if (t.stage === 'in_progress') return `In progress${t.due_date ? `, due ${formatDate(t.due_date)}` : ''}`;
            return t.due_date ? `Not started, due ${formatDate(t.due_date)}` : 'Not started';
    }
}

// 44px tall on every screen: these are pressed with a thumb, often outdoors.
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[15px] font-semibold transition-colors disabled:opacity-60';
const primary = cn(btn, 'bg-ink text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900');
const secondary = cn(btn, 'border border-line-strong bg-surface text-ink hover:bg-paper dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800');
const step = cn(btn, 'min-w-11 flex-1 border border-line-strong bg-surface text-ink tabular-nums hover:border-progress hover:text-progress dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100');

function TaskRow({ task, why, onAccept, accepting, mover, waitingOn }: {
    task: Task;
    why: Why;
    onAccept: () => void;
    accepting: boolean;
    mover: ReturnType<typeof useTaskMover>;
    waitingOn: number;
}) {
    const red = why === 'blocked' || task.is_urgent;
    const nextSteps = PROGRESS_STEPS.filter(p => p > (task.progress_percent || 0) && p > 0 && p < 100);

    return (
        <li className="rounded-[14px] border border-line bg-surface p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {task.is_urgent && (
                        <p className="mb-1 flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-blocked dark:text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Urgent
                        </p>
                    )}
                    <h3 className="text-[16px] font-semibold leading-snug text-ink dark:text-slate-100">{task.title}</h3>
                    {task.project?.name && <p className="text-[13px] text-ink-muted dark:text-slate-400">{task.project.name}</p>}
                </div>
                <span className="shrink-0 text-[20px] font-bold tabular-nums text-ink dark:text-slate-100" aria-label={`${task.progress_percent || 0}% done`}>
                    {task.progress_percent || 0}<span className="text-[13px] font-semibold text-ink-muted">%</span>
                </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper dark:bg-slate-800" aria-hidden>
                <div className={cn('h-full rounded-full', red ? 'bg-blocked' : 'bg-progress')} style={{ width: `${task.progress_percent || 0}%` }} />
            </div>

            <p className={cn('mt-2 text-[14px]', red ? 'font-medium text-blocked dark:text-red-300' : 'text-ink-muted dark:text-slate-400')}>
                {statusLine(task, why)}
            </p>
            {waitingOn > 0 && (
                <p className="mt-1 text-[14px] font-medium text-ink dark:text-slate-200">
                    Waits on {waitingOn} other {waitingOn === 1 ? 'task' : 'tasks'} still open
                </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {why === 'accept' ? (
                    <>
                        <button type="button" className={cn(primary, 'flex-1')} onClick={onAccept} disabled={accepting}>
                            <Check className="h-4 w-4" aria-hidden /> {accepting ? 'Accepting…' : 'Accept'}
                        </button>
                        <button type="button" className={secondary} onClick={() => mover.requestMove(task, 'in_progress', 25)}>Start now</button>
                    </>
                ) : task.stage === 'blockers' ? (
                    <>
                        <button type="button" className={cn(primary, 'flex-1')} onClick={() => mover.requestMove(task, 'in_progress')}>
                            <PlayCircle className="h-4 w-4" aria-hidden /> Unblocked
                        </button>
                        <button type="button" className={secondary} onClick={() => mover.requestUpdate(task)}>Update blocker</button>
                    </>
                ) : task.stage === 'in_progress' ? (
                    <>
                        <div className="flex w-full gap-2" role="group" aria-label={`Report progress on ${task.title}`}>
                            {nextSteps.map(p => (
                                <button key={p} type="button" className={step} onClick={() => mover.requestMove(task, 'in_progress', p)}>{p}%</button>
                            ))}
                            <button type="button" className={cn(step, 'hover:border-ink hover:text-ink')} onClick={() => mover.requestMove(task, 'completed')}>
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> Done
                            </button>
                        </div>
                        <button type="button" className="min-h-11 px-1 text-[14px] font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline dark:text-slate-400"
                            onClick={() => mover.requestMove(task, 'blockers')}>
                            I’m blocked
                        </button>
                    </>
                ) : (
                    <button type="button" className={cn(primary, 'flex-1')} onClick={() => mover.requestMove(task, 'in_progress', 25)}>
                        <PlayCircle className="h-4 w-4" aria-hidden /> Start
                    </button>
                )}
            </div>
        </li>
    );
}

export default function MyWorkPage() {
    const { user } = useAuth();
    const mover = useTaskMover();
    const accept = useAcknowledgeTask();
    const { data: tasks = [], isLoading } = useTasks(user ? { assignee_id: user.id } : undefined);
    const waiting = useWaitingCounts();

    const { needsYou, inHand } = useMemo(() => {
        const now = Date.now();
        const open = tasks.filter(t => t.stage !== 'completed');
        const rank: Record<NonNullable<Why>, number> = { accept: 0, blocked: 1, stuck: 2, overdue: 3, urgent: 4 };
        const withWhy = open.map(t => ({ task: t, why: whyItNeedsYou(t, now) }));
        const byUrgency = (a: { task: Task }, b: { task: Task }) => Number(b.task.is_urgent) - Number(a.task.is_urgent);
        return {
            needsYou: withWhy.filter(x => x.why).sort((a, b) => byUrgency(a, b) || rank[a.why!] - rank[b.why!]),
            inHand: withWhy.filter(x => !x.why).sort((a, b) =>
                byUrgency(a, b) || (a.task.due_date ?? '9999').localeCompare(b.task.due_date ?? '9999')),
        };
    }, [tasks]);

    const onAccept = (t: Task) => {
        if (!user) return;
        accept.mutate({ id: t.id, userId: user.id }, {
            onSuccess: () => toast.success('Accepted. Your lead can see you have it.'),
            onError: (err) => toast.error(`Couldn’t accept: ${(err as Error).message}`),
        });
    };

    const first = user?.name?.trim().split(/\s+/)[0];
    const n = needsYou.length;

    const list = (rows: { task: Task; why: Why }[]) => (
        <ul className="space-y-3">
            {rows.map(({ task, why }) => (
                <TaskRow key={task.id} task={task} why={why} mover={mover} waitingOn={waiting.get(task.id) ?? 0}
                    onAccept={() => onAccept(task)} accepting={accept.isPending && accept.variables?.id === task.id} />
            ))}
        </ul>
    );

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 pb-16">
            <header>
                <p className="text-[14px] text-ink-muted dark:text-slate-400">{first ? `Hi ${first}` : 'My work'}</p>
                {isLoading ? <Skeleton className="mt-1 h-9 w-64" /> : (
                    <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-3xl dark:text-slate-50">
                        {n ? <><span className="tabular-nums">{n}</span> {n === 1 ? 'task needs' : 'tasks need'} an update from you</> : 'You’re up to date'}
                    </h1>
                )}
                {!isLoading && (
                    <p className="mt-1 text-[14px] text-ink-muted dark:text-slate-400">
                        {tasks.filter(t => t.stage !== 'completed').length} open {n ? '· tap a task’s next step to report it' : '· nothing is waiting on you'}
                    </p>
                )}
            </header>

            {isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-[14px]" />)}</div>
            ) : (
                <>
                    {n > 0 && (
                        <section aria-labelledby="needs-you" className="space-y-3">
                            <h2 id="needs-you" className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">
                                <Clock className="h-4 w-4" aria-hidden /> Waiting on you
                            </h2>
                            {list(needsYou)}
                        </section>
                    )}
                    {inHand.length > 0 && (
                        <section aria-labelledby="in-hand" className="space-y-3">
                            <h2 id="in-hand" className="text-[13px] font-bold uppercase tracking-wide text-ink-muted dark:text-slate-400">On track</h2>
                            {list(inHand)}
                        </section>
                    )}
                    {tasks.filter(t => t.stage !== 'completed').length === 0 && (
                        <div className="rounded-[14px] border border-dashed border-line-strong p-8 text-center dark:border-slate-700">
                            <CheckCircle2 className="mx-auto h-8 w-8 text-ink-faint" aria-hidden />
                            <p className="mt-2 text-[15px] font-semibold text-ink dark:text-slate-100">Nothing assigned to you right now</p>
                            <p className="mt-1 text-[14px] text-ink-muted dark:text-slate-400">
                                New tasks appear here. See everything on the <Link to="/tasks" className="font-medium text-ink underline underline-offset-4 dark:text-slate-100">task board</Link>.
                            </p>
                        </div>
                    )}
                </>
            )}

            {mover.dialog}
        </div>
    );
}
