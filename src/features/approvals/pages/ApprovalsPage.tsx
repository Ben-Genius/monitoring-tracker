import { useState, useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    User,
    Building2,
    Search,
    ShieldCheck,
    History,
    AlertCircle,
    Loader2,
    Check,
    MessageSquare,
    ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useApprovals, useProcessApproval, type Approval } from '../hooks/useApprovals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tx } from '@/features/dashboard/components/tokens';
import {
    formatDate,
    formatRelativeTime,
    cn,
    getCompanyTheme,
    getCompanyColor,
    DEFAULT_BRAND_COLOR
} from '@/lib/utils';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { canAdminister } from '@/lib/permissions';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: approvals = [], isLoading } = useApprovals(selectedCompanyId);
    const processApproval = useProcessApproval();

    const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const canDecide = canAdminister(user);

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || 'Company View';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    // Calculated metrics
    const metrics = useMemo(() => {
        const pending = approvals.filter(a => a.status === 'pending');
        const approved = approvals.filter(a => a.status === 'approved');
        const rejected = approvals.filter(a => a.status === 'rejected');
        return {
            total: approvals.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length
        };
    }, [approvals]);

    // Filtered list
    const filteredApprovals = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return approvals.filter(approval => {
            const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
            if (!matchesStatus) return false;

            if (!query) return true;
            const projectName = approval.project?.name?.toLowerCase() || '';
            const requesterName = approval.requester?.name?.toLowerCase() || '';
            const requesterEmail = approval.requester?.email?.toLowerCase() || '';
            const type = approval.type?.toLowerCase().replace('_', ' ') || '';
            const content = (approval.content || approval.comments || '').toLowerCase();

            return (
                projectName.includes(query) ||
                requesterName.includes(query) ||
                requesterEmail.includes(query) ||
                type.includes(query) ||
                content.includes(query)
            );
        });
    }, [approvals, statusFilter, searchQuery]);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        if (!user || !canDecide) return;
        try {
            const defaultNote = status === 'approved'
                ? 'Request verified and approved.'
                : 'Request declined after governance review.';
            const notes = adminNotes.trim() || defaultNote;

            await processApproval.mutateAsync({
                id,
                status,
                comments: notes
            });
            toast.success(status === 'approved' ? 'Request approved successfully!' : 'Request declined.');
            setSelectedApproval(null);
            setAdminNotes('');
        } catch (error) {
            console.error('Failed to process approval:', error);
            toast.error('Failed to process request. Please try again.');
        }
    };

    // Loading Skeletons
    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
                {/* Header Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64 rounded-lg" />
                    <Skeleton className="h-4 w-96 rounded-md" />
                </div>

                {/* 4 KPI Skeletons */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-24 rounded" />
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                </div>
                                <Skeleton className="h-8 w-16 rounded-lg" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter skeleton */}
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-72 rounded-lg" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* Cards skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-5 w-40 rounded" />
                                            <Skeleton className="h-3 w-28 rounded" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const pendingList = filteredApprovals.filter(a => a.status === 'pending');
    const processedList = filteredApprovals.filter(a => a.status !== 'pending');

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16 animate-fade-in">
            {/* Page Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220]/10 text-[#F58220] border border-[#F58220]/20">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className={cn('text-2xl font-bold tracking-tight', tx.ink)}>
                                    Approvals & Governance
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="border-line bg-paper text-xs font-semibold dark:border-slate-800 dark:bg-slate-800/80"
                                >
                                    <span
                                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: theme.primary || DEFAULT_BRAND_COLOR }}
                                    />
                                    {currentCompanyName}
                                </Badge>
                            </div>
                            <p className={cn('text-sm mt-0.5', tx.muted)}>
                                Review and authorize project stage transitions, completions, and governance requests.
                            </p>
                        </div>
                    </div>
                </div>

                {!canDecide && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Viewing mode. Only administrators can approve or decline requests.</span>
                    </div>
                )}
            </header>

            {/* KPI Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tile 1: Pending */}
                <Card className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className={cn('text-xs font-semibold uppercase tracking-wider', tx.muted)}>
                                Pending Review
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className={cn('text-3xl font-extrabold tracking-tight', tx.ink)}>
                                {metrics.pending}
                            </span>
                            {metrics.pending > 0 && (
                                <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                                    Action Required
                                </Badge>
                            )}
                        </div>
                        <p className={cn('mt-1 text-xs', tx.faint)}>Awaiting administrative sign-off</p>
                    </CardContent>
                </Card>

                {/* Tile 2: Approved */}
                <Card className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className={cn('text-xs font-semibold uppercase tracking-wider', tx.muted)}>
                                Approved
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className={cn('text-3xl font-extrabold tracking-tight', tx.ink)}>
                                {metrics.approved}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Completed</span>
                        </div>
                        <p className={cn('mt-1 text-xs', tx.faint)}>Successfully promoted to next stage</p>
                    </CardContent>
                </Card>

                {/* Tile 3: Declined */}
                <Card className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className={cn('text-xs font-semibold uppercase tracking-wider', tx.muted)}>
                                Declined
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <XCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className={cn('text-3xl font-extrabold tracking-tight', tx.ink)}>
                                {metrics.rejected}
                            </span>
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Rejected</span>
                        </div>
                        <p className={cn('mt-1 text-xs', tx.faint)}>Requires revision by team lead</p>
                    </CardContent>
                </Card>

                {/* Tile 4: Total Requests */}
                <Card className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className={cn('text-xs font-semibold uppercase tracking-wider', tx.muted)}>
                                Total Requests
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <History className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className={cn('text-3xl font-extrabold tracking-tight', tx.ink)}>
                                {metrics.total}
                            </span>
                            <span className={cn('text-xs font-medium', tx.faint)}>Overall volume</span>
                        </div>
                        <p className={cn('mt-1 text-xs', tx.faint)}>All recorded governance actions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Status Segmented Tabs */}
                <div
                    role="tablist"
                    aria-label="Filter approvals by status"
                    className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-paper p-1 dark:border-slate-800 dark:bg-slate-800/80"
                >
                    {[
                        { id: 'all', label: 'All Requests', count: metrics.total },
                        { id: 'pending', label: 'Pending', count: metrics.pending },
                        { id: 'approved', label: 'Approved', count: metrics.approved },
                        { id: 'rejected', label: 'Declined', count: metrics.rejected }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === tab.id}
                            onClick={() => setStatusFilter(tab.id as StatusFilter)}
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                statusFilter === tab.id
                                    ? 'bg-surface text-ink shadow-sm dark:bg-slate-900 dark:text-slate-100'
                                    : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
                            )}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums',
                                    statusFilter === tab.id
                                        ? 'bg-[#F58220]/15 text-[#F58220]'
                                        : 'bg-muted text-ink-faint dark:bg-slate-700/60'
                                )}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by project or requester..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-8 text-xs text-ink outline-none transition-colors focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            aria-label="Clear search query"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-xs dark:text-slate-400"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State when no filtered results */}
            {filteredApprovals.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-paper/50 py-20 text-center dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/10 text-[#F58220]">
                        <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h3 className={cn('mt-4 text-lg font-bold tracking-tight', tx.ink)}>
                        {searchQuery ? 'No matching requests found' : 'All Clear — No Approvals'}
                    </h3>
                    <p className={cn('mt-1 max-w-sm text-xs', tx.muted)}>
                        {searchQuery
                            ? `No approval records matched "${searchQuery}". Try adjusting your keywords or clearing filters.`
                            : statusFilter !== 'all'
                                ? `There are currently no requests matching the "${statusFilter}" status filter.`
                                : 'All project transitions and governance checkpoints are currently up to date.'}
                    </p>
                    {(searchQuery || statusFilter !== 'all') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                            }}
                            className="mt-4 text-xs font-semibold"
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            )}

            {/* Pending Approvals Section */}
            {pendingList.length > 0 && (
                <section className="space-y-4" aria-labelledby="pending-requests-heading">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <h2 id="pending-requests-heading" className={cn('text-lg font-bold tracking-tight', tx.ink)}>
                                Pending Requests Awaiting Action
                            </h2>
                            <Badge variant="warning" className="text-xs px-2 py-0.5 font-bold">
                                {pendingList.length}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {pendingList.map(approval => {
                            const isSelected = selectedApproval === approval.id;
                            const companyColor = getCompanyColor(approval.project?.name || '');

                            return (
                                <Card
                                    key={approval.id}
                                    className="border-line bg-surface dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md"
                                >
                                    <CardContent className="p-6 space-y-5">
                                        {/* Card Header */}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex items-start gap-3.5">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={cn('text-base font-bold capitalize', tx.ink)}>
                                                            {approval.type.replace(/_/g, ' ')}
                                                        </h3>
                                                        <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                    <p className={cn('text-xs mt-1', tx.faint)}>
                                                        Submitted {formatRelativeTime(approval.created_at)} • {formatDate(approval.created_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                <Badge
                                                    variant="outline"
                                                    className="border-line bg-paper dark:border-slate-800 dark:bg-slate-800 text-xs font-semibold"
                                                >
                                                    <span
                                                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: companyColor }}
                                                    />
                                                    {approval.project?.name || 'Venture Project'}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Project & Requester Metadata Strip */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-line bg-paper/60 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-line dark:border-slate-700 dark:bg-slate-800">
                                                    <Building2 className="h-4 w-4 text-ink-muted dark:text-slate-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={cn('text-[11px] font-semibold uppercase tracking-wider', tx.faint)}>
                                                        Associated Project
                                                    </p>
                                                    <p className={cn('text-sm font-bold truncate', tx.ink)}>
                                                        {approval.project?.name || 'General Project'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-line dark:border-slate-700 dark:bg-slate-800">
                                                    <User className="h-4 w-4 text-ink-muted dark:text-slate-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={cn('text-[11px] font-semibold uppercase tracking-wider', tx.faint)}>
                                                        Requested By
                                                    </p>
                                                    <p className={cn('text-sm font-bold truncate', tx.ink)}>
                                                        {approval.requester?.name || 'Project Team Lead'}
                                                        {approval.requester?.email && (
                                                            <span className={cn('ml-1.5 text-xs font-normal', tx.faint)}>
                                                                ({approval.requester.email})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Request Details Content */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare className="h-3.5 w-3.5 text-ink-muted dark:text-slate-400" />
                                                <span className={cn('text-[11px] font-bold uppercase tracking-wider', tx.faint)}>
                                                    Submission Details & Justification
                                                </span>
                                            </div>
                                            <div className="rounded-xl border border-line bg-paper/40 p-4 text-sm leading-relaxed text-ink dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-200">
                                                {approval.content || approval.comments || 'No extra notes provided by requester.'}
                                            </div>
                                        </div>

                                        {/* Admin Decision Form / Button Bar */}
                                        {canDecide && (
                                            <div className="pt-2 border-t border-line dark:border-slate-800">
                                                {isSelected ? (
                                                    <div className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50/40 p-4 dark:border-amber-800/50 dark:bg-amber-950/20 animate-fade-in">
                                                        <div>
                                                            <label
                                                                htmlFor={`admin-notes-${approval.id}`}
                                                                className={cn('block text-xs font-bold uppercase tracking-wider mb-1.5', tx.ink)}
                                                            >
                                                                Decision Comments & Governance Notes
                                                            </label>
                                                            <textarea
                                                                id={`admin-notes-${approval.id}`}
                                                                rows={3}
                                                                placeholder="Add audit justification, context or conditions for this decision..."
                                                                value={adminNotes}
                                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                                className="w-full rounded-lg border border-line bg-surface p-3 text-xs text-ink outline-none transition-all placeholder:text-ink-faint focus:border-[#F58220] focus:ring-2 focus:ring-[#F58220]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                            />
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-end gap-2.5">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={processApproval.isPending}
                                                                onClick={() => {
                                                                    setSelectedApproval(null);
                                                                    setAdminNotes('');
                                                                }}
                                                                className="text-xs font-semibold"
                                                            >
                                                                Cancel
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                disabled={processApproval.isPending}
                                                                onClick={() => handleAction(approval.id, 'rejected')}
                                                                className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                                                            >
                                                                {processApproval.isPending ? (
                                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                                                )}
                                                                Decline Request
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={processApproval.isPending}
                                                                onClick={() => handleAction(approval.id, 'approved')}
                                                                className="text-xs font-semibold text-white shadow-sm"
                                                                style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
                                                            >
                                                                {processApproval.isPending ? (
                                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                                                )}
                                                                Authorize & Approve
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn('text-xs', tx.faint)}>
                                                            Review details and register decision into audit history
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedApproval(approval.id);
                                                                setAdminNotes('');
                                                            }}
                                                            className="text-xs font-semibold gap-1.5 text-white"
                                                            style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
                                                        >
                                                            Review Request
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Processed Approvals / History Section */}
            {processedList.length > 0 && (
                <section className="space-y-4" aria-labelledby="history-heading">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 id="history-heading" className={cn('text-lg font-bold tracking-tight', tx.ink)}>
                                Governance Decision History
                            </h2>
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-line font-bold">
                                {processedList.length}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {processedList.map((approval: Approval) => {
                            const isApproved = approval.status === 'approved';
                            const companyColor = getCompanyColor(approval.project?.name || '');

                            return (
                                <Card
                                    key={approval.id}
                                    className={cn(
                                        'border-line bg-surface dark:border-slate-800 dark:bg-slate-900 border-l-4 shadow-sm transition-all hover:shadow-md',
                                        isApproved ? 'border-l-emerald-500' : 'border-l-rose-500'
                                    )}
                                >
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3.5">
                                                <div
                                                    className={cn(
                                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                                        isApproved
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                    )}
                                                >
                                                    {isApproved ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={cn('text-sm font-bold', tx.ink)}>
                                                            {approval.project?.name || 'Project Transition'}
                                                        </h4>
                                                        <span
                                                            className="inline-block h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: companyColor }}
                                                            title={approval.project?.name}
                                                        />
                                                    </div>
                                                    <p className={cn('text-xs mt-0.5', tx.muted)}>
                                                        <span className="capitalize">{approval.type.replace(/_/g, ' ')}</span>
                                                        {' • '}
                                                        <span>{formatDate(approval.created_at)}</span>
                                                        {approval.requester?.name && (
                                                            <>
                                                                {' • Requested by '}
                                                                <span className="font-medium text-ink dark:text-slate-200">
                                                                    {approval.requester.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 self-start sm:self-auto">
                                                <Badge
                                                    variant={isApproved ? 'success' : 'destructive'}
                                                    className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                                                >
                                                    {approval.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Reviewer Note if available */}
                                        {approval.comments && (
                                            <div className="mt-3.5 rounded-lg border border-line bg-paper/50 px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                                                <span className="font-semibold text-ink dark:text-slate-100">Review Note: </span>
                                                {approval.comments}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}