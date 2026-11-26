import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthCard from '../components/AuthCard';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSending(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setSending(false);
        // Only a failure to send is reported. Whether the address has an account
        // is never revealed, so the form cannot be used to find out who works here.
        if (error && error.status !== 400 && error.status !== 404) {
            setError(error.status === 429
                ? 'Too many requests. Wait a minute, then try again.'
                : 'We couldn’t send the email. Check your connection and try again.');
            return;
        }
        setSent(true);
    };

    if (sent) {
        return (
            <AuthCard icon={MailCheck} title="Check your email"
                subtitle={<>If <strong>{email.trim()}</strong> has a Commit account, a link to reset the password is on its way. It works once.</>}>
                <div className="space-y-3 text-center text-sm">
                    <p className="text-gray-500 dark:text-slate-400">No email after a few minutes? Check spam, or ask your admin to send you a new invite.</p>
                    <Link to="/login" className="inline-block font-medium text-primary hover:underline">Back to log in</Link>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard icon={KeyRound} title="Reset your password" subtitle="Enter the email you sign in with and we’ll send you a link to choose a new password.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        spellCheck={false}
                        enterKeyHint="send"
                        required
                        autoFocus
                    />
                </div>
                {error && <p role="alert" className="text-sm font-medium text-blocked dark:text-red-300">{error}</p>}
                <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? 'Sending…' : 'Send reset link'}
                </Button>
                <p className="text-center text-sm">
                    <Link to="/login" className="font-medium text-primary hover:underline">Back to log in</Link>
                </p>
            </form>
        </AuthCard>
    );
}
