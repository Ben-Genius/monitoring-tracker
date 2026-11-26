import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthCard from '../components/AuthCard';
import { AuthError, AuthFooterRow, AuthInput, Field, SubmitButton } from '../components/AuthLayout';
import { authMuted } from '../components/authStyles';

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
            <AuthCard label="Check your email" title="Link on its way."
                subtitle={<>If <strong className="font-medium text-neutral-950 dark:text-white">{email.trim()}</strong> has a Commit account, a link to reset the password is on its way. It works once.</>}>
                <p className={`text-[14px] ${authMuted}`}>No email after a few minutes? Check spam, or ask your admin to send you a new invite.</p>
                <AuthFooterRow text="Remembered it?" to="/login">Back to log in →</AuthFooterRow>
            </AuthCard>
        );
    }

    return (
        <AuthCard label="Reset password" title="Forgot your password?"
            subtitle="Enter the email you sign in with and we’ll send you a link to choose a new one.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field id="email" label="Email">
                    <AuthInput
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="username"
                        spellCheck={false}
                        enterKeyHint="send"
                        required
                        autoFocus
                    />
                </Field>
                {error && <AuthError>{error}</AuthError>}
                <SubmitButton busy={sending} busyLabel="Sending…">Send reset link</SubmitButton>
            </form>
            <AuthFooterRow text="Remembered it?" to="/login">Back to log in →</AuthFooterRow>
        </AuthCard>
    );
}
