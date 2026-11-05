import { toast } from 'react-hot-toast';
import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    UserPlus,
    Copy,
    Check,
    Search,
    Mail,
    Shield,
    X,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Building2,
    Clock,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn, getCompanyTheme, formatDate, DEFAULT_BRAND_COLOR } from '@/lib/utils';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { canAdminister } from '@/lib/permissions';
import { tx } from '@/features/dashboard/components/tokens';

interface UserRecord {
    id: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    is_active: boolean;
    created_at?: string;
    company?: {
        id: string;
        name: string;
    };
}

interface CompanyRecord {
    id: string;
    name: string;
}

interface PendingInviteRecord {
    id: string;
    name?: string;
    email: string;
    role: string;
    token: string;
    created_at: string;
    company?: {
        name: string;
    };
}

type SortField = 'name' | 'email' | 'role' | 'company' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface SortRule {
    field: SortField;
    direction: SortDirection;
}

const ROLE_LABELS: Record<string, { label: string; desc: string; badgeClass: string }> = {
    admin: {
        label: 'Admin',
        desc: 'Manages people, companies, and settings',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    },
    lead: {
        label: 'Project Lead',
        desc: 'Assigns tasks, tracks budgets, and approves',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    },
    employee: {
        label: 'Staff Member',
        desc: 'Works on assigned project tasks',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    },
    executive: {
        label: 'Executive',
        desc: 'Company-wide read-only visibility',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    },
    pa: {
        label: 'Executive PA',
        desc: 'Curates daily briefs across all companies',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
    },
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companiesFromStore = [] } = useCompanies();
    const isAdmin = canAdminister(currentUser);

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [companies, setCompanies] = useState<CompanyRecord[]>([]);
    const [invites, setInvites] = useState<PendingInviteRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal and dialog states
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [confirmActionUser, setConfirmActionUser] = useState<UserRecord | null>(null);

    // Filtering & Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
    const [sortRule, setSortRule] = useState<SortRule>({ field: 'name', direction: 'asc' });

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Invite Form State
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'employee',
        company_id: '',
    });

    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
    const [copiedModalLink, setCopiedModalLink] = useState(false);

    // Accessibility IDs
    const inviteNameId = useId();
    const inviteEmailId = useId();
    const inviteRoleId = useId();
    const inviteCompanyId = useId();

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companiesFromStore.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companiesFromStore]);

    const theme = getCompanyTheme(currentCompanyName);
    const primaryColor = theme.primary || DEFAULT_BRAND_COLOR;

    const fetchData = useCallback(async () => {
        setLoading(true);
        let usersQuery = supabase
            .from('users')
            .select('*, company:companies(id, name)')
            .order('created_at', { ascending: false });

        let invitesQuery = supabase
            .from('pending_invites')
            .select('*, company:companies(name)')
            .eq('used', false)
            .order('created_at', { ascending: false });

        // Filter by company if lead
        if (!isAdmin && currentUser?.company_id) {
            usersQuery = usersQuery.eq('company_id', currentUser.company_id);
            invitesQuery = invitesQuery.eq('company_id', currentUser.company_id);
        }

        const [{ data: usersData }, { data: companiesData }, { data: invitesData }] = await Promise.all([
            usersQuery,
            supabase.from('companies').select('*').order('name'),
            invitesQuery
        ]);

        if (usersData) setUsers(usersData);
        if (companiesData) setCompanies(companiesData);
        if (invitesData) setInvites(invitesData);
        setLoading(false);
    }, [isAdmin, currentUser?.company_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle ESC key for closing modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isInviteDialogOpen) {
                    setIsInviteDialogOpen(false);
                    setInviteLink(null);
                }
                if (confirmActionUser) {
                    setConfirmActionUser(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInviteDialogOpen, confirmActionUser]);

    // Reset page to 1 whenever filters or search change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, selectedCompanyFilter, selectedRoleFilter, selectedStatusFilter, sortRule, pageSize]);

    async function handleInvite() {
        const missing = [
            !formData.name && 'full name',
            !formData.email && 'work email',
            !formData.company_id && 'company'
        ].filter(Boolean);

        if (missing.length) {
            toast.error(`Please provide the ${missing.join(', ')}.`);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('pending_invites')
                .insert({
                    email: formData.email.trim(),
                    name: formData.name.trim(),
                    role: formData.role,
                    company_id: formData.company_id,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const link = `${window.location.origin}/signup?token=${data.token}`;
                setInviteLink(link);
                toast.success('Invitation generated successfully');
                fetchData();
            }
        } catch (error) {
            console.error('Error creating invite:', error);
            toast.error(
                error instanceof Error && error.message.includes('duplicate')
                    ? 'That email already has an active invitation.'
                    : 'Couldn’t create the invite. Please check the email and try again.'
            );
        }
    }

    async function toggleUserStatus(userToUpdate: UserRecord) {
        const nextStatus = !userToUpdate.is_active;

        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: nextStatus })
                .eq('id', userToUpdate.id);

            if (error) throw error;

            // Optimistic state update
            setUsers(prev => prev.map(u => (u.id === userToUpdate.id ? { ...u, is_active: nextStatus } : u)));
            toast.success(
                nextStatus
                    ? `Restored access for ${userToUpdate.name}`
                    : `Deactivated ${userToUpdate.name}`
            );
        } catch (error) {
            console.error('Error updating user status:', error);
            toast.error('Failed to update user status.');
        } finally {
            setConfirmActionUser(null);
        }
    }

    const copyInviteLink = (token: string, inviteId?: string) => {
        const link = `${window.location.origin}/signup?token=${token}`;
        navigator.clipboard.writeText(link);
        if (inviteId) {
            setCopiedTokenId(inviteId);
            setTimeout(() => setCopiedTokenId(null), 2000);
        } else {
            setCopiedModalLink(true);
            setTimeout(() => setCopiedModalLink(false), 2000);
        }
        toast.success('Invite link copied to clipboard');
    };

    // Clear all filters
    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCompanyFilter('all');
        setSelectedRoleFilter('all');
        setSelectedStatusFilter('all');
        setSortRule({ field: 'name', direction: 'asc' });
    };

    // Filter & Sort Pipeline
    const filteredAndSortedUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        const filtered = users.filter(user => {
            const matchesSearch =
                !term ||
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term);
            const matchesCompany =
                selectedCompanyFilter === 'all' || user.company_id === selectedCompanyFilter;
            const matchesRole =
                selectedRoleFilter === 'all' || user.role === selectedRoleFilter;
            const matchesStatus =
                selectedStatusFilter === 'all' ||
                (selectedStatusFilter === 'active' ? user.is_active : !user.is_active);

            return matchesSearch && matchesCompany && matchesRole && matchesStatus;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            if (sortRule.field === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortRule.field === 'email') {
                comparison = a.email.localeCompare(b.email);
            } else if (sortRule.field === 'role') {
                comparison = a.role.localeCompare(b.role);
            } else if (sortRule.field === 'company') {
                const compA = a.company?.name || '';
                const compB = b.company?.name || '';
                comparison = compA.localeCompare(compB);
            } else if (sortRule.field === 'status') {
                comparison = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
            } else if (sortRule.field === 'created_at') {
                comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }

            return sortRule.direction === 'asc' ? comparison : -comparison;
        });
    }, [users, searchTerm, selectedCompanyFilter, selectedRoleFilter, selectedStatusFilter, sortRule]);

    // Pagination calculations
    const totalFiltered = filteredAndSortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(page, totalPages);

    const paginatedUsers = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredAndSortedUsers.slice(start, start + pageSize);
    }, [filteredAndSortedUsers, safePage, pageSize]);

    const hasActiveFilters =
        searchTerm !== '' ||
        selectedCompanyFilter !== 'all' ||
        selectedRoleFilter !== 'all' ||
        selectedStatusFilter !== 'all';

    const handleSort = (field: SortField) => {
        setSortRule(prev => {
            if (prev.field === field) {
                return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { field, direction: field === 'created_at' || field === 'status' ? 'desc' : 'asc' };
        });
    };

    const renderSortIcon = (field: SortField) => {
        if (sortRule.field !== field) {
            return <ArrowUpDown className="h-3 w-3 text-ink-faint opacity-60 group-hover:opacity-100" aria-hidden />;
        }
        return sortRule.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-brand" aria-hidden />
        ) : (
            <ArrowDown className="h-3 w-3 text-brand" aria-hidden />
        );
    };

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.is_active).length;
        const pendingCount = invites.length;
        const distinctCompanies = new Set(users.map(u => u.company_id).filter(Boolean)).size;

        return { total, active, pendingCount, distinctCompanies };
    }, [users, invites]);

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
            {/* Page Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                        <Users className="h-6 w-6" aria-hidden />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Team & Access
                            </h1>
                            <Badge
                                variant="outline"
                                className="text-xs font-semibold px-2.5 py-0.5 border"
                                style={{
                                    color: primaryColor,
                                    borderColor: `${primaryColor}40`,
                                    backgroundColor: `${primaryColor}10`
                                }}
                            >
                                {currentCompanyName}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Manage team members, roles, and invitation clearances across {currentCompanyName}.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => {
                        if (!isAdmin && currentUser?.company_id) {
                            setFormData(prev => ({ ...prev, company_id: currentUser.company_id }));
                        }
                        setIsInviteDialogOpen(true);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all self-start sm:self-auto"
                    style={{ backgroundColor: primaryColor }}
                >
                    <UserPlus className="h-4 w-4 mr-1.5" aria-hidden />
                    Invite Member
                </Button>
            </header>

            {/* KPI Summary Ribbon */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Total Team */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className={tx.muted}>Total Team</span>
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Users className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                            {metrics.total}
                        </p>
                        <p className={cn('mt-0.5 text-[11px] font-medium truncate', tx.muted)}>
                            Registered accounts
                        </p>
                    </div>
                </div>

                {/* 2. Active Members */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className={tx.muted}>Active Accounts</span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                            <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                                {metrics.active}
                            </p>
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 tabular-nums">
                                {metrics.total > 0 ? `${Math.round((metrics.active / metrics.total) * 100)}%` : '0%'}
                            </span>
                        </div>
                        <p className={cn('mt-0.5 text-[11px] font-medium', tx.muted)}>
                            Authorized to sign in
                        </p>
                    </div>
                </div>

                {/* 3. Pending Invites */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className={tx.muted}>Pending Invites</span>
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Mail className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                            <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                                {metrics.pendingCount}
                            </p>
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                {metrics.pendingCount === 0 ? 'Clear' : 'Awaiting signup'}
                            </span>
                        </div>
                        <p className={cn('mt-0.5 text-[11px] font-medium', tx.muted)}>
                            Sent links not yet claimed
                        </p>
                    </div>
                </div>

                {/* 4. Ventures Covered */}
                <div className="rounded-[14px] border border-line bg-surface p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className={tx.muted}>Ventures Represented</span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Building2 className="h-4 w-4" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', tx.ink)}>
                            {metrics.distinctCompanies}
                        </p>
                        <p className={cn('mt-0.5 text-[11px] font-medium', tx.muted)}>
                            Active business units
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter, Search & Sort Toolbar */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search team members by name or email..."
                            aria-label="Search team members"
                            className="h-10 w-full rounded-[10px] border border-line bg-surface pl-9 pr-8 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <div className="relative min-w-[120px]">
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                                aria-label="Filter by status"
                                className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="deactivated">Deactivated</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                        </div>

                        {/* Role Filter */}
                        <div className="relative min-w-[130px]">
                            <select
                                value={selectedRoleFilter}
                                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                                aria-label="Filter by role"
                                className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="lead">Project Lead</option>
                                <option value="employee">Staff</option>
                                <option value="executive">Executive</option>
                                <option value="pa">Executive PA</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                        </div>

                        {/* Company Filter (Admins only) */}
                        {isAdmin && (
                            <div className="relative min-w-[150px]">
                                <select
                                    value={selectedCompanyFilter}
                                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                                    aria-label="Filter by company"
                                    className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    <option value="all">All Companies</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                            </div>
                        )}

                        {/* Sort Selector */}
                        <div className="relative min-w-[145px]">
                            <select
                                value={`${sortRule.field}-${sortRule.direction}`}
                                onChange={(e) => {
                                    const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                                    setSortRule({ field, direction });
                                }}
                                aria-label="Sort members list"
                                className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="name-asc">Name (A → Z)</option>
                                <option value="name-desc">Name (Z → A)</option>
                                <option value="status-desc">Active first</option>
                                <option value="role-asc">Role</option>
                                <option value="company-asc">Company</option>
                                <option value="created_at-desc">Recently Added</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                        </div>

                        {/* Reset Filters CTA */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-xs font-semibold text-ink hover:border-ink/30 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                title="Reset all search and filter conditions"
                            >
                                <RotateCcw className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Directory Table Card */}
            <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <Users className="h-4 w-4 text-slate-500" aria-hidden />
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Team Directory
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {hasActiveFilters && (
                                <span className="text-brand font-semibold">
                                    Filtered: {totalFiltered} of {users.length}
                                </span>
                            )}
                            <span className="tabular-nums">
                                {totalFiltered} {totalFiltered === 1 ? 'member' : 'members'} total
                            </span>
                            {/* Page size select */}
                            <div className="flex items-center gap-1.5 pl-2 border-l border-line dark:border-slate-800">
                                <span className="text-[11px] text-slate-400">Show</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    aria-label="Rows per page"
                                    className="cursor-pointer bg-transparent font-semibold text-ink dark:text-slate-100 text-xs outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-line dark:border-slate-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <Skeleton variant="circle" width={40} height={40} />
                                        <div className="space-y-1.5">
                                            <Skeleton variant="text" width={160} />
                                            <Skeleton variant="text" width={220} />
                                        </div>
                                    </div>
                                    <Skeleton variant="text" width={100} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] text-left text-sm" role="table">
                                <thead>
                                    <tr className={cn('border-b border-line text-[12px] font-medium dark:border-slate-800', tx.muted)}>
                                        <th scope="col" className="px-6 py-3.5 font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('name')}
                                                className="group inline-flex items-center gap-1.5 font-semibold hover:text-ink focus-visible:outline-none"
                                            >
                                                <span>Member</span>
                                                {renderSortIcon('name')}
                                            </button>
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('role')}
                                                className="group inline-flex items-center gap-1.5 font-semibold hover:text-ink focus-visible:outline-none"
                                            >
                                                <span>Role</span>
                                                {renderSortIcon('role')}
                                            </button>
                                        </th>
                                        {isAdmin && (
                                            <th scope="col" className="px-4 py-3.5 font-semibold">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('company')}
                                                    className="group inline-flex items-center gap-1.5 font-semibold hover:text-ink focus-visible:outline-none"
                                                >
                                                    <span>Company</span>
                                                    {renderSortIcon('company')}
                                                </button>
                                            </th>
                                        )}
                                        <th scope="col" className="px-4 py-3.5 font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('status')}
                                                className="group inline-flex items-center gap-1.5 font-semibold hover:text-ink focus-visible:outline-none"
                                            >
                                                <span>Status</span>
                                                {renderSortIcon('status')}
                                            </button>
                                        </th>
                                        <th scope="col" className="px-6 py-3.5 text-right font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line dark:divide-slate-800">
                                    {paginatedUsers.map(userItem => {
                                        const roleConfig = ROLE_LABELS[userItem.role] || ROLE_LABELS.employee;
                                        const companyTheme = userItem.company?.name ? getCompanyTheme(userItem.company.name) : null;
                                        const isSelf = userItem.id === currentUser?.id;

                                        return (
                                            <tr key={userItem.id} className="hover:bg-paper/70 dark:hover:bg-slate-800/40 transition-colors">
                                                {/* Member Details */}
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                                                            style={{
                                                                backgroundColor: userItem.is_active ? primaryColor : '#94a3b8'
                                                            }}
                                                            aria-hidden
                                                        >
                                                            {getInitials(userItem.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                                <span className="truncate">{userItem.name}</span>
                                                                {isSelf && (
                                                                    <span className="rounded px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                                                <Mail className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{userItem.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="px-4 py-3.5">
                                                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', roleConfig.badgeClass)}>
                                                        {roleConfig.label}
                                                    </span>
                                                </td>

                                                {/* Company */}
                                                {isAdmin && (
                                                    <td className="px-4 py-3.5">
                                                        {userItem.company?.name ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                <span
                                                                    className="h-2 w-2 rounded-full shrink-0"
                                                                    style={{ backgroundColor: companyTheme?.primary }}
                                                                    aria-hidden
                                                                />
                                                                <span className="truncate max-w-[160px]">{userItem.company.name}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Unassigned</span>
                                                        )}
                                                    </td>
                                                )}

                                                {/* Status */}
                                                <td className="px-4 py-3.5">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
                                                        userItem.is_active
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                    )}>
                                                        <span
                                                            className={cn('h-1.5 w-1.5 rounded-full', userItem.is_active ? 'bg-emerald-500' : 'bg-slate-400')}
                                                            aria-hidden
                                                        />
                                                        {userItem.is_active ? 'Active' : 'Deactivated'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-3.5 text-right">
                                                    {isAdmin && !isSelf ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn(
                                                                'h-8 text-xs font-semibold rounded-[6px] border transition-colors',
                                                                userItem.is_active
                                                                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-950/40 dark:text-rose-400'
                                                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40 dark:text-emerald-400'
                                                            )}
                                                            onClick={() => setConfirmActionUser(userItem)}
                                                        >
                                                            {userItem.is_active ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredAndSortedUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={isAdmin ? 5 : 4} className="py-16 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                                                        <Users className="h-6 w-6" />
                                                    </div>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                                                        No members found
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                                        {searchTerm
                                                            ? `No results matching "${searchTerm}". Try refining your query.`
                                                            : 'No members match the current filter selection.'}
                                                    </p>
                                                    {hasActiveFilters && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleResetFilters}
                                                            className="mt-4 h-8 text-xs font-semibold gap-1.5"
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                            <span>Clear all filters</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && !loading && (
                        <nav
                            aria-label="Team directory pagination"
                            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-line dark:border-slate-800 px-6 py-4"
                        >
                            <p className={cn('text-xs tabular-nums', tx.muted)}>
                                Showing <span className={cn('font-semibold', tx.ink)}>{(safePage - 1) * pageSize + 1}</span> to{' '}
                                <span className={cn('font-semibold', tx.ink)}>{Math.min(safePage * pageSize, totalFiltered)}</span> of{' '}
                                <span className={cn('font-semibold', tx.ink)}>{totalFiltered}</span> members
                            </p>

                            <div className="flex items-center gap-1.5 self-center sm:self-auto">
                                <button
                                    type="button"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:border-ink/30 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    aria-label="Go to previous page"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                                    <span>Previous</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => {
                                        if (totalPages > 7) {
                                            if (pNum !== 1 && pNum !== totalPages && Math.abs(pNum - safePage) > 1) {
                                                if (pNum === 2 || pNum === totalPages - 1) {
                                                    return <span key={pNum} className="px-1 text-slate-400">…</span>;
                                                }
                                                return null;
                                            }
                                        }

                                        return (
                                            <button
                                                key={pNum}
                                                type="button"
                                                aria-current={safePage === pNum ? 'page' : undefined}
                                                onClick={() => setPage(pNum)}
                                                className={cn(
                                                    'h-8 w-8 rounded-[6px] text-xs font-semibold tabular-nums transition-colors',
                                                    safePage === pNum
                                                        ? 'bg-ink text-white dark:bg-white dark:text-ink'
                                                        : 'border border-line bg-surface text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                                )}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:border-ink/30 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    aria-label="Go to next page"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                                </button>
                            </div>
                        </nav>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invites Section */}
            {invites.length > 0 && (
                <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Mail className="h-4 w-4 text-amber-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Pending Invitations
                                </CardTitle>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                {invites.length} awaiting
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm" role="table">
                                <thead>
                                    <tr className={cn('border-b border-line text-[12px] font-medium dark:border-slate-800', tx.muted)}>
                                        <th scope="col" className="px-6 py-3 font-semibold">Invited Email</th>
                                        <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                                        {isAdmin && <th scope="col" className="px-4 py-3 font-semibold">Company</th>}
                                        <th scope="col" className="px-4 py-3 font-semibold">Sent Date</th>
                                        <th scope="col" className="px-6 py-3 text-right font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line dark:divide-slate-800">
                                    {invites.map(invite => {
                                        const roleConfig = ROLE_LABELS[invite.role] || ROLE_LABELS.employee;
                                        const isCopied = copiedTokenId === invite.id;

                                        return (
                                            <tr key={invite.id} className="hover:bg-paper/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                                    {invite.email}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', roleConfig.badgeClass)}>
                                                        {roleConfig.label}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs">
                                                        {invite.company?.name || 'Unassigned'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3.5 text-xs text-slate-400 tabular-nums">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(invite.created_at)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs font-semibold rounded-[6px] gap-1.5"
                                                        onClick={() => copyInviteLink(invite.token, invite.id)}
                                                    >
                                                        {isCopied ? (
                                                            <>
                                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                                <span className="text-emerald-600">Copied</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-3.5 w-3.5 text-slate-400" />
                                                                <span>Copy Link</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invite Member Modal Dialog */}
            {isInviteDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="invite-dialog-title"
                >
                    <div className="bg-surface dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-line dark:border-slate-800">
                            <div>
                                <h2 id="invite-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                    Invite Team Member
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    They will receive an invitation link to set up their credentials.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsInviteDialogOpen(false);
                                    setInviteLink(null);
                                }}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Close dialog"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {!inviteLink ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleInvite();
                                }}
                                className="space-y-4 pt-4"
                            >
                                <div>
                                    <label htmlFor={inviteNameId} className="block text-xs font-semibold text-ink dark:text-slate-200 mb-1">
                                        Full Name
                                    </label>
                                    <Input
                                        id={inviteNameId}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Kwame Mensah"
                                        required
                                        className="h-10 rounded-lg text-sm bg-surface dark:bg-slate-950"
                                    />
                                </div>

                                <div>
                                    <label htmlFor={inviteEmailId} className="block text-xs font-semibold text-ink dark:text-slate-200 mb-1">
                                        Work Email
                                    </label>
                                    <Input
                                        id={inviteEmailId}
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="name@company.com"
                                        required
                                        className="h-10 rounded-lg text-sm bg-surface dark:bg-slate-950"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor={inviteRoleId} className="block text-xs font-semibold text-ink dark:text-slate-200 mb-1">
                                            Role
                                        </label>
                                        <div className="relative">
                                            <select
                                                id={inviteRoleId}
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="h-10 w-full appearance-none rounded-lg border border-line bg-surface dark:bg-slate-950 px-3 pr-8 text-xs font-semibold text-ink dark:text-slate-100 outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                                            >
                                                <option value="employee">Staff Member</option>
                                                <option value="lead">Project Lead</option>
                                                {isAdmin && <option value="admin">Admin</option>}
                                                {isAdmin && <option value="executive">Executive</option>}
                                                {isAdmin && <option value="pa">Executive PA</option>}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor={inviteCompanyId} className="block text-xs font-semibold text-ink dark:text-slate-200 mb-1">
                                            Company
                                        </label>
                                        <div className="relative">
                                            <select
                                                id={inviteCompanyId}
                                                value={formData.company_id}
                                                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                                required
                                                className="h-10 w-full appearance-none rounded-lg border border-line bg-surface dark:bg-slate-950 px-3 pr-8 text-xs font-semibold text-ink dark:text-slate-100 outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                                            >
                                                <option value="">Select company</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 rounded-lg text-xs font-semibold"
                                        onClick={() => setIsInviteDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-9 rounded-lg text-xs font-semibold text-white"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Create Invite Link
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4 pt-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center">
                                    <div className="mx-auto w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-2">
                                        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Invitation Ready
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Share this personalized signup link with {formData.name || 'the user'}.
                                    </p>

                                    <div className="mt-3 flex items-center gap-1.5 bg-surface dark:bg-slate-900 p-1.5 rounded-lg border border-line dark:border-slate-800">
                                        <Input
                                            value={inviteLink}
                                            readOnly
                                            className="h-8 text-xs font-mono border-0 shadow-none focus-visible:ring-0 bg-transparent text-slate-600 dark:text-slate-300"
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2.5 text-xs font-semibold shrink-0 gap-1"
                                            onClick={() => copyInviteLink(inviteLink.split('token=')[1])}
                                        >
                                            {copiedModalLink ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-emerald-600">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-9 rounded-lg text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900"
                                    onClick={() => {
                                        setIsInviteDialogOpen(false);
                                        setInviteLink(null);
                                        setFormData({ email: '', name: '', role: 'employee', company_id: '' });
                                    }}
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Activation / Deactivation */}
            {confirmActionUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                >
                    <div className="bg-surface dark:bg-slate-900 border border-line dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                                confirmActionUser.is_active
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            )}>
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {confirmActionUser.is_active ? 'Deactivate user?' : 'Restore user access?'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {confirmActionUser.name} ({confirmActionUser.email})
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {confirmActionUser.is_active
                                ? 'This will suspend the user from logging in to Pulse360 until an administrator reactivates their account.'
                                : 'This will reactivate access for this member, allowing them to sign in to Pulse360 immediately.'}
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs font-semibold"
                                onClick={() => setConfirmActionUser(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className={cn(
                                    'h-8 rounded-lg text-xs font-semibold text-white',
                                    confirmActionUser.is_active
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                )}
                                onClick={() => toggleUserStatus(confirmActionUser)}
                            >
                                {confirmActionUser.is_active ? 'Deactivate Account' : 'Restore Access'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
