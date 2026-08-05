import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading, initialized, missingProfile, signOut } = useAuth();

    // Gate on `initialized`, not just `loading`. Restoring a session from
    // storage is async, so on a page refresh there is a tick where loading is
    // false and user is still null — redirecting then would bounce a
    // signed-in person back to the login screen on every refresh.
    if (!initialized || loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // Authenticated with Supabase but no row in public.users. Redirecting here
    // would loop: the session is still valid, so the login page would send
    // them straight back. Say what is wrong instead.
    if (missingProfile) {
        return (
            <div className="h-screen flex items-center justify-center p-4">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                        No workspace access
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                        You are signed in, but this account has no profile in the
                        workspace. Ask an administrator to send you an invitation.
                    </p>
                    <button
                        onClick={() => void signOut()}
                        className="rounded-pill bg-primary px-5 py-2 text-sm font-medium text-white"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
