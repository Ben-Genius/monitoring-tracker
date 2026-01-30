import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '../hooks/useTasks';
import { formatDate } from '@/lib/utils';

interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
}

export default function TaskCard({ task, isDragging = false }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            low: 'bg-gray-500',
            medium: 'bg-primary',
            high: 'bg-warning',
            critical: 'bg-error',
        };
        return colors[priority] || 'bg-gray-500';
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const isDueToday =
        task.due_date &&
        new Date(task.due_date).toDateString() === new Date().toDateString();

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-50',
                isOverdue && 'border-error',
                isDueToday && 'border-warning'
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm text-gray-900 flex-1 pr-2">
                    {task.title}
                </h3>
                <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            {task.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {task.description}
                </p>
            )}

            {task.project && (
                <p className="text-xs text-gray-600 mb-2">{task.project.name}</p>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div
                        className={`h-2 w-2 rounded-full ${getPriorityColor(
                            task.priority
                        )}`}
                    />
                    <span className="text-xs text-gray-500 capitalize">
                        {task.priority}
                    </span>
                </div>
                {task.due_date && (
                    <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span
                            className={cn(
                                isOverdue && 'text-error font-semibold',
                                isDueToday && 'text-warning font-semibold'
                            )}
                        >
                            {formatDate(task.due_date)}
                        </span>
                    </div>
                )}
            </div>

            {task.assignee && (
                <div className="mt-2 flex items-center">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                        {task.assignee.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600 ml-2">
                        {task.assignee.name}
                    </span>
                </div>
            )}
        </div>
    );
}
