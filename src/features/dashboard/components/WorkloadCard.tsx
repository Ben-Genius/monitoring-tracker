import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { STAGES } from '@/features/tasks/utils/stages';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, TickMeter } from './primitives';
import { tx } from './tokens';

/**
 * Where the open work sits. Finished tasks are left out on purpose: they are
 * already counted in "Done this week", so this card never repeats that figure.
 */
export default function WorkloadCard({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
    const { counts, total } = useMemo(() => {
        const c: Record<string, number> = {};
        let n = 0;
        tasks.forEach(t => { if (t.stage !== 'completed') { c[t.stage] = (c[t.stage] ?? 0) + 1; n++; } });
        return { counts: c, total: n };
    }, [tasks]);

    return (
        <Card aria-labelledby="workload-heading" className="flex flex-col">
            <CardHeader id="workload-heading" icon={Gauge} title="Open work by stage" />
            <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-2.5 px-5 pb-5 min-[420px]:grid-cols-2">
                {STAGES.filter(s => s.id !== 'completed').map(s => {
                    const n = counts[s.id] ?? 0;
                    const share = total ? n / total : 0;
                    const pct = Math.round(share * 100);
                    return (
                        <div key={s.id} className="flex flex-col rounded-[10px] border border-line p-3.5 dark:border-slate-800">
                            <span className={cn('truncate text-sm font-semibold', tx.ink)}>{s.label}</span>
                            <div className="mt-2 mb-2.5 flex items-center justify-between gap-2">
                                <span className={cn('text-[12px] font-medium tabular-nums', tx.muted)}>
                                    {isLoading ? <Skeleton className="h-3 w-8" /> : `${pct}%`}
                                </span>
                                <span className={cn('rounded-[5px] border border-line bg-paper px-1.5 py-px text-[11px] font-medium tabular-nums dark:border-slate-700 dark:bg-slate-800', n > 0 && s.id === 'blockers' ? 'text-blocked dark:text-red-300' : tx.muted)}>
                                    {isLoading ? '–' : `${n} task${n === 1 ? '' : 's'}`}
                                </span>
                            </div>
                            <div className="mt-auto">
                                <TickMeter value={share} color={s.accent} ticks={24} label={`${s.label}: ${pct}% of open tasks`} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
