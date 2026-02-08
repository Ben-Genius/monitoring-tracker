import { Bell, Search, Building2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useEffect } from 'react';
import { getCompanyTheme } from '@/lib/utils';

export default function Header() {
    const { user } = useAuth();
    const { data: companies = [], isLoading } = useCompanies();
    const { selectedCompanyId, setSelectedCompanyId } = useCompanyStore();

    // Ensure non-admins are restricted to their company
    useEffect(() => {
        if (user && user.role !== 'admin' && selectedCompanyId !== user.company_id) {
            setSelectedCompanyId(user.company_id);
        }
    }, [user, selectedCompanyId, setSelectedCompanyId]);

    const isAdmin = user?.role === 'admin';
    const currentCompany = selectedCompanyId === 'all'
        ? { name: 'Global View', id: 'all' }
        : companies.find(c => c.id === selectedCompanyId) || { name: 'Loading...', id: selectedCompanyId };

    const theme = getCompanyTheme(currentCompany?.name || '');

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6">
            {/* Company Selector */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                    {isAdmin ? (
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="border-none bg-transparent text-lg font-semibold text-gray-900 dark:text-slate-50 focus:outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="all">Global View</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-lg font-semibold text-gray-900 dark:text-slate-50">
                            {currentCompany?.name || 'Loading...'}
                        </span>
                    )}
                </div>
                {!isLoading && (
                    <Badge
                        variant="outline"
                        style={selectedCompanyId !== 'all' ? {
                            color: theme.primary,
                            backgroundColor: `${theme.primary}10`,
                            borderColor: `${theme.primary}20`,
                            fontWeight: 'bold'
                        } : {}}
                    >
                        {currentCompany?.name}
                    </Badge>
                )}
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="search"
                        placeholder="Search tasks, projects..."
                        className="pl-10"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800">
                    <Bell className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                    <span className="absolute top-1 right-1 h-2 w-2 bg-error rounded-full"></span>
                </button>
            </div>
        </header>
    );
}
