import { Check, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import type { Project } from '../hooks/useProjects';

/** The three phases a project moves through, and which statuses belong to each. */
const PHASES: { id: string; label: string; statuses: Project['status'][]; note: string }[] = [
    { id: 'planning', label: 'Planning', statuses: ['bidding', 'scheduled'], note: 'Scope, budget and lead are being agreed before work starts.' },
    { id: 'delivery', label: 'In delivery', statuses: ['active', 'on_hold'], note: 'Tasks are under way on site.' },
    { id: 'handover', label: 'Handed over', statuses: ['completed'], note: 'Work is complete and the project has been handed over.' },
];

/**
 * Where the project sits in its lifecycle. Figures and the stage-change action live
 * in the page header, so this shows the stage only.
 */
export default function ProjectTimeline({ status, className }: { status: Project['status']; className?: string }) {
    const current = Math.max(0, PHASES.findIndex(p => p.statuses.includes(status)));
    const onHold = status === 'on_hold';

    return (
        <section aria-labelledby="lifecycle-heading" className={cn('rounded-[14px] border border-line bg-surface p-5 dark:border-slate-800 dark:bg-slate-900', className)}>
            <h2 id="lifecycle-heading" className={cn('text-[15px] font-semibold', tx.ink)}>Stage</h2>

            <ol className="mt-4 grid grid-cols-3 gap-2">
                {PHASES.map((phase, i) => {
                    const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
                    return (
                        <li key={phase.id} className="min-w-0" aria-current={state === 'current' ? 'step' : undefined}>
                            {/* One bar per phase: filled for passed phases, half for the current one. */}
                            <div className="h-1.5 overflow-hidden rounded-full bg-line dark:bg-slate-800">
                                <div className={cn('h-full rounded-full bg-ink dark:bg-slate-200', state === 'done' ? 'w-full' : state === 'current' ? 'w-1/2' : 'w-0')} />
                            </div>
                            <p className={cn('mt-2 flex items-center gap-1.5 text-[13px] font-semibold', state === 'upcoming' ? tx.muted : tx.ink)}>
                                {state === 'done' && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                                <span className="truncate">{phase.label}</span>
                            </p>
                            <p className={cn('text-[12px]', tx.muted)}>
                                {state === 'done' ? 'Done' : state === 'current' ? (onHold ? 'On hold' : 'Current') : 'Next'}
                            </p>
                        </li>
                    );
                })}
            </ol>

            <p className={cn('mt-4 flex items-start gap-2 text-[13px]', tx.muted)}>
                {onHold && <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {onHold ? 'Work is paused. Tasks stay open until the project resumes.' : PHASES[current].note}
            </p>
        </section>
    );
}
