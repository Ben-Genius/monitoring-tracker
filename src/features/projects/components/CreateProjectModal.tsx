import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { DialogShell } from '@/components/ui/dialog-shell';
import { useCreateProject, useCompanies, type CreateProjectInput } from '../hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { canAdminister } from '@/lib/permissions';

const projectSchema = z.object({
    name: z.string().trim().min(1, 'Enter a project name.'),
    description: z.string().optional(),
    company_id: z.string().min(1, 'Choose the company this project belongs to.'),
    contract_value: z.number({ invalid_type_error: 'Enter the contract value in cedis, for example 1250000.' })
        .min(0, 'The contract value cannot be negative.'),
    expected_handover: z.string().min(1, 'Choose the expected handover date.'),
    start_date: z.string().optional(),
}).refine(d => !d.start_date || d.start_date <= d.expected_handover, {
    path: ['expected_handover'],
    message: 'Handover must be on or after the start date.',
});

type ProjectFormData = z.infer<typeof projectSchema>;

const fieldCls = 'h-11 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:ring-2 focus:ring-progress/20 disabled:cursor-not-allowed disabled:bg-paper dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
const errorFieldCls = 'border-blocked focus:border-blocked focus:ring-blocked/20 dark:border-red-400';

interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
    const { user } = useAuth();
    const createProject = useCreateProject();
    const canChooseCompany = canAdminister(user);
    const { data: companies } = useCompanies();
    const [saveError, setSaveError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: { company_id: canChooseCompany ? '' : user?.company_id || '', contract_value: 0 },
    });

    const close = () => { setSaveError(null); onClose(); };

    const onSubmit = async (data: ProjectFormData) => {
        setSaveError(null);
        try {
            await createProject.mutateAsync({
                ...data,
                description: data.description || undefined,
                start_date: data.start_date || undefined,
            } as CreateProjectInput);
            reset();
            close();
        } catch (error) {
            // Keep the form filled in and say what went wrong, instead of failing silently.
            setSaveError(error instanceof Error ? error.message : 'The project could not be saved. Try again.');
        }
    };

    return (
        <DialogShell open={open} onClose={close} title="New project" description="Fields marked * are required." className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-6">
                <div className="grid gap-5 md:grid-cols-2">
                    <Field id="np-name" label="Project name" required error={errors.name?.message} className="md:col-span-2">
                        <input id="np-name" {...register('name')} placeholder="e.g. Tema Warehouse Fit-out" {...aria('np-name', errors.name)} className={cn(fieldCls, errors.name && errorFieldCls)} />
                    </Field>

                    <Field id="np-desc" label="Description" hint="Optional. Scope and key deliverables." className="md:col-span-2">
                        <textarea id="np-desc" rows={3} {...register('description')} aria-describedby="np-desc-hint" className={cn(fieldCls, 'h-auto py-2.5')} />
                    </Field>

                    <Field id="np-company" label="Company" required error={errors.company_id?.message} hint={canChooseCompany ? undefined : 'Projects are created in your own company.'}>
                        <select id="np-company" {...register('company_id')} disabled={!canChooseCompany} {...aria('np-company', errors.company_id, !canChooseCompany)} className={cn(fieldCls, errors.company_id && errorFieldCls)}>
                            <option value="">Choose a company</option>
                            {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>

                    <Field id="np-value" label="Contract value (GHS)" required error={errors.contract_value?.message} hint="Full amount in cedis, not millions.">
                        <input id="np-value" type="number" inputMode="decimal" min={0} step="0.01" {...register('contract_value', { valueAsNumber: true })} {...aria('np-value', errors.contract_value, true)} className={cn(fieldCls, errors.contract_value && errorFieldCls)} />
                    </Field>

                    <Field id="np-start" label="Start date">
                        <input id="np-start" type="date" {...register('start_date')} className={fieldCls} />
                    </Field>

                    <Field id="np-handover" label="Expected handover" required error={errors.expected_handover?.message}>
                        <input id="np-handover" type="date" {...register('expected_handover')} {...aria('np-handover', errors.expected_handover)} className={cn(fieldCls, errors.expected_handover && errorFieldCls)} />
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
                        {isSubmitting ? 'Creating…' : 'Create project'}
                    </button>
                </div>
            </form>
        </DialogShell>
    );
}

/** Wires a field to its hint and error so screen readers announce both. */
function aria(id: string, error: unknown, hasHint = false) {
    const ids = [hasHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
    return { 'aria-invalid': error ? true : undefined, 'aria-describedby': ids || undefined };
}

function Field({ id, label, required, hint, error, className, children }: {
    id: string; label: string; required?: boolean; hint?: string; error?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
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
