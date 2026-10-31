import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, ChevronDown } from 'lucide-react';
import NotificationsBell from '@/features/notifications/components/NotificationsBell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { getCompanyTheme } from '@/lib/utils';
import { canViewAllCompanies } from '@/lib/permissions';

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
    const dot = current ? getCompanyTheme(current.name).primary : '#7FA3C7';

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        const term = q.trim();
        navigate(term ? `/tasks?q=${encodeURIComponent(term)}` : '/tasks');
    };

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
            <button type="button" onClick={onMenuClick} className="flex h-10 w-10 items-center justify-center rounded-[8px] text-ink md:hidden" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
            </button>

            <label className="relative flex min-w-0 items-center gap-2 rounded-[8px] pl-1 pr-1">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
                {canSwitch ? (
                    <>
                        <span className="sr-only">Company</span>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="min-w-0 max-w-[11rem] sm:max-w-xs cursor-pointer appearance-none bg-transparent pr-6 text-[15px] font-semibold text-ink outline-none"
                        >
                            <option value="all">All companies</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1 h-4 w-4 text-ink-faint" />
                    </>
                ) : (
                    <span className="truncate text-[15px] font-semibold text-ink">{current?.name ?? ''}</span>
                )}
            </label>

            <div className="flex-1" />

            <form onSubmit={search} role="search" className="relative hidden lg:block w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search tasks and people"
                    aria-label="Search tasks"
                    className="h-9 w-full rounded-[8px] border border-line bg-paper pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-progress focus:bg-surface"
                />
            </form>
            <NotificationsBell />
        </header>
    );
}
