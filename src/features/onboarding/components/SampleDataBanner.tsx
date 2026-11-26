import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';

/**
 * Shown to admins while the sample project from sign-up is still there: what
 * it is, the next real step (invite people), and how to remove it.
 */
export default function SampleDataBanner() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const [confirming, setConfirming] = useState(false);
    const [removing, setRemoving] = useState(false);

    const { data: hasSample } = useQuery({
        queryKey: ['has-sample-data'],
        enabled: user?.role === 'admin',
        queryFn: async () => {
            const { data, error } = await supabase.from('projects').select('id').eq('is_sample', true).limit(1);
            // Before the sign-up migration, is_sample does not exist: show nothing.
            if (error) return false;
            return (data ?? []).length > 0;
        },
    });

    if (user?.role !== 'admin' || !hasSample) return null;

    const remove = async () => {
        setRemoving(true);
        const { error } = await supabase.rpc('clear_sample_data');
        setRemoving(false);
        if (error) {
            toast.error(`Couldn’t remove the sample data: ${error.message}`);
            return;
        }
        toast.success('Sample data removed.');
        track('sample_data_removed');
        setConfirming(false);
        await qc.invalidateQueries();
    };

    return (
        <section aria-labelledby="sample-heading"
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex min-w-0 items-start gap-3">
                <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted dark:text-slate-400" aria-hidden />
                <div className="min-w-0">
                    <h2 id="sample-heading" className="text-[15px] font-semibold text-ink dark:text-slate-100">You’re looking at sample data</h2>
                    <p className="text-[14px] text-ink-muted dark:text-slate-400">
                        A warehouse project and three sample teammates show what the brief catches. Invite your team, then remove the samples.
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
                {confirming ? (
                    <>
                        <span className="text-[13px] text-ink-muted dark:text-slate-400">Remove the sample project and teammates?</span>
                        <button type="button" onClick={remove} aria-disabled={removing}
                            className="h-9 rounded-[8px] bg-blocked px-3 text-[14px] font-semibold text-white hover:bg-blocked/90">
                            {removing ? 'Removing…' : 'Remove'}
                        </button>
                        <button type="button" onClick={() => setConfirming(false)}
                            className="h-9 rounded-[8px] px-3 text-[14px] font-medium text-ink hover:bg-paper dark:text-slate-200 dark:hover:bg-slate-800">
                            Keep
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/users" className="inline-flex h-9 items-center rounded-[8px] bg-ink px-3 text-[14px] font-semibold text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900">
                            Invite your team
                        </Link>
                        <button type="button" onClick={() => setConfirming(true)}
                            className={cn('h-9 rounded-[8px] border border-line-strong px-3 text-[14px] font-medium text-ink hover:bg-paper dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800')}>
                            Remove sample data
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}
