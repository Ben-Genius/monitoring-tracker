import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthCard from '../components/AuthCard';

type LinkState = 'checking' | 'ready' | 'expired';

/**
 * Where the reset email lands. Supabase turns the link into a short-lived
 * recovery session on load; this page then lets the person set a new password.
 */
export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [link, setLink] = useState<LinkState>('checking');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
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
        return <AuthCard icon={KeyRound} title="Checking your link…"><span className="sr-only" role="status">Checking your reset link</span></AuthCard>;
    }

    if (link === 'expired') {
        return (
            <AuthCard icon={LinkIcon} title="This link has expired" subtitle="Reset links work once and only for a short time.">
                <p className="text-center text-sm">
                    <Link to="/forgot-password" className="font-medium text-primary hover:underline">Send a new link</Link>
                </p>
            </AuthCard>
        );
    }

    return (
        <AuthCard icon={KeyRound} title="Choose a new password">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-slate-300">New password</label>
                    <p id="new-password-hint" className="text-xs text-gray-500 dark:text-slate-400">At least 8 characters.</p>
                    <div className="relative">
                        <Input
                            id="new-password"
                            name="new-password"
                            type={show ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            autoFocus
                            enterKeyHint="done"
                            aria-describedby="new-password-hint"
                            className="pr-11 [&:user-invalid]:border-blocked"
                        />
                        <button
                            type="button"
                            onClick={() => setShow(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                            aria-label={show ? 'Hide password' : 'Show password'}
                        >
                            {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                        </button>
                    </div>
                </div>
                {error && <p role="alert" className="text-sm font-medium text-blocked dark:text-red-300">{error}</p>}
                <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Saving…' : 'Save new password'}
                </Button>
            </form>
        </AuthCard>
    );
}
