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
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id, disabled: !onMove });

    const company = task.project?.company?.name ?? '';
    const rail = task.is_urgent && task.stage !== 'completed' ? '#B83A24' : getCompanyTheme(company).primary;
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
    const style = {
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : {}),
        ...(justMoved ? { '--tw-ring-color': stage.accent } : {}),
    } as React.CSSProperties;

    return (
        <article
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-[10px] border bg-surface pl-4 pr-3 py-3 text-left select-none touch-manipulation transition-[border-color,box-shadow]',
                onMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                justMoved ? 'border-transparent ring-2' : 'border-line hover:border-line-strong hover:shadow-lift',
                isDragging && 'shadow-pop rotate-[1.5deg]'
            )}
        >
            <span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{ backgroundColor: rail }} />

            {justMoved && (
                <p className="mb-1.5 text-[12px] font-semibold" style={{ color: stage.accent }}>Moved to {stage.label} just now</p>
            )}

            <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                <span className="min-w-0 flex-1 truncate">
                    {task.project?.name ?? 'No project'}{showCompany && company ? <span className="text-ink-faint">, {company}</span> : null}
                </span>
                {task.due_date && (
                    <span className={cn('inline-flex shrink-0 items-center gap-1 tabular-nums', overdue && 'font-semibold text-blocked')}>
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(task.due_date)}
                    </span>
                )}
            </div>

            <h3 className="mt-1 text-[15px] font-semibold leading-snug text-ink line-clamp-2">{task.title}</h3>

            {open && (task.is_urgent || stale || unaccepted || updateLate) && (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    {task.is_urgent && <li className="inline-flex items-center gap-1 font-semibold text-blocked"><AlertTriangle className="h-3.5 w-3.5" /> Urgent</li>}
                    {stale && <li className="inline-flex items-center gap-1 font-medium text-orange-700"><Clock className="h-3.5 w-3.5" /> No movement for {daysSinceMovement(task)} days</li>}
                    {updateLate && !stale && <li className="inline-flex items-center gap-1 font-medium text-orange-700"><Clock className="h-3.5 w-3.5" /> Update overdue</li>}
                    {unaccepted && <li className="inline-flex items-center gap-1 text-amber-700"><UserCheck className="h-3.5 w-3.5" /> Not accepted</li>}
                </ul>
            )}

            {task.stage === 'blockers' && (
                <p className="mt-2 rounded-[7px] bg-red-50 px-2.5 py-1.5 text-[12px] leading-snug text-red-900">
                    {task.blocker?.name ? <span className="font-semibold">Waiting on {task.blocker.name}. </span> : null}
                    {task.blocker_description || 'No reason given.'}
                </p>
            )}

            <div className="mt-2.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: stage.accent }} />
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-ink-muted">{progress}%</span>
                {steps > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint tabular-nums" title={`${stepsDone} of ${steps} steps done`}><ListChecks className="h-3.5 w-3.5" />{stepsDone}/{steps}</span>}
                {comments > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint tabular-nums" title={`${comments} updates`}><MessageSquare className="h-3.5 w-3.5" />{comments}</span>}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
                {owner ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-ink-muted" title={owner}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-ink">{initials(owner)}</span>
                        <span className="truncate">{owner}</span>
                    </span>
                ) : (
                    <span className="flex-1 text-[12px] text-amber-700">No owner</span>
                )}
                {onMove && <div className="shrink-0"><MoveMenu current={task.stage} onMove={onMove} onUpdate={onUpdate} /></div>}
            </div>
        </article>
    );
}
