import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { renderCalendar, type Feed } from '../_lib/calendarFeed.js';

/**
 * A person's due dates as a calendar subscription:
 *
 *   GET /api/calendar/<token>.ics
 *
 * Calendar apps fetch this on their own with no sign-in, so the private token
 * (Settings → Calendar, supabase/migrations/20261126200000_calendar_feed.sql)
 * is the only key. Unknown, reset and deactivated links all get the same 404.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).send('Method not allowed');
    }
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const token = String(req.query.token ?? '').replace(/\.ics$/i, '');
    if (!/^[0-9a-f]{64}$/.test(token)) return res.status(404).send('Calendar not found');

    const { data, error } = await supabaseAdmin().rpc('calendar_feed', { p_token: token });
    if (error) return res.status(503).send('Calendar unavailable, try again shortly');
    if (!data) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).send('Calendar not found');
    }

    const appUrl = (process.env.APP_URL ?? `https://${req.headers.host}`).replace(/\/$/, '');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="commit.ics"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(renderCalendar(data as Feed, appUrl));
}
