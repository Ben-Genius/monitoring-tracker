import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthCard from '@/features/auth/components/AuthCard';
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
    const [companyName, setCompanyName] = useState('');
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
                setCompanyName(pending.company_name); setWithSample(pending.with_sample);
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
            <AuthCard icon={Building2} title="Log in to continue" subtitle="Your confirmation link has expired or was opened on another device.">
                <p className="text-center text-sm"><Link to="/login" className="font-medium text-primary hover:underline">Log in</Link> to finish setting up.</p>
            </AuthCard>
        );
    }

    if (session === 'checking' || auto) {
        return (
            <AuthCard icon={Building2} title="Setting up your organisation…">
                <p role="status" className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> This takes a few seconds.
                </p>
            </AuthCard>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await finishSetup({ name: name.trim(), org_name: orgName.trim(), company_name: companyName.trim(), with_sample: withSample });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthCard icon={Building2} title="Set up your organisation"
            subtitle="You’re signed in but not part of a team yet. Start your own, or ask your admin for an invite.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-slate-300">Your name</label>
                    <Input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                </div>
                <SetupFields orgName={orgName} companyName={companyName} withSample={withSample}
                    onOrgName={setOrgName} onCompanyName={setCompanyName} onWithSample={setWithSample} />
                {error && <p role="alert" className="text-sm font-medium text-blocked dark:text-red-300">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Setting up…' : 'Create my organisation'}</Button>
                <p className="text-center text-sm">
                    <button type="button" onClick={() => void useAuthStore.getState().signOut().then(() => navigate('/login'))}
                        className="font-medium text-primary hover:underline">Sign out</button>
                </p>
            </form>
        </AuthCard>
    );
}
