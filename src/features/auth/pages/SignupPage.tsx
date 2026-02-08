import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any>(null);

    // Form fields
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
            const { data, error } = await supabase
                .from('pending_invites')
                .select('*, company:companies(name)')
                .eq('token', token)
                .eq('used', false)
                .single();

            if (error || !data) {
                setError('Invalid or expired invitation link.');
                setLoading(false);
                return;
            }

            setInviteData(data);
            setName(data.name || '');
            setLoading(false);
        } catch (err) {
            setError('Failed to validate invitation.');
            setLoading(false);
        }
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: inviteData.email,
                password,
                options: {
                    data: {
                        full_name: name,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Signup failed");

            // 2. Create User Profile
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: inviteData.email,
                    name: name,
                    role: inviteData.role,
                    company_id: inviteData.company_id
                });

            if (profileError) {
                console.error("Profile creation failed", profileError);
                throw new Error("Failed to create user profile: " + profileError.message);
            }

            // 3. Mark invite as used
            await supabase
                .from('pending_invites')
                .update({ used: true })
                .eq('id', inviteData.id);

            // 4. Navigate
            // Wait a moment for session to set
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin bg-primary" /></div>;

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-red-600">Invitation Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => navigate('/login')} className="w-full">Back to Login</Button>
                </CardFooter>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Accept Invitation</CardTitle>
                    <p className="text-center text-sm text-gray-500">
                        Join {inviteData.company?.name || 'the team'} as a {inviteData.role}
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input value={inviteData.email} disabled className="bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Create Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">
                        Already have an account? Sign in
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
