import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';

/**
 * Creates the login for an invited person, already email-confirmed.
 *
 *   POST /api/accept-invite  { token, password, name }
 *
 * Why this exists: the project requires email confirmation, so a browser
 * signUp() returns no session and the follow-up accept_invite() call fails
 * with "not authenticated". It also spends Supabase's small hourly email
 * quota. The invite link is itself proof of the address — an admin issued
 * it to that email — so no confirmation email is needed.
 *
 * This only creates the auth user. The browser then signs in and calls
 * accept_invite(), which keeps role/company assignment and the
 * invite-email check in one place, in the database.
 *
 * SECURITY: the token is the only credential. The login is always created
 * for the invite's own email, never one from the request. An existing login
 * is only taken over when it has no profile yet (a half-finished sign-up);
 * a working account is refused, so an invite link cannot reset a real
 * user's password.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { token, password, name } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) {
        return res.status(400).json({ error: 'Invalid or expired invitation link.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const fullName = typeof name === 'string' ? name.trim().slice(0, 120) : '';

    const db = supabaseAdmin();

    const { data: invite, error: inviteError } = await db
        .from('pending_invites')
        .select('email')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (inviteError) return res.status(500).json({ error: 'Could not check the invitation.' });
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invitation link.' });

    const email = invite.email.toLowerCase();
    const metadata = { full_name: fullName };

    const created = await db.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: metadata,
    });
    if (!created.error) return res.status(200).json({ email });
    if (created.error.code !== 'email_exists') {
        return res.status(400).json({ error: created.error.message });
    }

    // A login already exists for this email. Find it (the user base is small,
    // so paging the admin list is fine) and decide whether it is safe to reuse.
    let existing: { id: string } | undefined;
    for (let page = 1; !existing; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return res.status(500).json({ error: 'Could not check the existing account.' });
        existing = data.users.find(u => u.email?.toLowerCase() === email);
        if (data.users.length < 200) break;
    }
    if (!existing) return res.status(500).json({ error: 'Could not check the existing account.' });

    const { data: profile } = await db.from('users').select('id').eq('id', existing.id).maybeSingle();
    if (profile) {
        return res.status(409).json({ error: 'This email already has an account. Sign in instead.' });
    }

    const updated = await db.auth.admin.updateUserById(existing.id, {
        password, email_confirm: true, user_metadata: metadata,
    });
    if (updated.error) return res.status(400).json({ error: updated.error.message });
    return res.status(200).json({ email });
}
