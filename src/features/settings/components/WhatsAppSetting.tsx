import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// The business number people message, digits only (e.g. 233201234567). Unset hides the card.
const BUSINESS_NUMBER = (import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '');

interface LinkState { linked: boolean; phone_hint: string | null; linked_at: string | null }

/**
 * Link your WhatsApp so you can update your tasks by message
 * (api/whatsapp-webhook.ts). Linking works by sending a one-time code from
 * your own WhatsApp, which proves the number is yours without an SMS.
 */
export default function WhatsAppSetting() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const [code, setCode] = useState<string | null>(null);

    const { data: state, isError } = useQuery({
        queryKey: ['whatsapp-link', user?.id],
        enabled: !!BUSINESS_NUMBER && !!user && user.role !== 'executive',
        // While a code is showing, check for the link every few seconds.
        refetchInterval: code ? 4000 : false,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('my_whatsapp_link');
            if (error) throw error;
            return (data as LinkState[])[0];
        },
    });

    // The code has done its job once the number shows as linked.
    useEffect(() => {
        if (state?.linked && code) { setCode(null); toast.success('WhatsApp linked. Send "tasks" to start.'); }
    }, [state?.linked, code]);

    const start = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('create_whatsapp_link_code');
            if (error) throw error;
            return data as string;
        },
        onSuccess: setCode,
        onError: (e: Error) => toast.error(`Couldn’t start linking: ${e.message}`),
    });

    const unlink = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('unlink_whatsapp');
            if (error) throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp-link'] }); toast.success('WhatsApp unlinked.'); },
        onError: (e: Error) => toast.error(`Couldn’t unlink: ${e.message}`),
    });

    if (!BUSINESS_NUMBER || !user || user.role === 'executive' || isError || !state) return null;
    const waLink = code ? `https://wa.me/${BUSINESS_NUMBER}?text=${encodeURIComponent(`LINK ${code}`)}` : '';

    return (
        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-slate-500" aria-hidden />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">WhatsApp updates</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {state.linked ? (
                    <>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                            Linked to <span className="font-semibold tabular-nums">{state.phone_hint}</span>. Message <span className="font-semibold tabular-nums">+{BUSINESS_NUMBER}</span> to update your tasks.
                        </p>
                        <ul className="space-y-1 rounded-[10px] bg-paper p-3 text-[13px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                            <li><span className="font-semibold">tasks</span>: your open tasks, numbered</li>
                            <li><span className="font-semibold">2 50% formwork up</span>: report progress</li>
                            <li><span className="font-semibold">2 blocked waiting on cement</span>: mark it blocked</li>
                            <li><span className="font-semibold">2 done slab poured</span>: as a photo caption, for proof</li>
                        </ul>
                        <button type="button" onClick={() => unlink.mutate()} disabled={unlink.isPending}
                            className="min-h-10 rounded-[8px] border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
                            Unlink WhatsApp
                        </button>
                    </>
                ) : code ? (
                    <>
                        <p className="text-sm text-slate-700 dark:text-slate-200">Send this from the WhatsApp on your phone. The code works for 15 minutes.</p>
                        <p className="text-center text-3xl font-bold tracking-[0.3em] tabular-nums text-ink dark:text-slate-50" aria-label={`Code ${code.split('').join(' ')}`}>{code}</p>
                        <a href={waLink} target="_blank" rel="noopener"
                            className="flex min-h-11 w-full items-center justify-center rounded-[10px] bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink/90 dark:bg-slate-100 dark:text-slate-900">
                            Open WhatsApp and send “LINK {code}”
                        </a>
                        <p role="status" className="text-center text-[13px] text-slate-500 dark:text-slate-400">Waiting for your message…</p>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                            Update your tasks by WhatsApp, even with weak signal: see your list, report progress, flag a blocker, or send a photo to mark work done.
                        </p>
                        <button type="button" onClick={() => start.mutate()} disabled={start.isPending}
                            className="min-h-11 w-full rounded-[10px] bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink/90 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
                            {start.isPending ? 'Getting a code…' : 'Link my WhatsApp'}
                        </button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
