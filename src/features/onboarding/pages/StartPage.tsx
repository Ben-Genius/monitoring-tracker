import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AuthCard from '@/features/auth/components/AuthCard';
import { AuthError, AuthFooterRow, AuthInput, Field, PasswordInput, PreviewWindow, SubmitButton } from '@/features/auth/components/AuthLayout';
import { authLink, authMuted, mono } from '@/features/auth/components/authStyles';
import { SetupFields } from '../components/SetupFields';
import { finishSetup, type PendingSetup } from '../setup';

/** Self-serve sign-up: a new customer creates their own organisation. */
export default function StartPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [withSample, setWithSample] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [checkEmail, setCheckEmail] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        const setup: PendingSetup = { name: name.trim(), org_name: orgName.trim(), company_name: orgName.trim(), with_sample: withSample };
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
            <AuthCard label="Confirm your email" title="One more step."
                subtitle={<>We sent a link to <strong className="font-medium text-neutral-950 dark:text-white">{email.trim()}</strong>. Open it on this device to finish setting up {orgName.trim() || 'your organisation'}.</>}>
                <p className={`text-[14px] ${authMuted}`}>
                    No email after a few minutes? Check spam. If you already have an account, <Link to="/login" className={authLink}>log in</Link> instead.
                </p>
            </AuthCard>
        );
    }

    return (
        <AuthCard label="Start free" title="Create your organisation."
            subtitle="Set up in about a minute. Free for your whole team."
            aside={<WhatYouGet />}
            cta={{ to: '/login', label: 'Log in' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field id="name" label="Your name">
                    <AuthInput id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
                </Field>
                <Field id="email" label="Work email">
                    <AuthInput id="email" name="email" type="email" autoComplete="username" spellCheck={false} placeholder="you@company.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field id="new-password" label="Password" hint="At least 8 characters.">
                    <PasswordInput id="new-password" name="new-password" autoComplete="new-password" minLength={8}
                        value={password} onChange={(e) => setPassword(e.target.value)} required aria-describedby="new-password-hint" />
                </Field>

                <div className="border-t border-neutral-200 pt-4 dark:border-[#1F1F1F]">
                    <p className="mb-4 text-[12px] font-medium uppercase tracking-[.08em] text-neutral-500 dark:text-neutral-400" style={mono}>Your organisation</p>
                    <div className="space-y-4">
                        <SetupFields orgName={orgName} withSample={withSample} onOrgName={setOrgName} onWithSample={setWithSample} />
                    </div>
                </div>

                {error && <AuthError>{error}</AuthError>}
                <SubmitButton busy={busy} busyLabel="Setting up…">Create my organisation</SubmitButton>
                <p className={`text-[12px] leading-relaxed ${authMuted}`}>
                    By creating an organisation you agree to the <a href="/terms" className={authLink}>Terms</a> and
                    confirm you’ve read the <a href="/privacy" className={authLink}>Privacy notice</a>. Joining a team that already uses Commit? Ask your admin for an invite instead.
                </p>
            </form>
            <AuthFooterRow text="Already on Commit?" to="/login">Log in →</AuthFooterRow>
        </AuthCard>
    );
}

/** Decorative: what a new organisation gets on day one. */
function WhatYouGet() {
    const rows = [
        ['01', 'A sample project', 'every view filled in, so you can explore first'],
        ['02', 'Board, list, calendar, timeline', 'and a workload view for leads'],
        ['03', 'My work and WhatsApp updates', 'for people in the field'],
        ['04', 'Escalation when work goes quiet', 'owner, then lead, then leadership'],
    ];
    return (
        <PreviewWindow path="commit / new organisation">
            <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-medium">What you get today</p>
                <p className="text-[12px] text-neutral-500" style={mono}>free</p>
            </div>
            <ul className="mt-5 border-t border-neutral-200 dark:border-[#1F1F1F]">
                {rows.map(([n, t, m]) => (
                    <li key={n} className="grid grid-cols-[32px_1fr] gap-x-3 border-b border-neutral-200 py-3.5 dark:border-[#1F1F1F]">
                        <span className="text-[12px] text-neutral-400" style={mono}>{n}</span>
                        <span>
                            <span className="block text-[14px]">{t}</span>
                            <span className="block text-[13px] text-neutral-500">{m}</span>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="mt-5 text-[12px] text-neutral-500" style={mono}>Your whole team is free. No per-person fees, ever.</p>
        </PreviewWindow>
    );
}
