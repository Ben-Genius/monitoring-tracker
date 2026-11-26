import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/features/auth/components/AuthCard';
import { AuthError, AuthFooterRow, AuthInput, Field, SubmitButton } from '@/features/auth/components/AuthLayout';
import { authMuted } from '@/features/auth/components/authStyles';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { homePath } from '@/lib/permissions';
import { SetupFields } from '../components/SetupFields';
import { finishSetup, pendingSetupFrom } from '../setup';

/**
 * Where a signed-in person with no profile lands: after confirming their
 * sign-up email, or when logging in before setup finished. If the sign-up form
 * left its answers on the login, setup finishes by itself; otherwise the
 * person fills them in here.
 */
export default function WelcomePage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const initialized = useAuthStore((s) => s.initialized);
    const [session, setSession] = useState<'checking' | 'none' | 'present'>('checking');
    const [auto, setAuto] = useState(false);
    const [name, setName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [withSample, setWithSample] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const started = useRef(false);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            if (!data.user) { setSession('none'); return; }
            setSession('present');
            const pending = pendingSetupFrom(data.user.user_metadata);
            if (pending) {
                setName(pending.name); setOrgName(pending.org_name);
                setWithSample(pending.with_sample);
            }
            // Run once, even under StrictMode's double effect.
            if (pending && !started.current) {
                started.current = true;
                setAuto(true);
                try {
                    await finishSetup(pending);
                    navigate('/dashboard', { replace: true });
                } catch (err) {
                    setError((err as Error).message);
                    setAuto(false);
                }
            }
        });
    }, [navigate]);

    if (initialized && user) return <Navigate to={homePath(user)} replace />;

    if (session === 'none') {
        return (
            <AuthCard label="Welcome" title="Log in to continue." subtitle="Your confirmation link has expired or was opened on another device.">
                <AuthFooterRow text="Log in to finish setting up." to="/login">Log in →</AuthFooterRow>
            </AuthCard>
        );
    }

    if (session === 'checking' || auto) {
        return (
            <AuthCard label="Welcome" title="Setting up your organisation…">
                <p role="status" className={`flex items-center gap-2 text-[14px] ${authMuted}`}>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    This takes a few seconds.
                </p>
            </AuthCard>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await finishSetup({ name: name.trim(), org_name: orgName.trim(), company_name: orgName.trim(), with_sample: withSample });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthCard label="Welcome" title="Set up your organisation."
            subtitle="You’re signed in but not part of a team yet. Start your own, or ask your admin for an invite.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field id="name" label="Your name">
                    <AuthInput id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                </Field>
                <SetupFields orgName={orgName} withSample={withSample} onOrgName={setOrgName} onWithSample={setWithSample} />
                {error && <AuthError>{error}</AuthError>}
                <SubmitButton busy={busy} busyLabel="Setting up…">Create my organisation</SubmitButton>
            </form>
            <div className="mt-10 flex items-center justify-between gap-4 border-t border-neutral-200 pt-6 text-[14px] dark:border-[#1F1F1F]">
                <span className={authMuted}>Wrong account?</span>
                <button type="button" onClick={() => void useAuthStore.getState().signOut().then(() => navigate('/login'))}
                    className="font-medium underline-offset-4 hover:underline">Sign out</button>
            </div>
        </AuthCard>
    );
}
