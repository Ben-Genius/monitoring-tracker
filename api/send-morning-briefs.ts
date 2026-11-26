import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { authorizeSync, isAllowedMethod, isDryRun } from './_lib/authorizeSync.js';
import { briefFacts, renderMorningBrief, type EmailTask } from './_lib/morningBriefEmail.js';
import { writeBriefSummary } from './_lib/briefSummary.js';
import { unsubscribeUrl } from './_lib/briefUnsubscribe.js';

/**
 * Emails the morning brief to everyone who oversees an organisation, at 7am
 * in that organisation's time zone.
 *
 *   GET  (Vercel Cron)   Authorization: Bearer $CRON_SECRET
 *   POST (cron-job.org)  x-sync-secret: $SYNC_SECRET
 *   ?dry=1               lists who would get what, sends nothing
 *   ?test=<user id>      sends that person's brief now, whatever the time
 *
 * Safe to run as often as you like: each person is emailed at most once per
 * local day (claim_brief_email), and only between 7am and noon local time,
 * so an hourly schedule covers every time zone and catches up after a miss.
 *
 * Env: RESEND_API_KEY, BRIEF_FROM_EMAIL (or INVITE_FROM_EMAIL), APP_URL,
 * SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET and/or SYNC_SECRET, and optionally
 * BRIEF_EMAIL_SECRET for the unsubscribe links (else CRON_SECRET is used).
 * ANTHROPIC_API_KEY (or GEMINI_API_KEY with GEMINI_PAID=true) turns on the AI
 * summary for organisations whose admin chose it (organizations.ai_summary);
 * without either, the brief goes out as before. See api/_lib/briefSummary.ts.
 */

interface Recipient {
    user_id: string;
    email: string;
    name: string;
    organization_id: string;
    org_name: string;
    executive_title: string | null;
    timezone: string;
}

const SEND_FROM_HOUR = 7;
const SEND_UNTIL_HOUR = 12;
const BATCH = 100; // Resend's batch limit

/** The local date (YYYY-MM-DD), hour and a readable date in a time zone. */
function localClock(timeZone: string, now: Date) {
    let tz = timeZone;
    try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); } catch { tz = 'Africa/Accra'; }
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]));
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
        label: new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(now),
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAllowedMethod(req)) return res.status(405).json({ error: 'Method not allowed' });
    const auth = authorizeSync(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const dry = isDryRun(req);
    const testUser = typeof req.query.test === 'string' ? req.query.test : null;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.BRIEF_FROM_EMAIL ?? process.env.INVITE_FROM_EMAIL;
    const appUrl = (process.env.APP_URL ?? `https://${req.headers.host}`).replace(/\/$/, '');
    if (!dry && (!resendKey || !from)) return res.status(501).json({ error: 'Email sending is not set up (RESEND_API_KEY, BRIEF_FROM_EMAIL).' });

    const db = supabaseAdmin();
    const { data: recipients, error } = await db.rpc('brief_email_recipients');
    if (error) return res.status(500).json({ error: `Could not list recipients: ${error.message}` });

    const now = new Date();
    const byOrg = new Map<string, Recipient[]>();
    for (const r of (recipients ?? []) as Recipient[]) {
        if (testUser && r.user_id !== testUser) continue;
        const list = byOrg.get(r.organization_id) ?? [];
        list.push(r);
        byOrg.set(r.organization_id, list);
    }

    // Which organisations asked for the AI summary. If this can't be read, carry on without summaries.
    const { data: orgFlags } = await db.from('organizations').select('id, ai_summary').in('id', [...byOrg.keys()]);
    const wantsSummary = new Set((orgFlags ?? []).filter((o: { ai_summary: boolean }) => o.ai_summary).map((o: { id: string }) => o.id));

    const report: { org: string; sent: number; skipped: string; summary?: string; preview?: { to: string; subject: string }[] }[] = [];

    for (const [orgId, people] of byOrg) {
        const clock = localClock(people[0].timezone, now);
        const org = people[0].org_name;
        if (!testUser && (clock.hour < SEND_FROM_HOUR || clock.hour >= SEND_UNTIL_HOUR)) {
            report.push({ org, sent: 0, skipped: `local time is ${clock.hour}:00` });
            continue;
        }

        const { data: tasks, error: taskError } = await db.rpc('brief_email_tasks', { p_org: orgId });
        if (taskError) { report.push({ org, sent: 0, skipped: `could not read tasks: ${taskError.message}` }); continue; }

        // The AI summary: written once per organisation per local day, then reused by
        // every email, by reruns of this job, and by the in-app brief.
        let summary: string | null = null;
        let summaryNote = 'off';
        if (wantsSummary.has(orgId) && (tasks ?? []).length) {
            const { data: saved } = await db.from('brief_summaries').select('summary')
                .eq('organization_id', orgId).eq('brief_date', clock.date).maybeSingle();
            if (saved) { summary = (saved as { summary: string }).summary; summaryNote = 'reused'; }
            else if (dry) summaryNote = 'would write';
            else {
                const written = await writeBriefSummary(briefFacts((tasks ?? []) as EmailTask[], org, now.getTime()));
                if (written) {
                    summary = written.summary;
                    summaryNote = 'written';
                    await db.from('brief_summaries').upsert(
                        { organization_id: orgId, brief_date: clock.date, summary: written.summary, model: written.model },
                        { onConflict: 'organization_id,brief_date', ignoreDuplicates: true });
                } else summaryNote = 'failed, sent without it';
            }
        }

        const emails = [];
        for (const p of people) {
            const unsubscribe = unsubscribeUrl(appUrl, p.user_id) ?? `${appUrl}/settings`;
            const email = renderMorningBrief({ name: p.name, org_name: p.org_name }, (tasks ?? []) as EmailTask[],
                { appUrl, unsubscribeUrl: unsubscribe, dateLabel: clock.label, now: now.getTime(), summary });
            if (email.empty) continue;
            emails.push({ person: p, email, unsubscribe });
        }
        if (!emails.length) { report.push({ org, sent: 0, skipped: 'nothing open or done' }); continue; }

        if (dry) {
            report.push({ org, sent: 0, skipped: 'dry run', summary: summaryNote, preview: emails.map(e => ({ to: e.person.email, subject: e.email.subject })) });
            continue;
        }

        // Claim first, so a parallel or repeated run never sends twice.
        const claimed = [];
        for (const e of emails) {
            if (testUser) { claimed.push(e); continue; }
            const { data: mine } = await db.rpc('claim_brief_email', { p_user: e.person.user_id, p_date: clock.date });
            if (mine === true) claimed.push(e);
        }

        let sent = 0;
        for (let i = 0; i < claimed.length; i += BATCH) {
            const chunk = claimed.slice(i, i + BATCH);
            const resp = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(chunk.map(e => ({
                    from, to: [e.person.email], subject: e.email.subject, text: e.email.text, html: e.email.html,
                    headers: { 'List-Unsubscribe': `<${e.unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
                }))),
            });
            if (resp.ok) { sent += chunk.length; continue; }
            // Let a later run try these people again.
            if (!testUser) {
                for (const e of chunk) await db.rpc('release_brief_email', { p_user: e.person.user_id, p_date: clock.date });
            }
        }
        report.push({ org, sent, summary: summaryNote, skipped: claimed.length - sent ? `${claimed.length - sent} failed, will retry` : '' });
    }

    return res.status(200).json({ dry, organisations: report });
}
