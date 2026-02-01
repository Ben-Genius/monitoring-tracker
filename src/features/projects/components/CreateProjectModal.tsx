import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Briefcase, User, Calendar, DollarSign, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateProject, useCompanies, useLeads } from '../hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';

const projectSchema = z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    company_id: z.string().min(1, 'Company is required'),
    lead_id: z.string().optional(),
    contract_value: z.number().min(0, 'Contract value must be positive'),
    expected_handover: z.string().min(1, 'Expected handover date is required'),
    start_date: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
}

export default function CreateProjectModal({
    open,
    onClose,
}: CreateProjectModalProps) {
    const { user } = useAuth();
    const createProject = useCreateProject();
    const isAdmin = user?.role === 'admin';

    const { data: companies } = useCompanies();
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(
        isAdmin ? undefined : user?.company_id
    );
    const { data: leads } = useLeads(selectedCompanyId);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            company_id: isAdmin ? '' : user?.company_id || '',
            contract_value: 0,
        },
    });

    const onSubmit = async (data: ProjectFormData) => {
        setIsSubmitting(true);
        // Sanitize data: replace empty strings with null for UUID and optional fields
        const sanitizedData = {
            ...data,
            lead_id: data.lead_id || null,
            description: data.description || null,
            start_date: data.start_date || null,
        };

        try {
            await createProject.mutateAsync(sanitizedData as any);
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Layout className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Initialize New Project</h2>
                            <p className="text-sm text-slate-500">Set up a new monitoring lifecycle.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200/50 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                Project Identity <span className="text-error font-black">*</span>
                            </label>
                            <Input
                                {...register('name')}
                                placeholder="e.g. Pipeline Expansion Phase II"
                                className={cn(
                                    "h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all",
                                    errors.name && "border-error focus:ring-error"
                                )}
                            />
                            {errors.name && (
                                <p className="text-error text-xs font-medium mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider gap-2">
                                Detailed Scope
                            </label>
                            <textarea
                                {...register('description')}
                                placeholder="Describe the project objectives and key deliverables..."
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            />
                        </div>

                        {/* Company (Admin only) */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                Portfolio Company <span className="text-error font-black">*</span>
                            </label>
                            <select
                                {...register('company_id')}
                                disabled={!isAdmin}
                                className={cn(
                                    "w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-all appearance-none",
                                    !isAdmin && "opacity-60 cursor-not-allowed"
                                )}
                                onChange={(e) => {
                                    const cid = e.target.value;
                                    setSelectedCompanyId(cid);
                                    setValue('company_id', cid);
                                }}
                            >
                                <option value="">Select Company</option>
                                {companies?.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.company_id && (
                                <p className="text-error text-xs font-medium mt-1">{errors.company_id.message}</p>
                            )}
                        </div>

                        {/* Lead */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                Project Lead
                            </label>
                            <select
                                {...register('lead_id')}
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-all appearance-none"
                            >
                                <option value="">Assign a Lead (Optional)</option>
                                {leads?.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contract Value */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5" />
                                Contract Value ($M) <span className="text-error font-black">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('contract_value', { valueAsNumber: true })}
                                    className="h-12 pl-12 bg-slate-50 border-slate-200"
                                />
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            </div>
                            {errors.contract_value && (
                                <p className="text-error text-xs font-medium mt-1">{errors.contract_value.message}</p>
                            )}
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Commencement Date
                            </label>
                            <Input
                                type="date"
                                {...register('start_date')}
                                className="h-12 bg-slate-50 border-slate-200"
                            />
                        </div>

                        {/* Expected Handover */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Expected Target Handover <span className="text-error font-black">*</span>
                            </label>
                            <Input
                                type="date"
                                {...register('expected_handover')}
                                className="h-12 bg-slate-50 border-slate-200"
                            />
                            {errors.expected_handover && (
                                <p className="text-error text-xs font-medium mt-1">{errors.expected_handover.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-12 px-8 rounded-xl font-bold border-slate-200 text-slate-600"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-10 rounded-xl font-bold shadow-xl "
                        >
                            {isSubmitting ? 'Initializing Project...' : 'Launch Project'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
