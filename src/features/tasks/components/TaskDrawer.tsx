import { useState, useMemo } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    Calendar,
    User,
    Flag,
    AlignLeft,
    CheckSquare,
    MessageSquare,
    Clock
} from 'lucide-react';
import { useTask, useUpdateTask } from '../hooks/useTasks';
import { useUsers } from '@/features/users/hooks/useUsers';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface TaskDrawerProps {
    taskId: string | null;
    open: boolean;
    onClose: () => void;
}

export default function TaskDrawer({ taskId, open, onClose }: TaskDrawerProps) {
    const { data: task, isLoading } = useTask(taskId || '');
    const updateTask = useUpdateTask(taskId || '');
    const { data: users } = useUsers(task?.project?.company_id);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Initialize form values when task loads
    useMemo(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    const handleUpdateField = async (field: string, value: any) => {
        try {
            await updateTask.mutateAsync({ [field]: value });
            toast.success('Task updated');
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleTitleBlur = () => {
        if (title !== task?.title && title.trim()) {
            handleUpdateField('title', title);
        }
        setIsEditingTitle(false);
    };

    const handleDescriptionBlur = () => {
        if (description !== task?.description) {
            handleUpdateField('description', description);
        }
    };

    const stageOptions = [
        { value: 'talking_stage', label: 'Talking Stage' },
        { value: 'yet_to_start', label: 'Yet to Start' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'blockers', label: 'Blockers' },
        { value: 'completed', label: 'Completed' },
    ];

    if (!open || !taskId) return null;

    return (
        <Drawer open={open} onClose={onClose} width="650px">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner />
                </div>
            ) : task ? (
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        {isEditingTitle ? (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleTitleBlur();
                                    if (e.key === 'Escape') {
                                        setTitle(task.title);
                                        setIsEditingTitle(false);
                                    }
                                }}
                                autoFocus
                                className="text-2xl font-bold border-none shadow-none p-0 focus-visible:ring-0"
                            />
                        ) : (
                            <h1
                                className="text-2xl font-bold text-slate-900 cursor-text hover:bg-slate-50 px-2 py-1 -mx-2 rounded"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                {task.title}
                            </h1>
                        )}

                        {task.project && (
                            <p className="text-sm text-slate-500">
                                in <span className="font-medium">{task.project.name}</span>
                            </p>
                        )}
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Assignee */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <User className="h-4 w-4" />
                                Assignee
                            </label>
                            <MultiSelect
                                options={users?.map(u => ({ value: u.id, label: u.name })) || []}
                                selected={task.assignees?.map(a => a.user.id) || []}
                                onChange={(ids) => handleUpdateField('assignee_ids', ids)}
                                placeholder="Select assignees"
                            />
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Calendar className="h-4 w-4" />
                                Due Date
                            </label>
                            <Input
                                type="date"
                                value={task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''}
                                onChange={(e) => handleUpdateField('due_date', e.target.value)}
                            />
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Flag className="h-4 w-4" />
                                Priority
                            </label>
                            <select
                                value={task.priority}
                                onChange={(e) => handleUpdateField('priority', e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        {/* Stage */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Clock className="h-4 w-4" />
                                Stage
                            </label>
                            <select
                                value={task.stage}
                                onChange={(e) => handleUpdateField('stage', e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            >
                                {stageOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <AlignLeft className="h-4 w-4" />
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleDescriptionBlur}
                            placeholder="Add a description..."
                            rows={4}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>

                    {/* Subtasks Section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <CheckSquare className="h-4 w-4" />
                            Subtasks ({task.subtasks?.length || 0})
                        </label>
                        <div className="text-sm text-slate-500">
                            Subtasks feature coming soon...
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <MessageSquare className="h-4 w-4" />
                            Comments ({task.comments?.length || 0})
                        </label>
                        <div className="text-sm text-slate-500">
                            Comments feature coming soon...
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                        <p>Created {format(new Date(task.created_at), 'MMM d, yyyy')}</p>
                        {task.completed_at && (
                            <p>Completed {format(new Date(task.completed_at), 'MMM d, yyyy')}</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">Task not found</p>
                </div>
            )}
        </Drawer>
    );
}
