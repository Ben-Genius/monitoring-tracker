import { Link, useNavigate } from 'react-router-dom';
import { Ban, ChevronRight } from 'lucide-react';
import { cn, formatCurrencyCompact, formatDate, getCompanyTheme } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import { STATUS_LABEL, type ProjectRow } from '../utils/projectRow';

interface ProjectTableProps {
    projects: ProjectRow[];
    showCompany: boolean;
}

export default function ProjectTable({ projects, showCompany }: ProjectTableProps) {
    const navigate = useNavigate();

    return (
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm" role="table" aria-label="Projects list">
                    <thead>
                        <tr className={cn('border-b border-line text-[12px] font-medium dark:border-slate-800', tx.muted)}>
                            <th scope="col" className="px-5 py-3.5 font-semibold">Project</th>
                            {showCompany && <th scope="col" className="px-3 py-3.5 font-semibold">Company</th>}
                            <th scope="col" className="px-3 py-3.5 font-semibold">Status</th>
                            <th scope="col" className="px-3 py-3.5 font-semibold">Contract</th>
                            <th scope="col" className="px-3 py-3.5 font-semibold">Margin</th>
                            <th scope="col" className="px-3 py-3.5 font-semibold">Progress</th>
                            <th scope="col" className="px-3 py-3.5 font-semibold">Tasks</th>
                            <th scope="col" className="px-3 py-3.5 font-semibold">Handover</th>
                            <th scope="col" className="px-4 py-3.5 text-right font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line dark:divide-slate-800">
                        {projects.map((p) => {
                            const companyTheme = p.company_name ? getCompanyTheme(p.company_name) : null;
                            const contractVal = Number(p.contract_value) || 0;

                            return (
                                <tr
                                    key={p.id}
                                    onClick={() => navigate(`/projects/${p.id}`)}
                                    className="cursor-pointer transition-colors hover:bg-paper/70 dark:hover:bg-slate-800/50"
                                >
                                    {/* Project Name and Service Type */}
                                    <td className="max-w-[280px] px-5 py-3.5">
                                        <Link
                                            to={`/projects/${p.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={cn('block truncate font-semibold hover:underline', tx.ink)}
                                            title={p.name}
                                        >
                                            {p.name}
                                        </Link>
                                        <span className={cn('block truncate text-[12px]', tx.muted)}>
                                            {p.service_type
                                                ? p.service_type.charAt(0).toUpperCase() + p.service_type.slice(1)
                                                : 'General'}
                                            {p.creator?.name ? ` · by ${p.creator.name}` : ''}
                                        </span>
                                    </td>

                                    {/* Company Pill (if in global view) */}
                                    {showCompany && (
                                        <td className="whitespace-nowrap px-3 py-3.5">
                                            {p.company_name ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{ backgroundColor: companyTheme?.primary }}
                                                        aria-hidden
                                                    />
                                                    <span className="truncate max-w-[120px]">{p.company_name}</span>
                                                </span>
                                            ) : (
                                                <span className={cn('text-xs', tx.muted)}>—</span>
                                            )}
                                        </td>
                                    )}

                                    {/* Status Badge */}
                                    <td className="whitespace-nowrap px-3 py-3.5">
                                        <span className={cn('rounded-[6px] border border-line px-2 py-0.5 text-[11px] font-semibold dark:border-slate-700', tx.ink)}>
                                            {STATUS_LABEL[p.status] ?? p.status}
                                        </span>
                                    </td>

                                    {/* Contract Value */}
                                    <td className="whitespace-nowrap px-3 py-3.5 tabular-nums">
                                        {contractVal > 0 ? (
                                            <span className={cn('font-semibold', tx.ink)}>
                                                {formatCurrencyCompact(contractVal)}
                                            </span>
                                        ) : (
                                            <span className={cn('text-xs font-medium', tx.faint)}>Not set</span>
                                        )}
                                    </td>

                                    {/* Margin */}
                                    <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-xs">
                                        {p.margin === null ? (
                                            <span className={tx.faint}>No cost</span>
                                        ) : (
                                            <span
                                                className={cn(
                                                    'font-semibold',
                                                    p.margin < 0
                                                        ? 'text-blocked dark:text-red-300'
                                                        : p.margin >= 15
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : tx.ink
                                                )}
                                            >
                                                {p.margin.toFixed(1)}%
                                            </span>
                                        )}
                                    </td>

                                    {/* Progress Meter */}
                                    <td className="whitespace-nowrap px-3 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1.5 w-16 overflow-hidden rounded-full bg-line dark:bg-slate-800"
                                                role="img"
                                                aria-label={`${p.progress}% done`}
                                            >
                                                <div
                                                    className="h-full rounded-full bg-slate-600 dark:bg-slate-300"
                                                    style={{ width: `${p.progress}%` }}
                                                />
                                            </div>
                                            <span className={cn('w-8 text-[12px] tabular-nums font-semibold', tx.muted)}>
                                                {p.progress}%
                                            </span>
                                        </div>
                                    </td>

                                    {/* Task Counts & Blocked Alerts */}
                                    <td className="whitespace-nowrap px-3 py-3.5 text-xs">
                                        {p.total_tasks === 0 ? (
                                            <span className={tx.faint}>No tasks</span>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <span className={tx.muted}>
                                                    <span className={cn('font-semibold tabular-nums', tx.ink)}>
                                                        {p.done_tasks}
                                                    </span>
                                                    /{p.total_tasks}
                                                </span>
                                                {p.blocked_tasks > 0 && (
                                                    <span
                                                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold text-blocked bg-red-50 dark:bg-red-950/40 dark:text-red-300"
                                                        title={`${p.blocked_tasks} tasks blocked`}
                                                    >
                                                        <Ban className="h-3 w-3" aria-hidden />
                                                        {p.blocked_tasks}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Handover Date */}
                                    <td className="whitespace-nowrap px-3 py-3.5 text-xs tabular-nums">
                                        {p.expected_handover ? (
                                            <span className={tx.ink}>{formatDate(p.expected_handover)}</span>
                                        ) : (
                                            <span className={tx.faint}>Not set</span>
                                        )}
                                    </td>

                                    {/* Action Column */}
                                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                                        <span className="inline-flex items-center text-xs font-semibold text-ink-muted group-hover:text-ink">
                                            <ChevronRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

