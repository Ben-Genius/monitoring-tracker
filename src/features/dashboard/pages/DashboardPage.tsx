import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BadgeCheck, FolderKanban, KanbanSquare, Sunrise } from 'lucide-react';
import { cn, formatCurrencyCompact, formatDate, formatRelativeTime, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies, useProjects } from '@/features/projects/hooks/useProjects';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useDashboardStats, useRecentApprovals } from '../hooks/useDashboard';
import { useRecentAuditLogs } from '@/features/audit/hooks/useAuditLog';
import { useBrief } from '@/features/brief/hooks/useBrief';
import { canApprove, canReadBrief } from '@/lib/permissions';
import KpiTiles from '../components/KpiTiles';
import WorkloadCard from '../components/WorkloadCard';
import AttentionCard from '../components/AttentionCard';
import DeadlineTimeline from '../components/DeadlineTimeline';
import TaskTable from '../components/TaskTable';
import { Avatar, Card, CardHeader } from '../components/primitives';
import { tx } from '../components/tokens';

/** Audit summaries are stored with raw stage ids ("yet to_start", "blockers"). */
const readableSummary = (s: string) => s.replace(/_/g, ' ').replace(/\bblockers\b/g, 'blocked');

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { selectedCompanyId } = useCompanyStore();
    const scopeId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    const { data: companies = [] } = useCompanies();
    const { data: stats } = useDashboardStats(selectedCompanyId);
    const { data: tasks = [], isLoading } = useTasks({ company_id: scopeId });
    const { data: projects = [] } = useProjects(scopeId);
    const { data: brief } = useBrief(selectedCompanyId);
    const { data: activity = [] } = useRecentAuditLogs(5);
    const { data: approvals = [] } = useRecentApprovals(5, selectedCompanyId);

    const isStaff = user?.role === 'employee';
    const readsBrief = canReadBrief(user);
    const showApprovals = canApprove(user);
    const scopeName = scopeId ? companies.find(c => c.id === scopeId)?.name ?? 'your company' : 'all companies';
    const pending = approvals.filter(a => a.status === 'pending');

    const projectRows = useMemo(() => {
        return projects.map(p => {
            const list = p.tasks ?? [];
            const done = list.filter(t => t.stage === 'completed').length;
            const blocked = list.filter(t => t.stage === 'blockers').length;
            return { p, open: list.length - done, done, blocked, total: list.length };
        }).sort((a, b) => b.blocked - a.blocked || b.open - a.open).slice(0, 6);
    }, [projects]);

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-12">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className={cn('text-[13px] font-medium', tx.faint)}>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h1 className={cn('mt-0.5 text-[26px] font-bold tracking-tight', tx.ink)}>Dashboard</h1>
                    <p className={cn('mt-0.5 text-sm', tx.muted)}>
                        Where the work stands across {scopeName}, and what needs you today.
                    </p>
                </div>
                <div className="flex gap-2">
                    {readsBrief && (
                        <Link to="/brief" className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                            <Sunrise className="h-4 w-4" aria-hidden /> Morning brief
                        </Link>
                    )}
                    <Link to="/tasks" className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink dark:hover:bg-white/90">
                        <KanbanSquare className="h-4 w-4" aria-hidden /> Open task board
                    </Link>
                </div>
            </div>

            {/*
              Overview. Two paired rows share one grid so cards in the same row
              are always the same height and the columns line up top and bottom:
              row 1 = numbers | stage split, row 2 = deadlines | needs attention.
            */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                <Card className="flex flex-col p-2.5 sm:p-3">
                    <KpiTiles tasks={tasks} isLoading={isLoading} briefTo={readsBrief ? '/brief' : undefined} />
                </Card>
                <WorkloadCard tasks={tasks} isLoading={isLoading} />
                <DeadlineTimeline tasks={tasks} />
                <AttentionCard
                    brief={brief}
                    linkTo={readsBrief ? '/brief' : '/tasks'}
                    moreIn={readsBrief ? 'morning brief' : 'task board'}
                />
            </div>

            <TaskTable tasks={tasks} isLoading={isLoading} showCompany={!scopeId} />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
                {/* Projects */}
                <Card className="flex min-w-0 flex-col xl:col-span-2" aria-labelledby="projects-heading">
                    <CardHeader
                        id="projects-heading"
                        icon={FolderKanban}
                        title="Projects with the most open work"
                        action={<Link to="/projects" className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">All projects</Link>}
                    />
                    <dl className={cn('grid border-t border-line dark:border-slate-800', isStaff ? 'grid-cols-2' : 'grid-cols-3')}>
                        <Figure label="Active projects" value={String(stats?.totalProjects ?? '–')} />
                        <Figure label="People" value={String(stats?.teamMembers ?? '–')} />
                        {!isStaff && <Figure label="Contract value" value={stats ? formatCurrencyCompact(stats.totalRevenue || 0) : '–'} />}
                    </dl>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead>
                                <tr className={cn('border-y border-line text-left text-[12px] dark:border-slate-800', tx.muted)}>
                                    <th scope="col" className="px-5 py-2.5 font-medium">Project</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Open</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Blocked</th>
                                    <th scope="col" className="w-44 whitespace-nowrap px-3 py-2.5 font-medium">Tasks done</th>
                                    <th scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium">Handover</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line dark:divide-slate-800">
                                {projectRows.map(({ p, open, done, blocked, total: n }) => (
                                    <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer hover:bg-paper/70 dark:hover:bg-slate-800/50">
                                        <td className="max-w-[340px] px-5 py-3">
                                            <span className="flex items-center gap-2.5">
                                                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(p.company?.name ?? '').primary }} aria-hidden />
                                                <span className="min-w-0">
                                                    <Link to={`/projects/${p.id}`} onClick={e => e.stopPropagation()} title={p.name} className={cn('block truncate font-semibold hover:underline', tx.ink)}>{p.name}</Link>
                                                    {!scopeId && <span className={cn('block truncate text-[12.5px]', tx.muted)}>{p.company?.name}</span>}
                                                </span>
                                            </span>
                                        </td>
                                        <td className={cn('px-3 py-3 text-right tabular-nums', tx.ink)}>{open}</td>
                                        <td className={cn('px-3 py-3 text-right tabular-nums', blocked ? 'font-semibold text-blocked dark:text-red-300' : tx.faint)}>{blocked}</td>
                                        <td className="px-3 py-3">
                                            <span className="flex items-center gap-2">
                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper dark:bg-slate-800">
                                                    <span className="block h-full rounded-full bg-done" style={{ width: `${n ? (done / n) * 100 : 0}%` }} />
                                                </span>
                                                <span className={cn('w-12 text-right text-[12px] tabular-nums', tx.muted)}>{done}/{n}</span>
                                            </span>
                                        </td>
                                        <td className={cn('whitespace-nowrap px-5 py-3', tx.muted)}>{p.expected_handover ? formatDate(p.expected_handover) : 'Not set'}</td>
                                    </tr>
                                ))}
                                {projectRows.length === 0 && (
                                    <tr><td colSpan={5} className={cn('px-5 py-8 text-center', tx.muted)}>No projects yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="flex min-w-0 flex-col gap-5">
                    {showApprovals && (
                        <Card aria-labelledby="approvals-heading">
                            <CardHeader
                                id="approvals-heading"
                                icon={BadgeCheck}
                                title="Waiting for approval"
                                count={pending.length || undefined}
                                action={<Link to="/approvals" className="text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">See all</Link>}
                            />
                            {pending.length === 0
                                ? <p className={cn('border-t border-line px-5 py-4 text-sm dark:border-slate-800', tx.muted)}>Nothing waiting for a decision.</p>
                                : (
                                    <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                        {pending.map(a => (
                                            <li key={a.id} className="px-5 py-3">
                                                <p className={cn('truncate text-sm font-semibold', tx.ink)}>{a.title}</p>
                                                <p className={cn('text-[12.5px]', tx.muted)}>Requested by {a.requester_name}, {formatRelativeTime(a.created_at)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </Card>
                    )}

                    <Card aria-labelledby="activity-heading" className="flex flex-1 flex-col">
                        <CardHeader id="activity-heading" icon={Activity} title="Recent activity" />
                        {activity.length === 0
                            ? <p className={cn('border-t border-line px-5 py-4 text-sm dark:border-slate-800', tx.muted)}>No activity recorded yet.</p>
                            : (
                                <ol className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                                    {activity.map(a => (
                                        <li key={a.id} className="flex gap-3 px-5 py-3">
                                            <Avatar name={a.user?.name ?? 'System'} size={26} />
                                            <div className="min-w-0">
                                                <p className={cn('text-[13px] leading-snug', tx.ink)}>{readableSummary(a.summary)}</p>
                                                <p className={cn('mt-0.5 text-[12px]', tx.faint)}>{a.user?.name ?? 'System'}, {formatRelativeTime(a.created_at)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Figure({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 border-l border-line px-4 py-3.5 first:border-l-0 sm:px-5 dark:border-slate-800">
            <dt className={cn('truncate text-[12.5px]', tx.muted)}>{label}</dt>
            <dd className={cn('truncate text-[18px] font-bold leading-tight tabular-nums sm:text-[20px]', tx.ink)}>{value}</dd>
        </div>
    );
}
