import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UserPlus, Mail, Lock, ArrowLeft } from 'lucide-react';

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
        setError(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: inviteData.email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Signup failed");

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
                throw new Error(profileError.message);
            }

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to sign up');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Validating invitation...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
            <div className="w-full max-w-md animate-fade-scale-in">
                <Card className="rounded-2xl border-gray-200/60 dark:border-slate-700/60 shadow-lg">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center mb-4 mx-auto">
                            <Loader2 className="w-6 h-6 text-error" />
                        </div>
                        <CardTitle className="text-center text-error">Invitation Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-gray-600 dark:text-slate-400">{error}</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => navigate('/login')} className="w-full rounded-pill">Back to Login</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );

    // Neither loading nor errored, but no invite resolved — nothing to render.
    if (!inviteData) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
            <div className="w-full max-w-md animate-spring-up">
                <Card className="rounded-2xl border-gray-200/60 dark:border-slate-700/60 shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                            <UserPlus className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-center tracking-tight">Accept Invitation</CardTitle>
                        <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                            Join <strong>{inviteData.company_name || 'the team'}</strong> as a <strong className="capitalize">{inviteData.role}</strong>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input value={inviteData.email} disabled className="pl-10 bg-gray-50/50 dark:bg-slate-800/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Full Name</label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Enter your full name"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Create Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Min. 6 characters"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-error/10 border border-error/20 text-error text-sm p-4 rounded-2xl">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full rounded-pill h-11" disabled={submitting}>
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </span>
                                ) : 'Create Account'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center pt-2">
                        <Link to="/login" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1">
                            <ArrowLeft className="w-3 h-3" />
                            Already have an account? Sign in
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
