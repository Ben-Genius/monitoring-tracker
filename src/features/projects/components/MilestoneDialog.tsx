import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { DialogShell } from '@/components/ui/dialog-shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import { useCreateMilestone } from '../hooks/useMilestones';

const field = 'w-full rounded-[8px] border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export default function MilestoneDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
    const create = useCreateMilestone();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setName(''); setDescription(''); setDueDate(''); setError(''); } }, [open]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Give the milestone a name.'); return; }
        create.mutate(
            { project_id: projectId, name: name.trim(), description: description.trim() || undefined, due_date: dueDate || undefined },
            {
                onSuccess: () => { toast.success('Milestone added'); onClose(); },
                // Keep what was typed so the user can retry.
                onError: (err) => setError(err instanceof Error ? `Couldn't add the milestone: ${err.message}` : "Couldn't add the milestone. Try again."),
            },
        );
    };

    return (
        <DialogShell open={open} onClose={onClose} title="Add milestone" description="A delivery date or phase target for this project." className="max-w-md">
            <form onSubmit={submit} className="space-y-4 px-6 py-5" noValidate>
                <div>
                    <label htmlFor="ms-name" className={cn('mb-1.5 block text-[13px] font-medium', tx.ink)}>Name</label>
                    <input
                        id="ms-name" value={name} onChange={e => { setName(e.target.value); setError(''); }}
                        className={field} placeholder="e.g. Grid tie-in energised" required aria-invalid={!!error && !name.trim()}
                        aria-describedby={error ? 'ms-error' : undefined}
                    />
                </div>
                <div>
                    <label htmlFor="ms-desc" className={cn('mb-1.5 block text-[13px] font-medium', tx.ink)}>
                        Details <span className={cn('font-normal', tx.muted)}>(optional)</span>
                    </label>
                    <textarea id="ms-desc" rows={2} value={description} onChange={e => setDescription(e.target.value)} className={cn(field, 'resize-none')} />
                </div>
                <div>
                    <label htmlFor="ms-due" className={cn('mb-1.5 block text-[13px] font-medium', tx.ink)}>
                        Due date <span className={cn('font-normal', tx.muted)}>(optional)</span>
                    </label>
                    <input id="ms-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={field} />
                </div>

                {error && <p id="ms-error" role="alert" className="text-[13px] text-blocked dark:text-red-300">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={create.isPending} className="bg-ink text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900">
                        {create.isPending ? 'Adding…' : 'Add milestone'}
                    </Button>
                </div>
            </form>
        </DialogShell>
    );
}
