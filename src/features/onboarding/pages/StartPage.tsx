import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MailCheck, Rocket } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthCard from '@/features/auth/components/AuthCard';
import { SetupFields } from '../components/SetupFields';
import { finishSetup, type PendingSetup } from '../setup';

/** Self-serve sign-up: a new customer creates their own organisation. */
export default function StartPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [orgName, setOrgName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [withSample, setWithSample] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [checkEmail, setCheckEmail] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        const setup: PendingSetup = { name: name.trim(), org_name: orgName.trim(), company_name: companyName.trim(), with_sample: withSample };
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                // Kept on the login so setup can finish after the email is confirmed.
                options: { data: setup, emailRedirectTo: `${window.location.origin}/welcome` },
            });
            if (error) throw new Error(error.status === 429 ? 'Too many attempts. Wait a minute, then try again.' : error.message);

            // With email confirmation off, Supabase signs the person in at once.
            if (data.session) {
                await finishSetup(setup);
                navigate('/dashboard', { replace: true });
                return;
            }
            // Otherwise, or if the address is already registered (Supabase
            // answers the same way so the form can't reveal who has an account).
            setCheckEmail(true);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    if (checkEmail) {
        return (
            <AuthCard icon={MailCheck} title="Confirm your email"
                subtitle={<>We sent a link to <strong>{email.trim()}</strong>. Open it on this device to finish setting up {orgName.trim() || 'your organisation'}.</>}>
                <div className="space-y-3 text-center text-sm">
                    <p className="text-gray-500 dark:text-slate-400">No email after a few minutes? Check spam. If you already have an account, <Link to="/login" className="font-medium text-primary hover:underline">log in</Link> instead.</p>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard icon={Rocket} title="Start with Pulse360"
            subtitle="Set up your organisation in a minute. Your first morning brief is ready straight away.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-slate-300">Your name</label>
                    <Input id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
                </div>
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-slate-300">Work email</label>
                    <Input id="email" name="email" type="email" autoComplete="username" spellCheck={false}
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
                    <p id="new-password-hint" className="text-xs text-gray-500 dark:text-slate-400">At least 8 characters.</p>
                    <div className="relative">
                        <Input id="new-password" name="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                            minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required
                            aria-describedby="new-password-hint" className="pr-11 [&:user-invalid]:border-blocked" />
                        <button type="button" onClick={() => setShowPassword(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                        </button>
                    </div>
                </div>

                <SetupFields orgName={orgName} companyName={companyName} withSample={withSample}
                    onOrgName={setOrgName} onCompanyName={setCompanyName} onWithSample={setWithSample} />

                {error && <p role="alert" className="text-sm font-medium text-blocked dark:text-red-300">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Setting up…' : 'Create my organisation'}
                </Button>
                <p className="text-center text-xs text-gray-500 dark:text-slate-400">
                    By creating an organisation you agree to the <a href="/terms" className="font-medium text-ink underline underline-offset-2 dark:text-slate-200">Terms</a> and
                    confirm you’ve read the <a href="/privacy" className="font-medium text-ink underline underline-offset-2 dark:text-slate-200">Privacy notice</a>.
                </p>
                <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                    Already on Pulse360? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
                </p>
                <p className="text-center text-xs text-gray-500 dark:text-slate-400">
                    Joining a team that already uses Pulse360? Ask your admin for an invite instead.
                </p>
            </form>
        </AuthCard>
    );
}
