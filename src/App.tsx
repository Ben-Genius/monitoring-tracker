import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './features/auth/hooks/useAuth';

// Pages
import LoginPage from './features/auth/pages/LoginPage';
import SignupPage from './features/auth/pages/SignupPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import TaskBoardPage from './features/tasks/pages/TaskBoardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import ProjectDetailPage from './features/projects/pages/ProjectDetailPage';
import AnalyticsPage from './features/analytics/pages/AnalyticsPage';
import PipelinePage from './features/pipeline/pages/PipelinePage';
import ReportsPage from './features/reports/pages/ReportsPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import UserManagementPage from './features/users/pages/UserManagementPage';

import ApprovalsPage from './features/approvals/pages/ApprovalsPage';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

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
        <QueryClientProvider client={queryClient}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            </Router>
        </QueryClientProvider>
    );
}

export default App;
