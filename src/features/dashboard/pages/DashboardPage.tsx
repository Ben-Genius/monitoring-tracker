import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Ban, CalendarX, Clock, Sunrise } from 'lucide-react';
import { cn, formatCurrencyCompact, formatDate, formatRelativeTime, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies, useProjects } from '@/features/projects/hooks/useProjects';
import { useTasks, type Task } from '@/features/tasks/hooks/useTasks';
import { useDashboardStats, useRecentApprovals } from '../hooks/useDashboard';
import { useRecentAuditLogs } from '@/features/audit/hooks/useAuditLog';
import { useBrief, companyOf, type BriefSection, type BriefTask } from '@/features/brief/hooks/useBrief';
import { STAGES } from '@/features/tasks/utils/stages';
import { canApprove, canReadBrief } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';

const ATTENTION: { key: BriefSection; label: string; icon: typeof AlertTriangle; color: string }[] = [
    { key: 'urgent', label: 'Urgent', icon: AlertTriangle, color: '#B83A24' },
    { key: 'blocked', label: 'Blocked', icon: Ban, color: '#B83A24' },
    { key: 'stuck', label: 'No movement for 2+ days', icon: Clock, color: '#C2410C' },
    { key: 'overdue', label: 'Overdue', icon: CalendarX, color: '#B45309' },
];

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
    const { data: activity = [] } = useRecentAuditLogs(8);
    const { data: approvals = [] } = useRecentApprovals(5, selectedCompanyId);

    const isStaff = user?.role === 'employee';
    const scopeName = scopeId ? companies.find(c => c.id === scopeId)?.name ?? '' : 'All companies';

    const byStage = useMemo(() => {
        const m: Record<string, number> = {};
        tasks.forEach((t: Task) => { m[t.stage] = (m[t.stage] ?? 0) + 1; });
        return m;
    }, [tasks]);
    const total = tasks.length || 1;

    const attention = useMemo(() => {
        if (!brief) return [] as { t: BriefTask; key: BriefSection }[];
        return ATTENTION.flatMap(a => brief.sections[a.key].map(t => ({ t, key: a.key })));
    }, [brief]);

    const projectRows = useMemo(() => {
        return projects.map(p => {
            const list = p.tasks ?? [];
            const done = list.filter(t => t.stage === 'completed').length;
            const blocked = list.filter(t => t.stage === 'blockers').length;
            return { p, open: list.length - done, done, blocked, total: list.length };
        }).sort((a, b) => b.blocked - a.blocked || b.open - a.open).slice(0, 10);
    }, [projects]);

    const companyName = (id?: string | null) => companies.find(c => c.id === id)?.name ?? '';

    return (
        <div className="w-full space-y-5 pb-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[26px] font-bold tracking-tight text-ink">Dashboard</h1>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        {scopeName}, {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div className="flex gap-2">
                    {canReadBrief(user) && (
                        <Link to="/brief" className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:border-ink/30">
                            <Sunrise className="h-4 w-4" /> Morning brief
                        </Link>
                    )}
                    <Link to="/tasks" className="inline-flex h-10 items-center rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90">Open task board</Link>
                </div>
            </div>

            {/* Where the work is */}
            <section className="rounded-[12px] border border-line bg-surface" aria-labelledby="work-heading">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="p-5">
                        <h2 id="work-heading" className="text-[15px] font-semibold text-ink">Where the work is</h2>
                        {isLoading ? <Skeleton className="mt-4 h-3 w-full" /> : (
                            <>
                                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper" role="img"
                                    aria-label={STAGES.map(s => `${s.label}: ${byStage[s.id] ?? 0}`).join(', ')}>
                                    {STAGES.map(s => (byStage[s.id] ?? 0) > 0 && (
                                        <span key={s.id} style={{ width: `${((byStage[s.id] ?? 0) / total) * 100}%`, backgroundColor: s.accent }} />
                                    ))}
                                </div>
                                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                                    {STAGES.filter(s => s.id !== 'talking_stage' || byStage[s.id]).map(s => (
                                        <li key={s.id}>
                                            <Link to="/tasks" className="group block">
                                                <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.accent }} /> {s.label}
                                                </span>
                                                <span className="text-[28px] font-bold leading-tight tabular-nums text-ink group-hover:underline">{byStage[s.id] ?? 0}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                    <dl className="grid grid-cols-3 lg:grid-cols-1 border-t lg:border-t-0 lg:border-l border-line lg:w-56">
                        <Figure label="Active projects" value={String(stats?.totalProjects ?? '–')} />
                        <Figure label="People" value={String(stats?.teamMembers ?? '–')} />
                        {!isStaff && <Figure label="Contract value" value={stats ? formatCurrencyCompact(stats.totalRevenue || 0) : '–'} />}
                    </dl>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-3 items-start">
                {/* Needs attention */}
                <section className="xl:col-span-2 rounded-[12px] border border-line bg-surface" aria-labelledby="attention-heading">
                    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                        <h2 id="attention-heading" className="text-[15px] font-semibold text-ink">
                            Needs attention <span className="ml-1 font-semibold text-ink-faint tabular-nums">{attention.length}</span>
                        </h2>
                        <Link to={canReadBrief(user) ? '/brief' : '/tasks'} className="inline-flex items-center gap-1 text-[13px] font-semibold text-progress hover:underline">
                            {canReadBrief(user) ? 'Open the brief' : 'Open tasks'} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </header>
                    {attention.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-ink-muted">Nothing is urgent, blocked, stuck or overdue.</p>
                    ) : (
                        <ul className="divide-y divide-line">
                            {attention.slice(0, 8).map(({ t, key }) => {
                                const a = ATTENTION.find(x => x.key === key)!;
                                return (
                                    <li key={t.id}>
                                        <button onClick={() => navigate(`/tasks?task=${t.id}`)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-paper/60">
                                            <a.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: a.color }} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-ink">{t.title}</span>
                                                <span className="block text-[13px] text-ink-muted">
                                                    <span style={{ color: a.color }}>{a.label}</span>
                                                    {t.owner?.name ? `, ${t.owner.name}` : ', no owner'}
                                                    {t.project?.name ? `, ${t.project.name}` : ''}
                                                </span>
                                            </span>
                                            {!scopeId && <span className="hidden sm:inline text-[12px] text-ink-faint">{companyName(companyOf(t))}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {attention.length > 8 && (
                        <p className="border-t border-line px-5 py-2.5 text-[13px] text-ink-muted">{attention.length - 8} more in the {canReadBrief(user) ? 'brief' : 'task board'}.</p>
                    )}
                </section>

                <div className="space-y-5">
                    {canApprove(user) && (
                        <section className="rounded-[12px] border border-line bg-surface" aria-labelledby="approvals-heading">
                            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                                <h2 id="approvals-heading" className="text-[15px] font-semibold text-ink">Approvals</h2>
                                <Link to="/approvals" className="text-[13px] font-semibold text-progress hover:underline">See all</Link>
                            </header>
                            {approvals.filter(a => a.status === 'pending').length === 0
                                ? <p className="px-5 py-5 text-sm text-ink-muted">Nothing waiting for a decision.</p>
                                : <ul className="divide-y divide-line">{approvals.filter(a => a.status === 'pending').map(a => (
                                    <li key={a.id} className="px-5 py-3">
                                        <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                                        <p className="text-[13px] text-ink-muted">Requested by {a.requester_name}, {formatRelativeTime(a.created_at)}</p>
                                    </li>
                                ))}</ul>}
                        </section>
                    )}
                    <section className="rounded-[12px] border border-line bg-surface" aria-labelledby="activity-heading">
                        <header className="border-b border-line px-5 py-3.5">
                            <h2 id="activity-heading" className="text-[15px] font-semibold text-ink">Recent activity</h2>
                        </header>
                        {activity.length === 0 ? <p className="px-5 py-5 text-sm text-ink-muted">No activity recorded yet.</p> : (
                            <ol className="divide-y divide-line">
                                {activity.map(a => (
                                    <li key={a.id} className="px-5 py-3">
                                        <p className="text-[13px] leading-snug text-ink">{a.summary}</p>
                                        <p className="mt-0.5 text-[12px] text-ink-faint">{a.user?.name ?? 'System'}, {formatRelativeTime(a.created_at)}</p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>
            </div>

            {/* Projects */}
            <section className="rounded-[12px] border border-line bg-surface" aria-labelledby="projects-heading">
                <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                    <h2 id="projects-heading" className="text-[15px] font-semibold text-ink">Projects with the most open work</h2>
                    <Link to="/projects" className="text-[13px] font-semibold text-progress hover:underline">All projects</Link>
                </header>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-left text-[12px] text-ink-muted">
                                <th className="px-5 py-2.5 font-medium">Project</th>
                                {!scopeId && <th className="px-3 py-2.5 font-medium">Company</th>}
                                <th className="px-3 py-2.5 font-medium text-right">Open</th>
                                <th className="px-3 py-2.5 font-medium text-right">Blocked</th>
                                <th className="px-3 py-2.5 font-medium w-48">Tasks done</th>
                                <th className="px-5 py-2.5 font-medium">Handover</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {projectRows.map(({ p, open, done, blocked, total: n }) => (
                                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer hover:bg-paper/60">
                                    <td className="px-5 py-3">
                                        <span className="flex items-center gap-2.5">
                                            <span className="h-5 w-1 rounded-full" style={{ backgroundColor: getCompanyTheme(p.company?.name ?? '').primary }} />
                                            <span className="font-semibold text-ink">{p.name}</span>
                                        </span>
                                    </td>
                                    {!scopeId && <td className="px-3 py-3 text-ink-muted">{p.company?.name}</td>}
                                    <td className="px-3 py-3 text-right tabular-nums text-ink">{open}</td>
                                    <td className={cn('px-3 py-3 text-right tabular-nums', blocked ? 'font-semibold text-blocked' : 'text-ink-faint')}>{blocked}</td>
                                    <td className="px-3 py-3">
                                        <span className="flex items-center gap-2">
                                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                                                <span className="block h-full rounded-full bg-done" style={{ width: `${n ? (done / n) * 100 : 0}%` }} />
                                            </span>
                                            <span className="w-12 text-right text-[12px] tabular-nums text-ink-muted">{done}/{n}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-muted">{p.expected_handover ? formatDate(p.expected_handover) : 'Not set'}</td>
                                </tr>
                            ))}
                            {projectRows.length === 0 && (
                                <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-muted">No projects yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Figure({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-5 py-4 border-l first:border-l-0 lg:border-l-0 lg:border-t lg:first:border-t-0 border-line">
            <dt className="text-[13px] text-ink-muted">{label}</dt>
            <dd className="text-[22px] font-bold leading-tight tabular-nums text-ink">{value}</dd>
        </div>
    );
}
