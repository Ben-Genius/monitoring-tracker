import { useMemo } from 'react';
import { Task } from '../hooks/useTasks';
import { Circle, CheckCircle2, Calendar, User } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskListViewProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    onTaskComplete: (taskId: string, completed: boolean) => void;
}

export default function TaskListView({ tasks, onTaskClick, onTaskComplete }: TaskListViewProps) {
    // Group tasks by sections
    const groupedTasks = useMemo(() => {
        const now = new Date();
        const nextWeekStart = addWeeks(now, 1);

        const recentlyAssigned: Task[] = [];
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
            // Do today (due today or overdue)
            else if (dueDate && (isToday(dueDate) || isPast(dueDate))) {
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
            doToday,
            doNextWeek,
            doLater,
            completed
        };
    }, [tasks]);

    const sections = [
        { id: 'recently', title: 'Recently assigned', tasks: groupedTasks.recentlyAssigned },
        { id: 'today', title: 'Do today', tasks: groupedTasks.doToday },
        { id: 'nextWeek', title: 'Do next week', tasks: groupedTasks.doNextWeek },
        { id: 'later', title: 'Do later', tasks: groupedTasks.doLater },
        { id: 'completed', title: 'Completed', tasks: groupedTasks.completed },
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
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <span className="text-xs font-medium text-slate-400">{tasks.length}</span>
                <div className="flex-1 h-px bg-slate-200" />
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

    const priorityColors = {
        low: 'bg-slate-100 text-slate-600',
        medium: 'bg-blue-100 text-blue-700',
        high: 'bg-orange-100 text-orange-700',
        critical: 'bg-red-100 text-red-700',
    };

    return (
        <div
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent",
                "hover:bg-slate-50 hover:border-slate-200 cursor-pointer transition-all",
                isCompleted && "opacity-60"
            )}
            onClick={onClick}
        >
            {/* Checkbox */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onComplete(!isCompleted);
                }}
                className="flex-shrink-0 hover:scale-110 transition-transform"
            >
                {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                    <Circle className="h-5 w-5 text-slate-300 group-hover:text-slate-400" />
                )}
            </button>

            {/* Task Title */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium text-slate-900 truncate",
                    isCompleted && "line-through text-slate-500"
                )}>
                    {task.title}
                </p>
            </div>

            {/* Due Date */}
            {task.due_date && (
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
                    isOverdue ? "bg-red-50 text-red-600" : "text-slate-500"
                )}>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDueDate(task.due_date)}
                </div>
            )}

            {/* Assignee */}
            {task.assignee && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                </div>
            )}

            {/* Project */}
            {task.project && (
                <div className="hidden sm:block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 truncate max-w-[150px]">
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
