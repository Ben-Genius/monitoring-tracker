import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OfflineNotice from './OfflineNotice';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canReadBrief, canReportWork } from '@/lib/permissions';
import { prefetchWhenIdle } from '@/lib/routeChunks';
import { useLiveUpdates } from '@/features/realtime/useLiveUpdates';

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user } = useAuth();
    // Other people's changes show up without refreshing.
    useLiveUpdates();
    const readsBrief = canReadBrief(user);
    const reportsWork = canReportWork(user);

    // Once the first page has drawn, fetch the code for the pages people open
    // most, so the next click is instant. Analytics (charts) waits for a hover.
    useEffect(() => prefetchWhenIdle([
        ...(reportsWork ? ['/my-work'] : []), ...(readsBrief ? ['/brief'] : []), '/dashboard', '/tasks', '/projects',
    ]), [readsBrief, reportsWork]);

    return (
        <div className="flex h-screen bg-paper dark:bg-slate-950">
            <Sidebar
                mobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <OfflineNotice />
                <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 bg-paper dark:bg-slate-950">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
