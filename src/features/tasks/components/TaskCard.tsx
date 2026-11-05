import { useDraggable } from '@dnd-kit/core';
import { Calendar, MessageSquare, AlertTriangle, Clock, UserCheck, ListChecks } from 'lucide-react';
import { cn, getCompanyTheme, formatDate } from '@/lib/utils';
import { Task } from '../hooks/useTasks';
import { MoveMenu } from './TaskMover';
import { taskProgress, isStale, daysSinceMovement, awaitingAcceptance, isUpdateOverdue } from '../utils/accountability';
import { stageDef } from '../utils/stages';

interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
    onClick?: () => void;
    /** Offer "Update status" (and dragging). Omit for read-only viewers. */
    onMove?: (stage: Task['stage']) => void;
    onUpdate?: () => void;
    /** Briefly marks a card that has just been moved, so the person sees where it landed. */
    justMoved?: boolean;
    showCompany?: boolean;
}

const initials = (name: string) => name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function TaskCard({ task, isDragging = false, onClick, onMove, onUpdate, justMoved, showCompany }: TaskCardProps) {
    // Pointer listeners only: the keyboard opens the task (title button) and moves it with "Update status".
    const { listeners, setNodeRef, transform } = useDraggable({ id: task.id, disabled: !onMove });
    const { onKeyDown: _keyboardDrag, ...pointerListeners } = listeners ?? {};

    const company = task.project?.company?.name ?? '';
    const stage = stageDef(task.stage);
    const steps = task.subtasks?.length ?? 0;
    const stepsDone = task.subtasks?.filter(s => s.is_completed).length ?? 0;
    const progress = taskProgress(task, steps ? Math.round((stepsDone / steps) * 100) : 0);
    // The board asks for comments:task_comments(count); _count holds the number.
    const comments = task._count?.comments ?? 0;
    const open = task.stage !== 'completed';
    const overdue = open && !!task.due_date && new Date(task.due_date) < new Date();
    const stale = isStale(task);
    const unaccepted = awaitingAcceptance(task);
    const updateLate = isUpdateOverdue(task);
    const owner = task.assignee?.name;
    // The red edge is reserved for work that cannot wait. Company identity is a small dot instead.
    const alarm = open && (task.is_urgent || task.stage === 'blockers');
    const style = {
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : {}),
    } as React.CSSProperties;

    return (
        <article
            ref={setNodeRef}
            style={style}
            {...pointerListeners}
            className={cn(
                'group relative overflow-hidden rounded-[10px] border bg-surface py-3 pl-4 pr-3 text-left select-none touch-manipulation transition-[border-color,box-shadow] dark:bg-slate-900',
                onMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                justMoved ? 'border-transparent ring-2 ring-ink dark:ring-slate-200' : 'border-line hover:border-line-strong hover:shadow-lift dark:border-slate-700 dark:hover:border-slate-500',
                'focus-within:ring-2 focus-within:ring-progress',
                isDragging && 'shadow-pop rotate-[1.5deg]'
            )}
        >
            {alarm && <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-blocked dark:bg-red-400" />}

            {justMoved && (
                <p className="mb-1.5 text-[12px] font-semibold text-ink dark:text-slate-100" role="status">Moved to {stage.label} just now</p>
            )}

            <div className="flex items-center gap-2 text-[12px] text-ink-muted dark:text-slate-400">
                {showCompany && company && (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(company).primary }} title={company} aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate">
                    {task.project?.name ?? 'No project'}{showCompany && company ? `, ${company}` : ''}
                </span>
                {task.due_date && (
                    <span className={cn('inline-flex shrink-0 items-center gap-1 tabular-nums', overdue && 'font-semibold text-blocked dark:text-red-300')}>
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        {overdue && <span className="sr-only">Overdue, was due</span>} {formatDate(task.due_date)}
                    </span>
                )}
            </div>

            <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink dark:text-slate-100">
                {onClick ? (
                    // One real button per card: Enter/Space open it, and its stretched hit area keeps the whole card clickable.
                    <button type="button" onClick={onClick} className="text-left outline-none after:absolute after:inset-0 after:content-['']">
                        {task.title}
                    </button>
                ) : task.title}
            </h3>

            {open && (task.is_urgent || stale || unaccepted || updateLate) && (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    {task.is_urgent && <li className="inline-flex items-center gap-1 font-semibold text-blocked dark:text-red-300"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Urgent</li>}
                    {stale && <li className="inline-flex items-center gap-1 font-medium text-ink dark:text-slate-200"><Clock className="h-3.5 w-3.5" aria-hidden /> No movement for {daysSinceMovement(task)} days</li>}
                    {updateLate && !stale && <li className="inline-flex items-center gap-1 font-medium text-ink dark:text-slate-200"><Clock className="h-3.5 w-3.5" aria-hidden /> Update overdue</li>}
                    {unaccepted && <li className="inline-flex items-center gap-1 text-ink-muted dark:text-slate-400"><UserCheck className="h-3.5 w-3.5" aria-hidden /> Not accepted</li>}
                </ul>
            )}

            {task.stage === 'blockers' && (
                <p className="mt-2 rounded-[7px] bg-red-50 px-2.5 py-1.5 text-[12px] leading-snug text-red-900 dark:bg-red-500/10 dark:text-red-200">
                    {task.blocker?.name ? <span className="font-semibold">Waiting on {task.blocker.name}. </span> : null}
                    {task.blocker_description || 'No reason given.'}
                </p>
            )}

            <div className="mt-2.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-line dark:bg-slate-800" role="img" aria-label={`${progress}% done`}>
                    <div className="h-full rounded-full bg-slate-600 dark:bg-slate-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-ink-muted dark:text-slate-400" aria-hidden>{progress}%</span>
                {steps > 0 && <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-ink-muted dark:text-slate-400" title={`${stepsDone} of ${steps} steps done`}><ListChecks className="h-3.5 w-3.5" aria-hidden />{stepsDone}/{steps}<span className="sr-only"> steps done</span></span>}
                {comments > 0 && <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-ink-muted dark:text-slate-400" title={`${comments} updates`}><MessageSquare className="h-3.5 w-3.5" aria-hidden />{comments}<span className="sr-only"> updates</span></span>}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
                {owner ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-ink-muted dark:text-slate-400" title={owner}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-ink dark:bg-slate-800 dark:text-slate-100" aria-hidden>{initials(owner)}</span>
                        <span className="truncate">{owner}</span>
                    </span>
                ) : (
                    <span className="flex-1 text-[12px] font-medium text-ink dark:text-slate-200">No owner</span>
                )}
                {/* Finished work is reopened from the task itself, so done cards stay quiet. */}
                {onMove && open && <div className="relative z-10 shrink-0"><MoveMenu current={task.stage} onMove={onMove} onUpdate={onUpdate} /></div>}
            </div>
        </article>
    );
}
