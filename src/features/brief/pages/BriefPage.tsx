import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, ListChecks, RefreshCw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canReadBrief } from '@/lib/permissions';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import TaskDetailModal from '@/features/tasks/components/TaskDetailModal';
import { Card } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrief } from '../hooks/useBrief';
import { addressAs, greeting } from '../utils/briefMeta';
import AttentionSummary from '../components/AttentionSummary';
import FullView from '../components/FullView';
import CuratedView from '../components/CuratedView';

type View = 'curated' | 'full';

export default function BriefPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: brief, isLoading, isFetching, refetch, error } = useBrief(selectedCompanyId);
    const [openTaskId, setOpenTaskId] = useState<string | null>(null);

    const isExecutive = user?.role === 'executive';
    // The executive reads the PA's selection; the PA prepares it from everything.
    const [view, setView] = useState<View>(isExecutive ? 'curated' : 'full');
    useEffect(() => { setView(isExecutive ? 'curated' : 'full'); }, [isExecutive]);

    const companyName = useMemo(() => {
        const map: Record<string, string> = {};
        companies.forEach((c: { id: string; name: string }) => { map[c.id] = c.name; });
        return map;
    }, [companies]);

    if (!canReadBrief(user)) return <Navigate to="/dashboard" replace />;

    const now = brief?.generatedAt ?? new Date();
    const scope = selectedCompanyId === 'all' ? 'All three companies' : companyName[selectedCompanyId] ?? '';
    const fullLabel = isExecutive ? 'Full picture' : 'Prepare today’s brief';

    const tabs = (isExecutive
        ? [['curated', 'My brief', Send], ['full', 'Full picture', ListChecks]]
        : [['full', 'Prepare today’s brief', ListChecks], ['curated', 'Preview Mr Blay’s view', Eye]]
    ) as [View, string, typeof Send][];

    // The summary card carries the figures, so the subtitle says only the scope and the job.
    const subtitle = !brief || view === 'curated'
        ? 'What needs a decision, a nudge or a thank-you today.'
        : isExecutive
            ? `${scope}: everything that needs attention.`
            : `${scope}. Pick what Mr Blay should see and add a line for each.`;

    const handleTabKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const nextView: View = view === 'curated' ? 'full' : 'curated';
            setView(nextView);
            const nextButton = document.getElementById(`brief-tab-${nextView}`);
            nextButton?.focus();
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-16">
            {/* Side by side only from xl: below that the sidebar leaves too little room and the tabs crowd the subtitle. */}
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    {/* Refresh sits with the time it changes; the brief also refreshes itself every 5 minutes. */}
                    <p className={cn('flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium', tx.faint)}>
                        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {brief && <span>· Updated {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="-my-1 inline-flex h-7 items-center gap-1 rounded-[6px] px-1.5 font-semibold text-ink hover:bg-paper disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
                            {isFetching ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </p>
                    <h1 className={cn('mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]', tx.ink)}>
                        {greeting(now)}{user?.name ? `, ${addressAs(user.name)}` : ''}
                    </h1>
                    <p className={cn('mt-1 text-[15px]', tx.muted)}>{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div
                        className="inline-grid w-full grid-cols-2 gap-1 rounded-[10px] border border-line bg-surface p-1 text-[13px] font-semibold sm:w-auto sm:text-sm dark:border-slate-700 dark:bg-slate-900"
                        role="tablist"
                        aria-label="Brief view"
                        onKeyDown={handleTabKeyDown}
                    >
                        {tabs.map(([key, label, Icon]) => (
                            <button
                                key={key}
                                id={`brief-tab-${key}`}
                                role="tab"
                                aria-selected={view === key}
                                aria-controls="brief-tabpanel"
                                tabIndex={view === key ? 0 : -1}
                                onClick={() => setView(key)}
                                className={cn(
                                    'flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-2 text-center leading-tight transition-colors sm:whitespace-nowrap sm:px-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                                    view === key ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-100'
                                )}
                            >
                                <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {error && (
                <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                    The brief couldn’t be loaded. {(error as Error).message}
                </Card>
            )}

            {isLoading && (
                <div className="space-y-5" aria-busy="true">
                    {/* Summary skeleton, shaped like AttentionSummary so nothing jumps when data arrives. */}
                    <div className="grid gap-6 rounded-[16px] border border-line bg-surface p-6 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-14 w-40" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-[10px]" />)}
                        </div>
                    </div>

                    {/* Main Sections and Side Rail Skeleton */}
                    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-5">
                        <div className="space-y-4">
                            <Skeleton className="h-44 w-full rounded-[14px]" />
                            <Skeleton className="h-56 w-full rounded-[14px]" />
                        </div>
                        <Skeleton className="h-72 w-full rounded-[14px] hidden xl:block" />
                    </div>
                </div>
            )}

            <div
                role="tabpanel"
                id="brief-tabpanel"
                aria-labelledby={`brief-tab-${view}`}
                className="space-y-5"
            >
                {brief && view === 'full' && <AttentionSummary brief={brief} links />}

                {brief && (view === 'curated'
                    ? <CuratedView brief={brief} companyName={companyName} scope={scope} fullLabel={fullLabel} onOpen={setOpenTaskId} />
                    : <FullView brief={brief} companies={companies} companyName={companyName} allCompanies={selectedCompanyId === 'all'} curate={!isExecutive} onOpen={setOpenTaskId} />)}
            </div>

            <TaskDetailModal taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
        </div>
    );
}
