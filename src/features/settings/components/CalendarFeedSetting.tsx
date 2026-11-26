import { useState } from 'react';
import { CalendarDays, Check, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';

/**
 * Subscribe to your own due dates from Google Calendar, Outlook or Apple
 * Calendar (api/calendar/[token].ts). The link is private: anyone with it can
 * see your task titles, so it's only fetched when you ask, and can be reset.
 */
export default function CalendarFeedSetting() {
    const [token, setToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchToken = useMutation({
        mutationFn: async (reset: boolean) => {
            const { data, error } = await supabase.rpc('calendar_feed_token', { p_reset: reset });
            if (error) throw error;
            return { token: data as string, reset };
        },
        onSuccess: ({ token: t, reset }) => {
            setToken(t);
            setCopied(false);
            track(reset ? 'calendar_feed_reset' : 'calendar_feed_opened');
            if (reset) toast.success('New link made. Calendars using the old one will stop updating.');
        },
        onError: (err: Error) => toast.error(`Couldn’t get your calendar link: ${err.message}`),
    });

    const https = token ? `${window.location.origin}/api/calendar/${token}.ics` : '';
    const webcal = https.replace(/^https?:/, 'webcal:');
    const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(https);
            setCopied(true);
            track('calendar_feed_added', { app: 'copy' });
            toast.success('Calendar link copied.');
        } catch {
            toast.error('Couldn’t copy. Select the link and copy it yourself.');
        }
    };

    const reset = () => {
        if (window.confirm('Make a new link? Any calendar using the current one will stop updating until you add the new one.')) {
            fetchToken.mutate(true);
        }
    };

    const linkBtn = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800';

    return (
        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Calendar</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">See your due dates in your own calendar</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Your open tasks show up on the day they’re due in Google Calendar, Outlook or Apple Calendar, and move when the date changes.
                        Done tasks drop off. Calendars refresh on their own schedule, usually within a few hours.
                    </p>
                </div>

                {!token ? (
                    <Button type="button" onClick={() => fetchToken.mutate(false)} disabled={fetchToken.isPending}>
                        {fetchToken.isPending ? 'Getting your link…' : 'Get my calendar link'}
                    </Button>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <a className={linkBtn} href={google} target="_blank" rel="noopener noreferrer"
                                onClick={() => track('calendar_feed_added', { app: 'google' })}>
                                Add to Google Calendar
                            </a>
                            <a className={linkBtn} href={webcal} onClick={() => track('calendar_feed_added', { app: 'webcal' })}>
                                Add to Apple Calendar or Outlook
                            </a>
                        </div>

                        <div>
                            <label htmlFor="calendar-feed-url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Or paste this link into your calendar’s “Subscribe” or “From URL” option
                            </label>
                            <div className="mt-1.5 flex gap-2">
                                <input id="calendar-feed-url" readOnly value={https} onFocus={(e) => e.currentTarget.select()}
                                    className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" />
                                <button type="button" onClick={copy} className={linkBtn} aria-label="Copy calendar link">
                                    {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Keep this link private: anyone who has it can see your task titles.
                            </p>
                            <button type="button" onClick={reset} disabled={fetchToken.isPending}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-slate-300">
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Make a new link
                            </button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
