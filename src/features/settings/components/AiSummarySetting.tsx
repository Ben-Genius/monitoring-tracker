import { useId } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/analytics';

const switchAttr = { switch: '' } as Record<string, string>;

/**
 * Admins only: a short AI-written summary at the top of the morning brief
 * (api/_lib/briefSummary.ts). Off until an admin turns it on, because it sends
 * task details to Anthropic. Turning it off deletes summaries already written.
 */
export default function AiSummarySetting() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const id = useId();
    const isAdmin = user?.role === 'admin';

    const { data: on, isError } = useQuery({
        queryKey: ['ai-summary-setting', user?.id],
        enabled: isAdmin,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_ai_summary');
            if (error) throw error;
            return !!data;
        },
    });

    const save = useMutation({
        mutationFn: async (next: boolean) => {
            const { error } = await supabase.rpc('set_ai_summary', { p_on: next });
            if (error) throw error;
            return next;
        },
        onSuccess: (next) => {
            qc.setQueryData(['ai-summary-setting', user?.id], next);
            qc.invalidateQueries({ queryKey: ['brief-ai-summary'] });
            track('ai_summary_toggled', { on: next });
            toast.success(next ? 'The summary starts with tomorrow’s 7am brief.' : 'AI summary off. Summaries already written were deleted.');
        },
        onError: (err: Error) => toast.error(`Couldn’t change it: ${err.message}`),
    });

    // Not an admin, or the migration isn't applied yet: show nothing.
    if (!isAdmin || isError || on === undefined) return null;

    return (
        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-slate-500" aria-hidden />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">AI summary</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <label htmlFor={id} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Start the morning brief with a short summary
                        </label>
                        <p id={`${id}-hint`} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Two or three sentences on what needs your leaders today, at the top of the 7am email and the Brief page. For the whole organisation.
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            To write it, Commit sends that morning’s brief to Anthropic (Claude): task titles, project names, people’s names and why each task is listed.
                            Anthropic doesn’t use it to train its models. Turning this off deletes summaries already written.{' '}
                            <a href="/privacy" className="font-semibold text-slate-700 underline underline-offset-2 dark:text-slate-300">Privacy notice</a>
                        </p>
                    </div>
                    <input id={id} type="checkbox" {...switchAttr} checked={on} disabled={save.isPending}
                        onChange={(e) => save.mutate(e.target.checked)} aria-describedby={`${id}-hint`}
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink dark:accent-slate-100" />
                </div>
            </CardContent>
        </Card>
    );
}
