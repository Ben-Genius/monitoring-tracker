import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, ChevronDown } from 'lucide-react';
import { CheckIcon } from '@radix-ui/react-icons';
import NotificationsBell from '@/features/notifications/components/NotificationsBell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { getCompanyTheme, DEFAULT_BRAND_COLOR, cn } from '@/lib/utils';
import { canViewAllCompanies } from '@/lib/permissions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: companies = [] } = useCompanies();
    const { selectedCompanyId, setSelectedCompanyId } = useCompanyStore();
    const [q, setQ] = useState('');

    useEffect(() => {
        if (user && !canViewAllCompanies(user) && selectedCompanyId !== user.company_id) {
            setSelectedCompanyId(user.company_id);
        }
    }, [user, selectedCompanyId, setSelectedCompanyId]);

    const canSwitch = canViewAllCompanies(user);
    const current = selectedCompanyId === 'all' ? null : companies.find(c => c.id === selectedCompanyId);
    const dot = current ? getCompanyTheme(current.name).primary : DEFAULT_BRAND_COLOR;

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        const term = q.trim();
        navigate(term ? `/tasks?q=${encodeURIComponent(term)}` : '/tasks');
    };

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-surface px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
            <button type="button" onClick={onMenuClick} className="flex h-10 w-10 items-center justify-center rounded-[8px] text-ink dark:text-slate-100 md:hidden" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
            </button>

            {canSwitch ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg border border-line bg-surface hover:bg-paper dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 text-[14px] font-semibold text-ink shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                        >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
                            <span className="truncate max-w-[9rem] sm:max-w-[14rem]">
                                {current ? current.name : 'All companies'}
                            </span>
                            <ChevronDown className="-me-1 ms-1 h-4 w-4 shrink-0 text-ink-faint opacity-70" aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1">
                        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                            Switch workspace
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setSelectedCompanyId('all')}
                            className={cn(
                                "flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-md text-[13px] font-medium transition-colors",
                                selectedCompanyId === 'all' && "bg-accent font-semibold text-accent-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DEFAULT_BRAND_COLOR }} />
                                <span>All companies</span>
                            </div>
                            {selectedCompanyId === 'all' && (
                                <CheckIcon className="h-4 w-4 text-ink shrink-0 ml-2" />
                            )}
                        </DropdownMenuItem>
                        {companies.map(c => {
                            const cColor = getCompanyTheme(c.name).primary;
                            const isSelected = selectedCompanyId === c.id;
                            return (
                                <DropdownMenuItem
                                    key={c.id}
                                    onClick={() => setSelectedCompanyId(c.id)}
                                    className={cn(
                                        "flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-md text-[13px] font-medium transition-colors",
                                        isSelected && "bg-accent font-semibold text-accent-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cColor }} />
                                        <span className="truncate">{c.name}</span>
                                    </div>
                                    {isSelected && (
                                        <CheckIcon className="h-4 w-4 text-ink shrink-0 ml-2" />
                                    )}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <div className="flex items-center gap-2 pl-1 pr-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
                    <span className="truncate text-[14px] font-semibold text-ink dark:text-slate-100">{current?.name ?? ''}</span>
                </div>
            )}

            <div className="flex-1" />

            <form onSubmit={search} role="search" className="relative hidden lg:block w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search tasks and people"
                    aria-label="Search tasks"
                    className="h-9 w-full rounded-[8px] border border-line bg-paper pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:bg-surface dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                />
            </form>
            <NotificationsBell />
        </header>
    );
}
