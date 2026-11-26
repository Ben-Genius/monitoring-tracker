import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Emails an invite link that was already created in pending_invites.
 *
 *   POST /api/send-invite   Authorization: Bearer <user access token>
 *   { invite_id }
 *
 * SECURITY: the invite is read with the CALLER'S token, so row-level security
 * decides whether they may see it (admins: any company, leads: their own).
 * The recipient, role and link all come from that row, never from the request,
 * so this cannot be used to mail arbitrary text or addresses.
 *
 * Env: RESEND_API_KEY, INVITE_FROM_EMAIL (e.g. "Commit <no-reply@yourdomain>"),
 * optional APP_URL (defaults to the request host).
 */

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin', executive: 'Executive', pa: 'Executive PA', lead: 'Project lead', employee: 'Staff',
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = req.headers.authorization ?? '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const { invite_id } = (req.body ?? {}) as Record<string, unknown>;
    if (!jwt) return res.status(401).json({ error: 'Not signed in.' });
    if (typeof invite_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(invite_id)) {
        return res.status(400).json({ error: 'Invalid invite.' });
    }

    const url = process.env.VITE_SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_ANON_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.INVITE_FROM_EMAIL;
    if (!url || !anon) return res.status(500).json({ error: 'Server is missing Supabase settings.' });
    if (!resendKey || !from) return res.status(501).json({ error: 'Email sending is not set up on the server.' });

    const db = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: invite, error } = await db
        .from('pending_invites')
        .select('email, name, role, token, used, expires_at, company:companies(name)')
        .eq('id', invite_id)
        .maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not read the invite.' });
    if (!invite || invite.used || new Date(invite.expires_at).getTime() < Date.now()) {
        return res.status(404).json({ error: 'That invite is not available.' });
    }

    const origin = process.env.APP_URL?.replace(/\/$/, '') ?? `https://${req.headers.host}`;
    const link = `${origin}/signup?token=${invite.token}`;
    const first = String(invite.name).trim().split(/\s+/)[0];
    const role = ROLE_LABELS[invite.role] ?? invite.role;
    const company = (invite.company as unknown as { name: string } | null)?.name;
    const until = new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

    const text = `Hi ${first}, you have been added to Commit as ${role}${company ? ` for ${company}` : ''}. Set up your login here: ${link} The link works until ${until}. How Commit handles your data: ${origin}/privacy`;
    const html = `<p>Hi ${esc(first)},</p><p>You have been added to Commit as <strong>${esc(role)}</strong>${company ? ` for ${esc(company)}` : ''}.</p><p><a href="${esc(link)}">Set up your login</a></p><p>The link works until ${esc(until)}.</p><p style="color:#5B6673;font-size:12px">How Commit handles your data: <a href="${esc(origin)}/privacy">privacy notice</a>.</p>`;

    const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [invite.email], subject: 'You’ve been invited to Commit', text, html }),
    });
    if (!sent.ok) return res.status(502).json({ error: 'The email service refused the message.' });
    return res.status(200).json({ sent: true });
}
