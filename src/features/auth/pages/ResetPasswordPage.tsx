import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import AuthCard from '../components/AuthCard';
import { AuthError, AuthFooterRow, Field, PasswordInput, SubmitButton } from '../components/AuthLayout';
import { authMuted } from '../components/authStyles';

type LinkState = 'checking' | 'ready' | 'expired';

/**
 * Where the reset email lands. Supabase turns the link into a short-lived
 * recovery session on load; this page then lets the person set a new password.
 */
export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [link, setLink] = useState<LinkState>('checking');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // An expired or reused link comes back with an error in the URL instead of a session.
        const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
        if (params.get('error') || params.get('error_code')) {
            setLink('expired');
            return;
        }
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) setLink('ready');
        });
        supabase.auth.getSession().then(({ data }) => { if (data.session) setLink('ready'); });
        // The session normally arrives within a second; after that, treat the link as dead.
        const timer = window.setTimeout(() => setLink(l => (l === 'checking' ? 'expired' : l)), 4000);
        return () => { sub.subscription.unsubscribe(); window.clearTimeout(timer); };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setSaving(false);
            setError(error.message.toLowerCase().includes('different')
                ? 'Choose a password you haven’t used here before.'
                : `Couldn’t save the new password: ${error.message}`);
            return;
        }
        // Sign out so the person proves the new password works, on a clean session.
        await supabase.auth.signOut();
        toast.success('Password changed. Log in with your new password.');
        navigate('/login', { replace: true });
    };

    if (link === 'checking') {
        return (
            <AuthCard label="Reset password" title="Checking your link…">
                <p role="status" className={`flex items-center gap-2 text-[14px] ${authMuted}`}>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    This takes a second.
                </p>
            </AuthCard>
        );
    }

    if (link === 'expired') {
        return (
            <AuthCard label="Reset password" title="This link has expired." subtitle="Reset links work once, and only for a short time.">
                <AuthFooterRow text="Need another?" to="/forgot-password">Send a new link →</AuthFooterRow>
            </AuthCard>
        );
    }

    return (
        <AuthCard label="Reset password" title="Choose a new password.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field id="new-password" label="New password" hint="At least 8 characters.">
                    <PasswordInput
                        id="new-password"
                        name="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        autoFocus
                        enterKeyHint="done"
                        aria-describedby="new-password-hint"
                    />
                </Field>
                {error && <AuthError>{error}</AuthError>}
                <SubmitButton busy={saving} busyLabel="Saving…">Save new password</SubmitButton>
            </form>
        </AuthCard>
    );
}
