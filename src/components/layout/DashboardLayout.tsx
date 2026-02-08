import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header />

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-950">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
