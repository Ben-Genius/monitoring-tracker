import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './features/auth/hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';

// LoginPage is the landing route, so it stays in the main bundle — lazy-loading
// it would only add a network round trip before first paint.
import LoginPage from './features/auth/pages/LoginPage';

// Every other page is split into its own chunk. These pull in the heavy
// dependencies (recharts, xlsx, @dnd-kit), none of which are needed to render
// the login screen.
const SignupPage = lazy(() => import('./features/auth/pages/SignupPage'));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage'));
const TaskBoardPage = lazy(() => import('./features/tasks/pages/TaskBoardPage'));
const ProjectsPage = lazy(() => import('./features/projects/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./features/projects/pages/ProjectDetailPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/pages/AnalyticsPage'));
const PipelinePage = lazy(() => import('./features/pipeline/pages/PipelinePage'));
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./features/users/pages/UserManagementPage'));
const ApprovalsPage = lazy(() => import('./features/approvals/pages/ApprovalsPage'));

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

function App() {
    const checkSession = useAuthStore((state) => state.checkSession);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            {/* Public routes */}
                            <Route path="/" element={<LoginPage />} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route path="/login" element={<Navigate to="/" replace />} />

                            {/* Protected routes */}
                            <Route
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/tasks" element={<TaskBoardPage />} />
                                <Route path="/projects" element={<ProjectsPage />} />
                                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                                <Route path="/analytics" element={<AnalyticsPage />} />
                                <Route path="/pipeline" element={<PipelinePage />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/approvals" element={<ApprovalsPage />} />
                                <Route path="/users" element={<UserManagementPage />} />
                            </Route>

                            {/* Catch all */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </Router>
                <Toaster position="top-right" />
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
