import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { roleLabel } from '@/lib/roles';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import AuthCard from '../components/AuthCard';
import { AuthError, AuthFooterRow, AuthInput, Field, PasswordInput, PreviewWindow, SubmitButton } from '../components/AuthLayout';
import { authMuted, mono } from '../components/authStyles';

/** Shape returned by the get_invite(p_token) database function. */
interface Invite {
    id: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    company_name: string;
}

export default function SignupPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<Invite | null>(null);
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        checkToken();
    }, [token]);

    async function checkToken() {
        try {
            // Read through get_invite() rather than the table: pending_invites
            // is closed to anon so that invites cannot be enumerated. The
            // function returns only the row matching this exact token.
            const { data, error } = await supabase
                .rpc('get_invite', { p_token: token })
                .maybeSingle();

            const invite = data as Invite | null;

            if (error || !invite) {
                setError('Invalid or expired invitation link.');
                setLoading(false);
                return;
            }

            setInviteData(invite);
            setName(invite.name || '');
            setLoading(false);
        } catch (err) {
            setError('Failed to validate invitation.');
            setLoading(false);
        }
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteData) return;
        setSubmitting(true);
        setSubmitError(null);

        try {
            // The login is created server-side, already confirmed: a browser
            // signUp() would return no session (the project requires email
            // confirmation), so accept_invite below would be refused.
            const res = await fetch('/api/accept-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, name }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'Failed to create your account');

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: inviteData.email,
                password,
            });
            if (signInError) throw signInError;

            // One server-side call claims-or-creates the profile and consumes
            // the invite together.
            //
            // Claiming matters for engineers mirrored from Baserow: they
            // already have a users row keyed by a placeholder uuid, so a plain
            // insert would collide on users_email_key. accept_invite repoints
            // that row at the new auth id, and the foreign keys cascade so
            // their existing task assignments follow.
            //
            // Role and company come from the invite inside the function rather
            // than from this form, so the browser cannot choose its own role.
            const { error: profileError } = await supabase.rpc('accept_invite', {
                p_token: token,
                p_name: name,
            });

            if (profileError) {
                console.error('Profile creation failed', profileError);
                // A deactivated person's new login must not stay signed in.
                if (/deactivated/i.test(profileError.message)) {
                    await supabase.auth.signOut();
                    throw new Error('This account has been deactivated, so the invite can no longer be used. Ask an admin to restore access.');
                }
                throw new Error(profileError.message);
            }

            // Signing in already ran a session check, which may have raced
            // ahead of accept_invite and found no profile. Re-check now that
            // the profile exists, so the dashboard opens signed in.
            await useAuthStore.getState().checkSession();
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Signup error:', err);
            setSubmitError(err.message || 'Failed to sign up');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <AuthCard label="Invitation" title="Checking your invite…">
                <p role="status" className={`flex items-center gap-2 text-[14px] ${authMuted}`}>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    This takes a second.
                </p>
            </AuthCard>
        );
    }

    if (error) {
        return (
            <AuthCard label="Invitation" title="This invite doesn’t work." subtitle={`${error} Ask your admin to send a new one.`}>
                <AuthFooterRow text="Already have an account?" to="/login">Log in →</AuthFooterRow>
            </AuthCard>
        );
    }

    // Neither loading nor errored, but no invite resolved — nothing to render.
    if (!inviteData) return null;

    const team = inviteData.company_name || 'the team';
    return (
        <AuthCard label="Invitation" title={`Join ${team}.`}
            subtitle={<>You’ve been invited as <strong className="font-medium text-neutral-950 dark:text-white">{roleLabel(inviteData.role)}</strong>. Set a password to get started.</>}
            aside={<InviteAside team={team} role={roleLabel(inviteData.role)} />}>
            <form onSubmit={handleSignup} className="space-y-4">
                <Field id="invite-email" label="Email">
                    <AuthInput id="invite-email" value={inviteData.email} disabled autoComplete="username" />
                </Field>
                <Field id="invite-name" label="Full name">
                    <AuthInput id="invite-name" name="name" autoComplete="name" value={name}
                        onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field id="new-password" label="Create a password" hint="At least 6 characters.">
                    <PasswordInput id="new-password" name="new-password" autoComplete="new-password" minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)} required aria-describedby="new-password-hint" />
                </Field>
                {submitError && <AuthError>{submitError}</AuthError>}
                <SubmitButton busy={submitting} busyLabel="Creating account…">Create account</SubmitButton>
            </form>
            <AuthFooterRow text="Already have an account?" to="/login">Log in →</AuthFooterRow>
        </AuthCard>
    );
}

/** Decorative: the team being joined. */
function InviteAside({ team, role }: { team: string; role: string }) {
    return (
        <PreviewWindow path="commit / invitation">
            <p className="text-[12px] text-neutral-500" style={mono}>you’re joining</p>
            <p className="mt-2 text-[28px] leading-tight tracking-[-.03em]">{team}</p>
            <ul className="mt-6 border-t border-neutral-200 dark:border-[#1F1F1F]">
                {[['role', role], ['first stop', 'My work: only your tasks'], ['updates', 'from the app or WhatsApp']].map(([k, v]) => (
                    <li key={k} className="grid grid-cols-[96px_1fr] gap-3 border-b border-neutral-200 py-3 text-[14px] dark:border-[#1F1F1F]">
                        <span className="text-[12px] text-neutral-400" style={mono}>{k}</span>
                        <span>{v}</span>
                    </li>
                ))}
            </ul>
        </PreviewWindow>
    );
}
