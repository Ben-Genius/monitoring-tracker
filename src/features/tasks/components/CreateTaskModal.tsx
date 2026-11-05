import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DialogShell } from '@/components/ui/dialog-shell';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';
import { useCreateTask, CreateTaskInput } from '../hooks/useTasks';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canViewAllCompanies } from '@/lib/permissions';

const taskSchema = z.object({
    title: z.string().trim().min(1, 'Enter a title for the task.'),
    description: z.string().optional(),
    project_id: z.string().optional(),
    assignee_ids: z.array(z.string()).min(1, 'Choose at least one person to own this task.'),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    due_date: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const fieldCls = 'h-11 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:ring-2 focus:ring-progress/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
const errorCls = 'border-blocked dark:border-red-400';

interface CreateTaskModalProps {
    open: boolean;
    onClose: () => void;
    initialProjectId?: string;
}

export default function CreateTaskModal({ open, onClose, initialProjectId }: CreateTaskModalProps) {
    const { user } = useAuth();
    const createTask = useCreateTask();
    const canSeeAllCompanies = canViewAllCompanies(user);
    const { data: projects } = useProjects(canSeeAllCompanies ? undefined : user?.company_id);
    const [saveError, setSaveError] = useState<string | null>(null);

    const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, watch } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: { priority: 'medium', project_id: initialProjectId, assignee_ids: [] },
    });

    const selectedProject = projects?.find(p => p.id === watch('project_id'));
    const targetCompanyId = selectedProject?.company_id || (canSeeAllCompanies ? undefined : user?.company_id);
    const { data: companyUsers } = useUsers(targetCompanyId);

    const close = () => { setSaveError(null); onClose(); };

    const onSubmit = async (data: TaskFormData) => {
        setSaveError(null);
        const payload: CreateTaskInput = {
            title: data.title,
            description: data.description,
            project_id: data.project_id || undefined,
            priority: data.priority,
            due_date: data.due_date || undefined,
            // A general task has no project to inherit a company from. Without one it is
            // invisible to its own assignee, so it takes the primary assignee's company (or the creator's).
            company_id: data.project_id ? undefined
                : companyUsers?.find(u => u.id === data.assignee_ids[0])?.company_id ?? user?.company_id ?? undefined,
            assignee_ids: data.assignee_ids,
            assignee_id: data.assignee_ids[0], // The first person chosen is the owner.
        };
        try {
            await createTask.mutateAsync(payload);
            toast.success('Task created. It starts in Yet to start.');
            reset();
            close();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'The task could not be created. Try again.');
        }
    };

    return (
        <DialogShell open={open} onClose={close} title="New task" description="New tasks start in Yet to start. Fields marked * are required." className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-6">
                <Field id="nt-title" label="Title" required error={errors.title?.message}>
                    <input id="nt-title" {...register('title')} placeholder="e.g. Pour first-floor slab, Block A" {...aria('nt-title', errors.title)} className={cn(fieldCls, errors.title && errorCls)} />
                </Field>

                <Field id="nt-desc" label="Description" hint={'Optional. What does "done" look like?'}>
                    <textarea id="nt-desc" rows={3} {...register('description')} aria-describedby="nt-desc-hint" className={cn(fieldCls, 'h-auto py-2.5')} />
                </Field>

                <Field id="nt-project" label="Project" hint="Optional. Leave empty for a general task.">
                    <select id="nt-project" {...register('project_id')} aria-describedby="nt-project-hint" className={fieldCls}>
                        <option value="">No project (general task)</option>
                        {projects?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.company?.name})</option>)}
                    </select>
                </Field>

                <Field id="nt-people" label="Owner and helpers" required error={errors.assignee_ids?.message} hint="The first person you choose owns the task.">
                    <Controller
                        control={control}
                        name="assignee_ids"
                        render={({ field }) => (
                            <MultiSelect
                                id="nt-people"
                                options={companyUsers?.map(u => ({ value: u.id, label: u.name })) || []}
                                selected={field.value}
                                onChange={field.onChange}
                                placeholder="Type a name"
                                aria-describedby={['nt-people-hint', errors.assignee_ids && 'nt-people-error'].filter(Boolean).join(' ')}
                                aria-invalid={!!errors.assignee_ids}
                            />
                        )}
                    />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="nt-priority" label="Priority">
                        <select id="nt-priority" {...register('priority')} className={fieldCls}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </Field>
                    <Field id="nt-due" label="Due date">
                        <input id="nt-due" type="date" {...register('due_date')} className={fieldCls} />
                    </Field>
                </div>

                {saveError && (
                    <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {saveError}
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-line pt-5 dark:border-slate-800">
                    <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-[8px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center rounded-[8px] bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60 dark:bg-white dark:text-ink">
                        {isSubmitting ? 'Creating…' : 'Create task'}
                    </button>
                </div>
            </form>
        </DialogShell>
    );
}

function aria(id: string, error: unknown) {
    return { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined };
}

function Field({ id, label, required, hint, error, children }: {
    id: string; label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-semibold text-ink dark:text-slate-100">
                {label}{required && <span className="text-blocked dark:text-red-300" aria-hidden> *</span>}
                {required && <span className="sr-only"> (required)</span>}
            </label>
            {hint && <p id={`${id}-hint`} className="text-[12.5px] text-ink-muted dark:text-slate-400">{hint}</p>}
            {children}
            {error && <p id={`${id}-error`} className="text-[12.5px] font-medium text-blocked dark:text-red-300">{error}</p>}
        </div>
    );
}
