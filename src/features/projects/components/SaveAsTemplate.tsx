import { useId, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useSaveAsTemplate } from '../hooks/useTemplates';

/**
 * Saves this project's tasks, milestones and dependencies as a template that
 * new projects can start from. Admins, PAs and leads only (the database
 * refuses anyone else).
 */
export default function SaveAsTemplate({ projectId, projectName, className }: { projectId: string; projectName: string; className?: string }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const save = useSaveAsTemplate();
    const id = useId();

    if (!open) {
        return (
            <button type="button" onClick={() => { setName(`${projectName} plan`); setOpen(true); }}
                className={cn('inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100', className)}>
                <LayoutTemplate className="h-4 w-4" aria-hidden /> Save as template
            </button>
        );
    }

    return (
        <form className="flex w-full max-w-sm flex-col gap-2 rounded-[10px] border border-line bg-surface p-3 dark:border-slate-700 dark:bg-slate-900"
            onSubmit={e => {
                e.preventDefault();
                if (!name.trim()) return;
                save.mutate({ projectId, name: name.trim() }, {
                    onSuccess: () => { toast.success('Template saved. Pick it under “Start from” when you create a project.'); setOpen(false); },
                    onError: err => toast.error((err as Error).message),
                });
            }}>
            <label htmlFor={id} className="text-sm font-semibold text-ink dark:text-slate-100">Template name</label>
            <p className="text-[12.5px] text-ink-muted dark:text-slate-400">Keeps the tasks, milestones and what waits on what, with dates relative to the start. Owners and progress aren’t copied.</p>
            <input id={id} autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={120}
                onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
                className="h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-[8px] px-3 text-sm font-semibold text-ink-muted hover:text-ink">Cancel</button>
                <button type="submit" disabled={save.isPending || !name.trim()} className="h-9 rounded-[8px] bg-ink px-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-ink">
                    {save.isPending ? 'Saving…' : 'Save template'}
                </button>
            </div>
        </form>
    );
}
