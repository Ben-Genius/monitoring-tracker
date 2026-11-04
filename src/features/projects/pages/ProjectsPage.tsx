import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, FolderSearch, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects, useCompanies, type Project } from '@/features/projects/hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { canAdminister, canViewAllCompanies } from '@/lib/permissions';
import CreateProjectModal from '@/features/projects/components/CreateProjectModal';
import ProjectCard from '@/features/projects/components/ProjectCard';
import { toProjectRow } from '@/features/projects/utils/projectRow';
import { useFilters, FilterBar } from '@/features/filters/components';
import { ImportModal } from '@/features/import/components';
import { tx } from '@/features/dashboard/components/tokens';

type Lifecycle = 'all' | 'upcoming' | 'active' | 'on_hold' | 'completed';

// Every status belongs to exactly one tab, so the tab counts always add up to All.
const LIFECYCLE: Record<Exclude<Lifecycle, 'all'>, Project['status'][]> = {
    upcoming: ['bidding', 'scheduled'],
    active: ['active'],
    on_hold: ['on_hold'],
    completed: ['completed'],
};

const TABS: { id: Lifecycle; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'active', label: 'Active' },
    { id: 'on_hold', label: 'On hold' },
    { id: 'completed', label: 'Completed' },
];

const FILTER_DEFS = [
    {
        field: 'status', label: 'Status', type: 'select' as const, options: [
            { label: 'Bidding', value: 'bidding' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Active', value: 'active' },
            { label: 'On hold', value: 'on_hold' },
            { label: 'Completed', value: 'completed' },
        ],
    },
    {
        field: 'service_type', label: 'Service', type: 'select' as const, options: [
            { label: 'Construction', value: 'construction' },
            { label: 'Logistics', value: 'logistics' },
            { label: 'Technical', value: 'technical' },
            { label: 'Manpower', value: 'manpower' },
            { label: 'Energy', value: 'energy' },
            { label: 'Mining', value: 'mining' },
        ],
    },
    { field: 'contract_value', label: 'Contract value', type: 'number' as const },
];

const SORT_OPTIONS = [
    { label: 'Needs attention', field: 'attention' },
    { label: 'Progress', field: 'progress' },
    { label: 'Contract value', field: 'contract_value' },
    { label: 'Handover date', field: 'expected_handover' },
    { label: 'Name', field: 'name' },
    { label: 'Created', field: 'created_at' },
];

const EMPTY_COPY: Record<Lifecycle, string> = {
    all: 'No projects yet.',
    upcoming: 'No projects are bidding or scheduled.',
    active: 'No projects are active.',
    on_hold: 'No projects are on hold.',
    completed: 'No projects are completed yet.',
};

const secondaryBtn = 'inline-flex h-10 items-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-ink/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const primaryBtn = 'inline-flex h-10 items-center gap-2 rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progress dark:bg-white dark:text-ink dark:hover:bg-white/90';

export default function ProjectsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { selectedCompanyId } = useCompanyStore();
    const [showArchived, setShowArchived] = useState(false);
    const [tab, setTab] = useState<Lifecycle>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const scopeId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    const { data: projects, isLoading } = useProjects(scopeId, showArchived);
    const { data: companies = [] } = useCompanies();

    const canSeeAll = canViewAllCompanies(user);
    const canCreate = canAdminister(user) || user?.role === 'lead';
    const scopeName = scopeId ? companies.find(c => c.id === scopeId)?.name ?? 'your company' : 'all companies';

    // Counts come from the same scoped set the cards are drawn from.
    const rows = useMemo(
        () => (projects ?? []).filter(p => canSeeAll || p.company_id === user?.company_id).map(toProjectRow),
        [projects, canSeeAll, user?.company_id]
    );
    const counts = useMemo(() => {
        const c: Record<Lifecycle, number> = { all: rows.length, upcoming: 0, active: 0, on_hold: 0, completed: 0 };
        for (const r of rows) {
            const key = (Object.keys(LIFECYCLE) as Exclude<Lifecycle, 'all'>[]).find(k => LIFECYCLE[k].includes(r.status));
            if (key) c[key]++;
        }
        return c;
    }, [rows]);
    const inTab = useMemo(
        () => (tab === 'all' ? rows : rows.filter(r => LIFECYCLE[tab].includes(r.status))),
        [rows, tab]
    );

    const filters = useFilters(inTab, FILTER_DEFS, { field: 'attention', direction: 'desc' });
    const searching = filters.activeCount > 0;

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={cn('text-[26px] font-bold tracking-tight', tx.ink)}>Projects</h1>
                    <p className={cn('mt-0.5 text-sm', tx.muted)}>
                        {isLoading ? 'Loading projects…' : `${rows.length} ${showArchived ? 'live and archived ' : ''}projects across ${scopeName}. Projects with blocked or open work come first.`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Projects whose Baserow row was deleted are archived, not removed. This keeps them reviewable. */}
                    <button
                        type="button"
                        aria-pressed={showArchived}
                        onClick={() => setShowArchived(v => !v)}
                        className={cn(secondaryBtn, showArchived && 'border-ink bg-paper dark:border-slate-300 dark:bg-slate-800')}
                    >
                        <Archive className="h-4 w-4" aria-hidden /> {showArchived ? 'Hide archived' : 'Show archived'}
                    </button>
                    <button type="button" onClick={() => setIsImportOpen(true)} className={secondaryBtn}>
                        <Upload className="h-4 w-4" aria-hidden /> Import
                    </button>
                    {canCreate && (
                        <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryBtn}>
                            <Plus className="h-4 w-4" aria-hidden /> New project
                        </button>
                    )}
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={v => setTab(v as Lifecycle)}>
                {/* Scrolls sideways on phones rather than clipping the later tabs. */}
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <TabsList label="Project lifecycle" className="rounded-[10px] border border-line bg-surface p-1 dark:border-slate-800 dark:bg-slate-900">
                        {TABS.map(t => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className={cn(
                                    'gap-1.5 rounded-[7px] px-3 py-1.5 text-sm font-semibold',
                                    tab === t.id ? 'bg-ink text-white shadow-none dark:bg-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-100'
                                )}
                            >
                                {t.label}
                                <span className={cn('tabular-nums', tab === t.id ? 'text-white/75 dark:text-ink/70' : 'text-ink-muted dark:text-slate-400')}>{counts[t.id]}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <FilterBar filters={filters} sortOptions={SORT_OPTIONS} searchPlaceholder="Search projects or companies" className="mt-4" />

                <div className="mt-5">
                    {isLoading ? (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[232px] rounded-[14px]" />)}
                        </div>
                    ) : filters.filtered.length > 0 ? (
                        <>
                            {searching && (
                                <p className={cn('mb-3 text-[13px]', tx.muted)}>
                                    {filters.filtered.length} of {inTab.length} projects match
                                </p>
                            )}
                            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {filters.filtered.map(p => (
                                    <li key={p.id} className="min-w-0">
                                        <ProjectCard project={p} showCompany={!scopeId} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <div className="flex flex-col items-center rounded-[14px] border border-dashed border-line-strong px-6 py-16 text-center dark:border-slate-700">
                            <FolderSearch className={cn('h-8 w-8', tx.faint)} aria-hidden />
                            <p className={cn('mt-3 text-[15px] font-semibold', tx.ink)}>
                                {searching ? 'No projects match your search or filters.' : EMPTY_COPY[tab]}
                            </p>
                            <div className="mt-4 flex gap-2">
                                {searching && (
                                    <button type="button" onClick={filters.clearFilters} className={secondaryBtn}>Clear search and filters</button>
                                )}
                                {!searching && canCreate && (
                                    <button type="button" onClick={() => setIsCreateOpen(true)} className={secondaryBtn}>
                                        <Plus className="h-4 w-4" aria-hidden /> New project
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Tabs>

            <ImportModal
                open={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onComplete={r => {
                    // Refetch in place so the current tab, search and filters survive the import.
                    if (r.success > 0) void queryClient.invalidateQueries({ queryKey: ['projects'] });
                }}
            />
            <CreateProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </div>
    );
}
