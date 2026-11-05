import { useMemo } from 'react';
import { Task } from '../hooks/useTasks';
import { Circle, CheckCircle2, Calendar, User } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskListViewProps {
    tasks: Task[];
    /** Finished tasks older than the recent window, left out until asked for. */
    hiddenDone?: number;
    onShowAllDone?: () => void;
    onTaskClick: (taskId: string) => void;
    onTaskComplete: (taskId: string, completed: boolean) => void;
}

export default function TaskListView({ tasks, onTaskClick, onTaskComplete, hiddenDone = 0, onShowAllDone }: TaskListViewProps) {
    // Group tasks by sections
    const groupedTasks = useMemo(() => {
        const now = new Date();
        const nextWeekStart = addWeeks(now, 1);

        const recentlyAssigned: Task[] = [];
        const overdue: Task[] = [];
        const doToday: Task[] = [];
        const doNextWeek: Task[] = [];
        const doLater: Task[] = [];
        const completed: Task[] = [];

        tasks.forEach(task => {
            // Completed tasks go to their own section
            if (task.stage === 'completed') {
                completed.push(task);
                return;
            }

            const dueDate = task.due_date ? new Date(task.due_date) : null;

            // Recently assigned (created in last 7 days, no due date or future due date)
            const createdDate = new Date(task.created_at);
            const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceCreated <= 7 && (!dueDate || dueDate > now)) {
                recentlyAssigned.push(task);
            }
            // Overdue gets its own group: calling it "today" hid how late it is.
            else if (dueDate && isPast(dueDate) && !isToday(dueDate)) {
                overdue.push(task);
            }
            else if (dueDate && isToday(dueDate)) {
                doToday.push(task);
            }
            // Do next week (due within next 7 days)
            else if (dueDate && dueDate > now && dueDate < nextWeekStart) {
                doNextWeek.push(task);
            }
            // Do later (everything else)
            else {
                doLater.push(task);
            }
        });

        return {
            recentlyAssigned,
            overdue,
            doToday,
            doNextWeek,
            doLater,
            completed
        };
    }, [tasks]);

    const sections = [
        { id: 'recently', title: 'Recently assigned', tasks: groupedTasks.recentlyAssigned },
        { id: 'overdue', title: 'Overdue', tasks: groupedTasks.overdue },
        { id: 'today', title: 'Due today', tasks: groupedTasks.doToday },
        { id: 'nextWeek', title: 'Due in the next 7 days', tasks: groupedTasks.doNextWeek },
        { id: 'later', title: 'Later or no date', tasks: groupedTasks.doLater },
        { id: 'completed', title: 'Done', tasks: groupedTasks.completed },
    ];

    return (
        <div className="space-y-8">
            {sections.map(section => (
                <TaskSection
                    key={section.id}
                    title={section.title}
                    tasks={section.tasks}
                    onTaskClick={onTaskClick}
                    onTaskComplete={onTaskComplete}
                />
            ))}
            {hiddenDone > 0 && onShowAllDone && (
                <button type="button" onClick={onShowAllDone} className="ml-2 text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">
                    Show {hiddenDone} older finished {hiddenDone === 1 ? 'task' : 'tasks'}
                </button>
            )}
        </div>
    );
}

interface TaskSectionProps {
    title: string;
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    onTaskComplete: (taskId: string, completed: boolean) => void;
}

function TaskSection({ title, tasks, onTaskClick, onTaskComplete }: TaskSectionProps) {
    if (tasks.length === 0) return null;

    return (
        <div className="space-y-2">
            {/* Section Header */}
            <div className="flex items-center gap-3 px-2">
                <h2 className="text-sm font-semibold text-ink dark:text-slate-50">{title}</h2>
                <span className="text-xs font-medium tabular-nums text-ink-muted dark:text-slate-400">{tasks.length}</span>
                <div className="flex-1 h-px bg-line dark:bg-slate-800" />
            </div>

            {/* Task Rows */}
            <div className="space-y-1">
                {tasks.map(task => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task.id)}
                        onComplete={(completed) => onTaskComplete(task.id, completed)}
                    />
                ))}
            </div>
        </div>
    );
}

interface TaskRowProps {
    task: Task;
    onClick: () => void;
    onComplete: (completed: boolean) => void;
}

function TaskRow({ task, onClick, onComplete }: TaskRowProps) {
    const isCompleted = task.stage === 'completed';
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted;

    const formatDueDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    };

    // Neutral by default; only critical earns colour, matching the board's urgent/blocked rule.
    const priorityColors = {
        low: 'border border-line text-ink-muted dark:border-slate-700 dark:text-slate-400',
        medium: 'border border-line text-ink dark:border-slate-700 dark:text-slate-200',
        high: 'border border-line font-semibold text-ink dark:border-slate-700 dark:text-slate-100',
        critical: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
    };

    return (
        <div
            className={cn(
                "card-lift group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent",
                "hover:bg-paper dark:hover:bg-slate-800 hover:border-line dark:hover:border-slate-700 cursor-pointer transition-all",
            )}
            onClick={onClick}
        >
            {/* Checkbox */}
            <button
                type="button"
                aria-label={isCompleted ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                onClick={(e) => {
                    e.stopPropagation();
                    onComplete(!isCompleted);
                }}
                className="flex-shrink-0 hover:scale-110 transition-transform"
            >
                {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                    <Circle className="h-5 w-5 text-ink-faint dark:text-slate-500 group-hover:text-ink-muted dark:group-hover:text-slate-300" aria-hidden />
                )}
            </button>

            {/* Task Title */}
            <div className="flex-1 min-w-0">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className={cn(
                        "block w-full truncate text-left text-sm font-medium text-ink outline-none focus-visible:underline dark:text-slate-50",
                        isCompleted && "line-through text-ink-muted dark:text-slate-400"
                    )}
                >
                    {task.title}
                </button>
            </div>

            {/* Due Date */}
            {task.due_date && (
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
                    isOverdue ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "text-ink-muted dark:text-slate-400"
                )}>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDueDate(task.due_date)}
                </div>
            )}

            {/* Assignee */}
            {task.assignee && (
                <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                </div>
            )}

            {/* Project */}
            {task.project && (
                <div className="hidden sm:block px-2 py-1 rounded text-xs font-medium bg-paper dark:bg-slate-800 text-ink-muted dark:text-slate-300 truncate max-w-[150px]">
                    {task.project.name}
                </div>
            )}

            {/* Priority Badge */}
            <div className={cn(
                "hidden md:block px-2 py-1 rounded-full text-xs font-semibold capitalize",
                priorityColors[task.priority]
            )}>
                {task.priority}
            </div>
        </div>
    );
}
