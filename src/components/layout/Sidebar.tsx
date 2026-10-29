import { useState, useMemo, useEffect } from 'react';
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
    LogOut,
    X
} from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import ThemeToggle from '@/components/ThemeToggle';

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

interface SidebarProps {
    mobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
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

    useEffect(() => {
        if (!mobileOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onMobileClose();
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [mobileOpen, onMobileClose]);

    return (
        <>
        <aside
            className={cn(
                'hidden md:flex bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200/60 dark:border-slate-700/60 flex-col transition-all duration-500 ease-apple h-screen sticky top-0',
                collapsed ? 'w-20' : 'w-72'
            )}
        >
            <div className="h-16 flex items-center px-6 border-b border-gray-100/60 dark:border-slate-800/60">
                <div
                    className="p-2 rounded-xl mr-3 transition-all duration-300"
                    style={{ backgroundColor: `${theme.primary}15` }}
                >
                    <BarChart3 className="h-6 w-6" style={{ color: theme.primary }} />
                </div>
                {!collapsed && (
                    <div className="flex flex-col animate-fade-in">
                        <span className="font-bold text-gray-900 dark:text-slate-50 text-lg leading-tight">Monitoring</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wider">TRACKER SUITE</span>
                    </div>
                )}
            </div>

            <div className="flex-1 py-6 px-4 space-y-8 overflow-y-auto">
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
                                    'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group'
                                )}
                                style={{
                                    backgroundColor: isActive ? `${theme.primary}10` : 'transparent',
                                    color: isActive ? theme.primary : undefined
                                }}
                                title={collapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={cn(
                                        'h-5 w-5 transition-all duration-200',
                                        !collapsed && 'mr-3',
                                        !isActive && 'text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300'
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

                <div className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                            System
                        </p>
                    )}
                    <Link
                        to="/settings"
                        className={cn(
                            'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200',
                            location.pathname === '/settings' && 'text-primary bg-primary/5'
                        )}
                        style={location.pathname === '/settings' ? {
                            backgroundColor: `${theme.primary}10`,
                            color: theme.primary
                        } : {}}
                        title={collapsed ? "Settings" : undefined}
                    >
                        <Settings
                            className={cn('h-5 w-5 mr-3 transition-all duration-200')}
                            style={location.pathname === '/settings' ? { color: theme.primary } : {}}
                        />
                        {!collapsed && <span>Settings</span>}
                    </Link>
                </div>
            </div>

            <div className="p-4 border-t border-gray-100/60 dark:border-slate-800/60 bg-gray-50/30 dark:bg-slate-800/30">
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
                            <div className="ml-3 animate-fade-in">
                                <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate max-w-[120px]">
                                    {user?.name || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.role || 'Member'}</p>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <button
                                onClick={signOut}
                                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-destructive active:scale-90"
                                title="Sign out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 shadow-sm rounded-full p-1 text-gray-400 hover:text-primary transition-all hover:shadow-md active:scale-90"
                    style={{ color: collapsed ? theme.primary : undefined }}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>
        </aside>

        {mobileOpen && (
            <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
                <button
                    type="button"
                    className="absolute inset-0 w-full bg-slate-950/40 backdrop-blur-sm"
                    aria-label="Close navigation menu"
                    onClick={onMobileClose}
                />
                <aside className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-white dark:bg-slate-900 shadow-2xl animate-slide-up">
                    <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl p-2" style={{ backgroundColor: `${theme.primary}15` }}>
                                <BarChart3 className="h-5 w-5" style={{ color: theme.primary }} />
                            </div>
                            <div>
                                <p className="font-bold leading-tight text-gray-900 dark:text-slate-50">Monitoring</p>
                                <p className="text-[10px] font-medium tracking-wider text-gray-500 dark:text-slate-400">TRACKER SUITE</p>
                            </div>
                        </div>
                        <button type="button" onClick={onMobileClose} className="icon-btn" aria-label="Close navigation menu">
                            <X className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
                        <div className="space-y-1">
                            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Menu</p>
                            {navigation.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={onMobileClose}
                                        className="flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors"
                                        style={{
                                            backgroundColor: isActive ? `${theme.primary}10` : 'transparent',
                                            color: isActive ? theme.primary : undefined
                                        }}
                                    >
                                        <item.icon className="mr-3 h-5 w-5 text-gray-500 dark:text-slate-400" style={isActive ? { color: theme.primary } : {}} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="space-y-1">
                            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">System</p>
                            <Link
                                to="/settings"
                                onClick={onMobileClose}
                                className="flex items-center rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition-colors dark:text-slate-400"
                                style={location.pathname === '/settings' ? { backgroundColor: `${theme.primary}10`, color: theme.primary } : {}}
                            >
                                <Settings className="mr-3 h-5 w-5" />
                                Settings
                            </Link>
                        </div>
                    </nav>

                    <div className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-slate-800">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-semibold" style={{ background: `linear-gradient(to top right, ${theme.primary}, ${theme.accent})` }}>
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-50">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{user?.role || 'Member'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <button onClick={signOut} className="icon-btn text-gray-400 hover:text-destructive" title="Sign out" aria-label="Sign out">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        )}
        </>
    );
}
