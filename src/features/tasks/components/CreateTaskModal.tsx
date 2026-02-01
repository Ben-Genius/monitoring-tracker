import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTask, CreateTaskInput } from '../hooks/useTasks';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'react-hot-toast';

const taskSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    project_id: z.string().min(1, 'Project is required'),
    assignee_id: z.string().min(1, 'Assignee is required'),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    due_date: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
    open: boolean;
    onClose: () => void;
}

export default function CreateTaskModal({
    open,
    onClose,
}: CreateTaskModalProps) {
    const { user } = useAuth();
    const createTask = useCreateTask();
    const isAdmin = user?.role === 'admin';

    // If Lead, only fetch projects for their company
    const { data: projects } = useProjects(isAdmin ? undefined : user?.company_id);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            priority: 'medium',
        },
    });

    const selectedProjectId = watch('project_id');
    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    const targetCompanyId = selectedProject?.company_id || (isAdmin ? undefined : user?.company_id);
    const { data: companyUsers } = useUsers(targetCompanyId);

    const onSubmit = async (data: TaskFormData) => {
        setIsSubmitting(true);
        const toastId = toast.loading('Creating task...');
        try {
            await createTask.mutateAsync(data as CreateTaskInput);
            toast.success('Task created successfully!', { id: toastId });
            reset();
            onClose();
        } catch (error: any) {
            console.error('Failed to create task:', error);
            toast.error(error.message || 'Failed to create task', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">Create New Task</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-md"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Title <span className="text-error">*</span>
                        </label>
                        <Input
                            {...register('title')}
                            placeholder="Enter task title"
                            className={errors.title ? 'border-error' : ''}
                        />
                        {errors.title && (
                            <p className="text-error text-sm mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Description
                        </label>
                        <textarea
                            {...register('description')}
                            placeholder="Enter task description"
                            rows={3}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Project */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Project <span className="text-error">*</span>
                        </label>
                        <select
                            {...register('project_id')}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        >
                            <option value="">Select a project</option>
                            {projects?.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name} ({project.company?.name})
                                </option>
                            ))}
                        </select>
                        {errors.project_id && (
                            <p className="text-error text-sm mt-1">
                                {errors.project_id.message}
                            </p>
                        )}
                    </div>

                    {/* Assignee */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">
                                Assignee <span className="text-error">*</span>
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-slate-500 hover:text-primary"
                                onClick={() => toast.error('User management is currently limited to the Management page.')}
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                Add Assignee
                            </Button>
                        </div>
                        <select
                            {...register('assignee_id')}
                            className={cn(
                                "w-full h-10 px-3 rounded-md border border-input bg-background",
                                errors.assignee_id ? 'border-error' : ''
                            )}
                        >
                            <option value="">Select an assignee</option>
                            {companyUsers?.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                </option>
                            ))}
                        </select>
                        {errors.assignee_id && (
                            <p className="text-error text-sm mt-1">
                                {errors.assignee_id.message}
                            </p>
                        )}
                        {!targetCompanyId && projects && (
                            <p className="text-slate-400 text-[10px] mt-1 italic">
                                Please select a project first to see available assignees.
                            </p>
                        )}
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Priority</label>
                        <select
                            {...register('priority')}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Due Date</label>
                        <Input type="date" {...register('due_date')} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Task'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
