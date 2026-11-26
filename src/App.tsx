import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './features/auth/hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { homePath } from './lib/permissions';
import { routeChunks } from './lib/routeChunks';

// LoginPage is where the installed app opens (/login), so it stays in the main
// bundle; lazy-loading it would only add a round trip before first paint.
import LoginPage from './features/auth/pages/LoginPage';

// Every other page is split into its own chunk. These pull in the heavy
// dependencies (recharts, the spreadsheet reader, @dnd-kit), none of which are needed to render
// the login screen.
const SignupPage = lazy(() => import('./features/auth/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage'));
const StartPage = lazy(() => import('./features/onboarding/pages/StartPage'));
const WelcomePage = lazy(() => import('./features/onboarding/pages/WelcomePage'));
const DashboardPage = lazy(routeChunks['/dashboard']);
const TaskBoardPage = lazy(routeChunks['/tasks']);
const MyWorkPage = lazy(routeChunks['/my-work']);
const WorkloadPage = lazy(routeChunks['/workload']);
const ProjectsPage = lazy(routeChunks['/projects']);
const ProjectDetailPage = lazy(() => import('./features/projects/pages/ProjectDetailPage'));
const AnalyticsPage = lazy(routeChunks['/analytics']);
const BriefPage = lazy(routeChunks['/brief']);
const SettingsPage = lazy(routeChunks['/settings']);
const UserManagementPage = lazy(routeChunks['/users']);
const ApprovalsPage = lazy(routeChunks['/approvals']);

// Layout
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

/** Shown while a route chunk is being fetched. */
function RouteFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

/** "/" inside the app: signed in goes home, signed out goes to log in. */
function RootRedirect() {
    const user = useAuthStore((state) => state.user);
    const initialized = useAuthStore((state) => state.initialized);
    if (!initialized) return <RouteFallback />;
    return <Navigate to={user ? homePath(user) : '/login'} replace />;
}

/**
 * Keeps signed-in people off the login screen. Without it, a logged-in user
 * opening "/" sees the sign-in form again even though their session is valid.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user);
    const initialized = useAuthStore((state) => state.initialized);

    if (initialized && user) return <Navigate to={homePath(user)} replace />;
    return <>{children}</>;
}

function App() {
    const checkSession = useAuthStore((state) => state.checkSession);
    const subscribe = useAuthStore((state) => state.subscribe);

    useEffect(() => {
        checkSession();
        // Supabase rotates the access token in the background and can sign the
        // session out (expiry, password change, sign-out in another tab).
        // Without this listener the store keeps a stale user and the app only
        // notices on a full reload.
        return subscribe();
    }, [checkSession, subscribe]);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <Router>
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            {/* Public routes */}
                            {/* "/" is the public landing page (index.html). Reached from inside the app, it moves on. */}
                            <Route path="/" element={<RootRedirect />} />
                            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
                            {/* Not public-only: the reset link signs the person in with a recovery session. */}
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                            <Route path="/start" element={<PublicOnlyRoute><StartPage /></PublicOnlyRoute>} />
                            {/* Signed in but no profile yet: finishes self-serve setup. */}
                            <Route path="/welcome" element={<WelcomePage />} />

                            {/* Protected routes */}
                            <Route
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/my-work" element={<MyWorkPage />} />
                                <Route path="/tasks" element={<TaskBoardPage />} />
                                <Route path="/workload" element={<WorkloadPage />} />
                                <Route path="/projects" element={<ProjectsPage />} />
                                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                                <Route path="/analytics" element={<AnalyticsPage />} />
                                <Route path="/brief" element={<BriefPage />} />
                                <Route path="/pipeline" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/approvals" element={<ApprovalsPage />} />
                                <Route path="/users" element={<UserManagementPage />} />
                            </Route>

                            {/* Catch all */}
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </Suspense>
                </Router>
                <Toaster position="top-right" />
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
