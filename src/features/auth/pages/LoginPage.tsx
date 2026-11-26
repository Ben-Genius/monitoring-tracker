import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useAuthStore } from '../hooks/useAuth';
import { homePath } from '@/lib/permissions';
import { AuthError, AuthFooterRow, AuthHeading, AuthInput, AuthShell, Field, PasswordInput, PreviewWindow, SubmitButton } from '../components/AuthLayout';
import { delay, mono } from '../components/authStyles';

/**
 * Login, in the same language as the public site and the other sign-in
 * screens (see AuthLayout). The panel on the right previews My work.
 */
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
            navigate(homePath(useAuthStore.getState().user));
        } catch (err: any) {
            // Signed in, but setup never finished (or they were never invited): let them finish it.
            if (useAuthStore.getState().missingProfile) {
                navigate('/welcome');
                return;
            }
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell aside={<MyWorkPreview />} cta={{ to: '/start', label: 'Start free' }}>
            <AuthHeading label="Log in" title="Welcome back." subtitle="Pick up where your team left off." id="login-h" />

            <form onSubmit={handleSubmit} className="login-in mt-10 space-y-4" style={delay(.18)} aria-labelledby="login-h">
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
                        enterKeyHint="next"
                        required
                    />
                </Field>
                <Field
                    id="current-password"
                    label="Password"
                    extra={
                        <Link to="/forgot-password" className="text-[13px] text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline dark:text-neutral-400 dark:hover:text-white">
                            Forgot password?
                        </Link>
                    }
                >
                    <PasswordInput
                        id="current-password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        enterKeyHint="go"
                        required
                    />
                </Field>
                {error && <AuthError>{error}</AuthError>}
                <SubmitButton busy={loading} busyLabel="Logging in…">Log in</SubmitButton>
            </form>

            <AuthFooterRow text="New to Commit?" to="/start">Create your organisation →</AuthFooterRow>
        </AuthShell>
    );
}

/** Decorative: what the app shows first. */
function MyWorkPreview() {
    const rows = [
        { t: 'Pour the ground-floor slab', m: 'blocked · waiting on cement', hot: true },
        { t: 'Submit the fire safety drawings', m: '3 days late', hot: true },
        { t: 'Install the roof trusses', m: 'due fri · 50%', hot: false },
    ];
    return (
        <PreviewWindow path="commit / my-work">
            <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-medium">Good morning, Ama</p>
                <p className="text-[12px] text-neutral-500" style={mono}>2 need you today</p>
            </div>
            <ul className="mt-5 border-t border-neutral-200 dark:border-[#1F1F1F]">
                {rows.map(r => (
                    <li key={r.t} className="flex items-center gap-3 border-b border-neutral-200 py-3.5 dark:border-[#1F1F1F]">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.hot ? 'bg-[#C9361E] dark:bg-[#FF6B52]' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                        <span className="min-w-0 flex-1 truncate text-[14px]">{r.t}</span>
                        <span className={`shrink-0 text-[12px] ${r.hot ? 'text-[#C9361E] dark:text-[#FF6B52]' : 'text-neutral-500'}`} style={mono}>{r.m}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-5 flex h-11 items-center justify-center rounded-lg bg-neutral-950 text-[14px] font-medium text-white dark:bg-white dark:text-neutral-950">
                Mark roof trusses 75% done
            </div>
            <p className="mt-4 flex items-center gap-2 text-[12px] text-neutral-500" style={mono}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-950 dark:bg-white" />
                Kofi updated Site survey · just now
            </p>
        </PreviewWindow>
    );
}
