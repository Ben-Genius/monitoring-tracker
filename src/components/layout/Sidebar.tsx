import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckSquare,
    FolderKanban,
    BarChart3,
    TrendingUp,
    FileSpreadsheet,
    Settings,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    LogOut
} from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Pipeline', href: '/pipeline', icon: TrendingUp },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
    { name: 'Users', href: '/users', icon: UserCircle },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    return (
        <div
            className={cn(
                'bg-white border-r border-gray-200 flex flex-col transition-all duration-300 h-screen sticky top-0',
                collapsed ? 'w-20' : 'w-72'
            )}
        >
            {/* Header / Brand */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <div
                    className="p-2 rounded-md mr-3 transition-colors duration-300"
                    style={{ backgroundColor: `${theme.primary}15` }}
                >
                    <BarChart3 className="h-6 w-6" style={{ color: theme.primary }} />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-lg leading-tight">Monitoring</span>
                        <span className="text-xs text-gray-500 font-medium tracking-wider">TRACKER SUITE</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-4 space-y-8 overflow-y-auto">
                {/* Main Menu */}
                <div className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                            Menu
                        </p>
                    )}
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group'
                                )}
                                style={{
                                    backgroundColor: isActive ? `${theme.primary}10` : 'transparent',
                                    color: isActive ? theme.primary : undefined
                                }}
                                title={collapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={cn(
                                        'h-5 w-5 transition-colors',
                                        !collapsed && 'mr-3'
                                    )}
                                    style={{
                                        color: isActive ? theme.primary : undefined
                                    }}
                                />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>

                {/* System / Bottom Area */}
                <div className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                            System
                        </p>
                    )}
                    <Link
                        to="/settings"
                        className={cn(
                            'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            location.pathname === '/settings' && 'text-primary bg-primary/5'
                        )}
                        style={location.pathname === '/settings' ? {
                            backgroundColor: `${theme.primary}10`,
                            color: theme.primary
                        } : {}}
                        title={collapsed ? "Settings" : undefined}
                    >
                        <Settings
                            className={cn('h-5 w-5 text-gray-400 mr-3')}
                            style={location.pathname === '/settings' ? { color: theme.primary } : {}}
                        />
                        {!collapsed && <span>Settings</span>}
                    </Link>
                </div>
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
                    <div className="flex items-center">
                        <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm transition-all duration-500"
                            style={{
                                background: `linear-gradient(to top right, ${theme.primary}, ${theme.accent})`
                            }}
                        >
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                                    {user?.name || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user?.role || 'Member'}</p>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button
                            onClick={signOut}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-destructive"
                            title="Sign out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-400 hover:text-primary transition-colors hover:shadow-md"
                    style={{ color: collapsed ? theme.primary : undefined }}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
