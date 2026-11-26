import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';

/**
 * This morning's AI-written summary (api/_lib/briefSummary.ts), the same text
 * that opened the 7am email. Shows nothing when the organisation hasn't turned
 * it on, before 7am's job has run, or before the migration is applied.
 */
export default function AiSummary() {
    const { data } = useQuery({
        queryKey: ['brief-ai-summary'],
        staleTime: 10 * 60_000,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('todays_brief_summary');
            if (error) return null;
            const row = (data as { summary: string; created_at: string }[] | null)?.[0];
            return row ?? null;
        },
    });

    if (!data) return null;
    const at = new Date(data.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
        <section aria-labelledby="ai-summary-title"
            className="rounded-[16px] border border-line bg-surface px-5 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:px-6">
            <h2 id="ai-summary-title" className={cn('flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[.08em]', tx.muted)}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> In short
            </h2>
            <p className={cn('mt-2 max-w-[75ch] text-[16px] leading-relaxed sm:text-[17px]', tx.ink)}>{data.summary}</p>
            <p className={cn('mt-2 text-xs', tx.faint)}>
                Written by AI from the whole organisation’s tasks at {at}. The lists below are the record and stay up to date.
            </p>
        </section>
    );
}
