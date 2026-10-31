import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderKanban, BarChart3, Settings, Users, LogOut, X, Sunrise, BadgeCheck } from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import ThemeToggle from '@/components/ThemeToggle';
import { canReadBrief, canApprove, canAdminister } from '@/lib/permissions';
import { roleLabel } from '@/lib/roles';

// Pipeline (sales deals) and Reports (placeholder cards) were removed: neither
// serves project accountability. Their code is still in src/features.
const NAV = [
    { name: 'Morning brief', href: '/brief', icon: Sunrise, show: canReadBrief },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Approvals', href: '/approvals', icon: BadgeCheck, show: canApprove },
    { name: 'People', href: '/users', icon: Users, show: canAdminister },
    { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    mobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const nav = useMemo(() => NAV.filter(i => !i.show || i.show(user)), [user]);

    const companyName = selectedCompanyId === 'all' ? '' : companies.find(c => c.id === selectedCompanyId)?.name ?? '';
    const accent = companyName ? getCompanyTheme(companyName).primary : '#7FA3C7';

    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    }, [mobileOpen, onMobileClose]);

    const body = (onNavigate?: () => void) => (
        <div className="flex h-full flex-col bg-ink text-white">
            <div className="flex h-14 items-center gap-2.5 px-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[13px] font-bold" style={{ backgroundColor: accent }}>M</span>
                <span className="text-[15px] font-semibold tracking-tight">Monitoring Tracker</span>
                {onNavigate && (
                    <button onClick={onNavigate} className="ml-auto flex h-9 w-9 items-center justify-center rounded-[8px] text-white/70 hover:bg-white/10" aria-label="Close menu">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Main">
                <ul className="space-y-0.5">
                    {nav.map(item => {
                        const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                        return (
                            <li key={item.href}>
                                <Link
                                    to={item.href}
                                    onClick={onNavigate}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'relative flex h-10 items-center gap-3 rounded-[8px] px-3 text-[14px] transition-colors',
                                        active ? 'bg-white/10 font-semibold text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ backgroundColor: accent }} />}
                                    <item.icon className="h-[18px] w-[18px]" />
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="flex items-center gap-2.5 border-t border-white/10 px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                    {user?.name?.charAt(0) ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{user?.name ?? 'Signed in'}</p>
                    <p className="truncate text-[12px] text-white/60">{roleLabel(user?.role)}</p>
                </div>
                <div className="[&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_svg]:!text-white/70">
                    <ThemeToggle />
                </div>
                <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-white/70 hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    return (
        <>
            <aside className="hidden md:block w-[232px] shrink-0 h-screen sticky top-0">{body()}</aside>
            {mobileOpen && (
                <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
                    <button type="button" className="absolute inset-0 w-full bg-ink/50" aria-label="Close navigation menu" onClick={onMobileClose} />
                    <aside className="relative h-full w-[min(17rem,85vw)] animate-in slide-in-from-left duration-200">{body(onMobileClose)}</aside>
                </div>
            )}
        </>
    );
}
