import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { cn, formatCurrencyCompact, formatDate, getCompanyTheme } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import { STATUS_LABEL, type ProjectRow } from '../utils/projectRow';

export default function ProjectCard({ project: p, showCompany }: { project: ProjectRow; showCompany: boolean }) {
    const meta = [
        p.service_type && p.service_type.charAt(0).toUpperCase() + p.service_type.slice(1),
        p.start_date && `Started ${formatDate(p.start_date)}`,
        p.creator?.name && `Created by ${p.creator.name}`,
    ].filter(Boolean) as string[];

    return (
        <article className="group relative flex h-full flex-col rounded-[14px] border border-line bg-surface p-5 transition-shadow hover:shadow-lift focus-within:ring-2 focus-within:ring-progress dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
                <span className={cn('flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium', tx.muted)}>
                    {showCompany && p.company_name && (
                        <>
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(p.company_name).primary }} aria-hidden />
                            <span className="truncate">{p.company_name}</span>
                        </>
                    )}
                </span>
                <span className={cn('shrink-0 rounded-[6px] border border-line px-2 py-0.5 text-[12px] font-medium dark:border-slate-700', tx.ink)}>
                    {STATUS_LABEL[p.status] ?? p.status}
                </span>
            </div>

            {/* Title and meta reserve fixed height so the figures line up across cards in a row. */}
            <h2 className={cn('mt-2 line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-[22px]', tx.ink)} title={p.name}>
                {/* The stretched link makes the whole card clickable while keeping one named link for keyboard and screen readers. */}
                <Link to={`/projects/${p.id}`} className="outline-none after:absolute after:inset-0 after:rounded-[14px] after:content-['']">
                    {p.name}
                </Link>
            </h2>
            <p className={cn('mt-1 h-[18px] truncate text-[12.5px] leading-[18px]', tx.muted)}>{meta.join(' · ')}</p>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-3 dark:border-slate-800">
                {Number(p.contract_value) > 0
                    ? <Figure label="Contract" value={formatCurrencyCompact(Number(p.contract_value))} />
                    : <Figure label="Contract" value="Not set" tone="faint" />}
                <Figure
                    label="Margin"
                    value={p.margin === null ? 'No cost yet' : `${p.margin.toFixed(1)}%`}
                    tone={p.margin === null ? 'faint' : p.margin < 0 ? 'danger' : 'ink'}
                />
                <Figure label="Handover" value={p.expected_handover ? formatDate(p.expected_handover) : 'Not set'} tone={p.expected_handover ? 'ink' : 'faint'} />
            </dl>

            <div className="mt-auto pt-4">
                {p.total_tasks === 0 ? (
                    <p className={cn('text-[13px]', tx.muted)}>No tasks yet</p>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className={tx.muted}>
                                <span className={cn('font-semibold tabular-nums', tx.ink)}>{p.done_tasks}</span> of {p.total_tasks} {p.total_tasks === 1 ? 'task' : 'tasks'} done
                            </span>
                            {p.blocked_tasks > 0 ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-blocked dark:text-red-300">
                                    <Ban className="h-3.5 w-3.5" aria-hidden /> {p.blocked_tasks} blocked
                                </span>
                            ) : (
                                <span className={cn('tabular-nums', tx.muted)}>{p.progress}%</span>
                            )}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line dark:bg-slate-800" role="img" aria-label={`${p.progress}% of tasks done`}>
                            <div className="h-full rounded-full bg-slate-600 dark:bg-slate-300" style={{ width: `${p.progress}%` }} />
                        </div>
                    </>
                )}
            </div>
        </article>
    );
}

function Figure({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'faint' | 'danger' }) {
    return (
        <div className="min-w-0">
            <dt className={cn('text-[12px]', tx.muted)}>{label}</dt>
            <dd className={cn(
                'truncate text-[14px] font-semibold tabular-nums',
                tone === 'faint' ? cn('font-medium', tx.muted) : tone === 'danger' ? 'text-blocked dark:text-red-300' : tx.ink
            )}>
                {value}
            </dd>
        </div>
    );
}
