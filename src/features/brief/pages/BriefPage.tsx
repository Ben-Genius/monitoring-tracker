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
import { addressAs, attentionCount, greeting } from '../utils/briefMeta';
import BriefTiles from '../components/BriefTiles';
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
    const attention = brief ? attentionCount(brief) : 0;
    const fullLabel = isExecutive ? 'Full picture' : 'Prepare today’s brief';

    const tabs = (isExecutive
        ? [['curated', 'My brief', Send], ['full', 'Full picture', ListChecks]]
        : [['full', 'Prepare today’s brief', ListChecks], ['curated', 'Preview Mr Blay’s view', Eye]]
    ) as [View, string, typeof Send][];

    const subtitle = !brief || view === 'curated'
        ? 'What needs a decision, a nudge or a thank-you today.'
        : attention === 0
            ? `${scope}: nothing needs attention.`
            : `${scope}: ${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} attention across ${brief.openCount} open tasks.`;

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
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className={cn('text-[13px] font-medium', tx.faint)}>
                        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {brief && <> · Updated {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>}
                    </p>
                    <h1 className={cn('mt-0.5 text-[26px] font-bold tracking-tight', tx.ink)}>
                        {greeting(now)}{user?.name ? `, ${addressAs(user.name)}` : ''}
                    </h1>
                    <p className={cn('mt-0.5 text-sm', tx.muted)}>{subtitle}</p>
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
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-ink/30 disabled:opacity-70 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden /> Refresh
                    </button>
                </div>
            </header>

            {error && (
                <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                    The brief couldn’t be loaded. {(error as Error).message}
                </Card>
            )}

            {isLoading && (
                <div className="space-y-5" aria-busy="true">
                    {/* Summary Strip Skeleton */}
                    <div className="rounded-[14px] border border-line bg-surface overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-line dark:divide-slate-800">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="p-4 space-y-2.5">
                                    <Skeleton className="h-3.5 w-20" />
                                    <Skeleton className="h-7 w-10" />
                                </div>
                            ))}
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
                {brief && view === 'full' && <BriefTiles brief={brief} />}

                {brief && (view === 'curated'
                    ? <CuratedView brief={brief} companyName={companyName} scope={scope} fullLabel={fullLabel} onOpen={setOpenTaskId} />
                    : <FullView brief={brief} companies={companies} companyName={companyName} allCompanies={selectedCompanyId === 'all'} curate={!isExecutive} onOpen={setOpenTaskId} />)}
            </div>

            <TaskDetailModal taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
        </div>
    );
}
