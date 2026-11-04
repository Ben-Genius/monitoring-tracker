import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/features/tasks/hooks/useTasks';
import { STAGES } from '@/features/tasks/utils/stages';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, TickMeter } from './primitives';
import { tx } from './tokens';

export default function WorkloadCard({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
    const { counts, total } = useMemo(() => {
        const c: Record<string, number> = {};
        tasks.forEach(t => { c[t.stage] = (c[t.stage] ?? 0) + 1; });
        return { counts: c, total: tasks.length };
    }, [tasks]);

    const shown = STAGES.filter(s => s.id !== 'talking_stage');
    const talking = counts.talking_stage ?? 0;

    return (
        <Card aria-labelledby="workload-heading">
            <CardHeader id="workload-heading" icon={Gauge} title="Workload by stage" />
            <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 min-[420px]:grid-cols-2">
                {shown.map(s => {
                    const n = counts[s.id] ?? 0;
                    const share = total ? n / total : 0;
                    return (
                        <div key={s.id} className="rounded-[10px] border border-line p-3.5 dark:border-slate-800">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className={cn('text-sm font-semibold', tx.ink)}>{s.label}</span>
                                <span className={cn('text-[12px] tabular-nums', tx.muted)}>{isLoading ? '–' : `${n} task${n === 1 ? '' : 's'}`}</span>
                            </div>
                            <div className={cn('mt-1.5 mb-2 text-[12px] font-medium tabular-nums', tx.muted)}>
                                {isLoading ? <Skeleton className="h-3 w-8" /> : `${Math.round(share * 100)}%`}
                            </div>
                            <TickMeter value={share} color={s.accent} ticks={24} label={`${s.label}: ${Math.round(share * 100)}% of all tasks`} />
                        </div>
                    );
                })}
            </div>
            {talking > 0 && (
                <p className={cn('-mt-2 px-5 pb-4 text-[12.5px]', tx.muted)}>
                    Plus {talking} still in the talking stage.
                </p>
            )}
        </Card>
    );
}
