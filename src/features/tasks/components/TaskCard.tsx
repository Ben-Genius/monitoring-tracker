import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { Task } from '../hooks/useTasks';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
    onClick?: () => void;
}

export default function TaskCard({ task, isDragging = false, onClick }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
    });

    const theme = useMemo(() => {
        const companyName = task.project?.company?.name || 'Global View';
        return getCompanyTheme(companyName);
    }, [task.project?.company?.name]);

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 50,
        }
        : undefined;

    const getPriorityConfig = (priority: string) => {
        const configs: Record<string, { color: string; bg: string; text: string }> = {
            low: { color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
            medium: { color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
            high: { color: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300' },
            critical: { color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
        };
        return configs[priority] || configs.low;
    };

    const priority = getPriorityConfig(task.priority);
    const subtasksCount = task.subtasks?.length || 0;
    const completedSubtasks = task.subtasks?.filter(s => s.is_completed).length || 0;
    const progress = task.stage === 'completed' ? 100 : (subtasksCount > 0 ? Math.round((completedSubtasks / subtasksCount) * 100) : 0);
    const commentsCount = task.comments?.length || 0;

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.stage !== 'completed';
    const isDueToday =
        task.due_date &&
        new Date(task.due_date).toDateString() === new Date().toDateString() &&
        task.stage !== 'completed';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                // Don't trigger click if we were dragging
                onClick?.();
            }}
            className={cn(
                'group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-grab active:cursor-grabbing select-none',
                isDragging && 'opacity-40 scale-95 shadow-2xl ring-2 ring-primary/20',
                isOverdue && 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10',
                isDueToday && 'border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-900/10'
            )}
        >
            {/* Grab Handle (Visible on group hover) */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>

            {/* Project & Priority Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-1.5 w-1.5 rounded-full', priority.color)} />
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', priority.text)}>
                    {task.priority}
                </span>

                {task.project && (
                    <Badge
                        variant="outline"
                        className="text-[10px] font-bold px-1.5 py-0 h-5 border rounded-md capitalize"
                        style={{
                            color: theme.primary,
                            borderColor: `${theme.primary}20`,
                            backgroundColor: `${theme.primary}05`
                        }}
                    >
                        {task.project.name}
                    </Badge>
                )}
            </div>

            {/* Task Title */}
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50 mb-1.5 line-clamp-2 leading-snug">
                {task.title}
            </h3>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {task.description}
                </p>
            )}

            {/* Subtask / Progress */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", task.stage === 'completed' ? 'bg-success' : '')}
                        style={{
                            width: `${progress}%`,
                            backgroundColor: task.stage !== 'completed' ? theme.primary : undefined
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                {/* Due Date & Indicators */}
                <div className="flex items-center gap-3">
                    {task.due_date && (
                        <div className={cn(
                            "flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md",
                            isOverdue ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20" :
                                isDueToday ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20" :
                                    "text-slate-500 dark:text-slate-400"
                        )}>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(task.due_date)}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        {subtasksCount > 0 && (
                            <div className="flex items-center gap-0.5 text-[10px]" title="Subtasks">
                                <CheckSquare className="h-3 w-3" />
                                <span>{completedSubtasks}/{subtasksCount}</span>
                            </div>
                        )}
                        {commentsCount > 0 && (
                            <div className="flex items-center gap-0.5 text-[10px]" title="Comments">
                                <MessageSquare className="h-3 w-3" />
                                <span>{commentsCount}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assignee Avatars */}
                <div className="flex -space-x-2 overflow-hidden pl-1 py-1">
                    {task.assignees && task.assignees.length > 0 ? (
                        <>
                            {task.assignees.slice(0, 3).map(({ user }) => (
                                <div
                                    key={user.id}
                                    title={user.name}
                                    className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-sm hover:z-10 hover:ring-opacity-50 transition-all cursor-help relative"
                                    style={{ '--tw-ring-color': theme.primary } as any}
                                >
                                    {user.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()}
                                </div>
                            ))}
                            {task.assignees.length > 3 && (
                                <div
                                    className="h-7 w-7 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-sm relative z-0"
                                >
                                    +{task.assignees.length - 3}
                                </div>
                            )}
                        </>
                    ) : task.assignee ? (
                        <div
                            title={task.assignee.name}
                            className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-sm hover:ring-opacity-50 transition-all cursor-help relative z-0"
                            style={{ '--tw-ring-color': theme.primary } as any}
                        >
                            {task.assignee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                        </div>
                    ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-white dark:border-slate-900 border-dashed flex items-center justify-center">
                            <span className="text-slate-300 dark:text-slate-600 text-[10px]">?</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
