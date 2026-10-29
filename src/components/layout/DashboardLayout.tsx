import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
            <Sidebar
                mobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-gray-50 dark:bg-slate-950 animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
