import { useId } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canReadBrief } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/analytics';

// Native switch where supported (Safari); a plain checkbox elsewhere, which
// works the same. React has no type for the attribute yet.
const switchAttr = { switch: '' } as Record<string, string>;

/**
 * The 7am morning brief email (api/send-morning-briefs.ts), for the people
 * who read the brief. On by default; this turns it off or back on.
 */
export default function BriefEmailSetting() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const id = useId();
    const eligible = canReadBrief(user);

    const { data: on, isError } = useQuery({
        queryKey: ['brief-email', user?.id],
        enabled: eligible && !!user,
        queryFn: async () => {
            const { data, error } = await supabase.from('users').select('brief_email').eq('id', user!.id).single();
            if (error) throw error;
            return (data as { brief_email: boolean }).brief_email;
        },
    });

    const save = useMutation({
        mutationFn: async (next: boolean) => {
            const { error } = await supabase.rpc('set_brief_email', { p_on: next });
            if (error) throw error;
            return next;
        },
        onSuccess: (next) => {
            qc.setQueryData(['brief-email', user?.id], next);
            track('brief_email_toggled', { on: next });
            toast.success(next ? 'You’ll get the brief by email at 7am.' : 'Morning email turned off.');
        },
        onError: (err: Error) => toast.error(`Couldn’t change it: ${err.message}`),
    });

    // Before the email migration is applied the column doesn't exist: show nothing.
    if (!eligible || isError || on === undefined) return null;

    return (
        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-500" aria-hidden />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Morning email</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <label htmlFor={id} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Email me the brief at 7am
                        </label>
                        <p id={`${id}-hint`} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            What’s urgent, blocked, stuck or overdue, sent to {user?.email}. Read it before you open the app.
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
