import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { authorizeSync, isAllowedMethod } from './_lib/authorizeSync.js';

/**
 * Daily escalation run: tasks that have gone quiet, slipped past their
 * deadline or sat unaccepted move one step up the ladder (owner, then leads
 * and the assigner, then PAs). The rules live in public.run_escalations
 * (supabase/migrations/20261126170000_silence_escalation.sql); running it
 * more than once a day is harmless, as each step is sent once.
 *
 *   GET  (Vercel Cron)   Authorization: Bearer $CRON_SECRET
 *   POST (manual)        x-sync-secret: $SYNC_SECRET
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAllowedMethod(req)) return res.status(405).json({ error: 'Method not allowed' });
    const auth = authorizeSync(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const { data, error } = await supabaseAdmin().rpc('run_escalations');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
}
