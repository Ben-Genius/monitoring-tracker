import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, KeyRound, ListChecks, Mail, MessageSquareText, UserPlus } from 'lucide-react';
import { DialogShell } from '@/components/ui/dialog-shell';
import { cn, getCompanyTheme } from '@/lib/utils';
import { tx } from '@/features/dashboard/components/tokens';
import { inviteLink, type Person } from '../hooks/usePeople';
import { ACCESS, ROLES, ago, expiry, initials, inviteMessage } from '../utils/people';

interface Props {
    person: Person | null;
    onClose: () => void;
    onInvite: (p: Person) => void;
    canInvite: boolean;
    isSelf: boolean;
}

export default function PersonPanel({ person: p, onClose, onInvite, canInvite, isSelf }: Props) {
    const [copied, setCopied] = useState<string | null>(null);
    if (!p) return null;
    const role = ROLES[p.role] ?? ROLES.employee;
    const exp = p.invite ? expiry(p.invite.expires_at) : null;

    const copy = async (what: 'link' | 'message') => {
        if (!p.invite) return;
        const link = inviteLink(p.invite.token);
        const text = what === 'link' ? link : inviteMessage({ name: p.name, role: p.role, company: p.company_name }, link, p.invite.expires_at);
        try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard blocked; the link stays visible */ }
    };

    return (
        <DialogShell open onClose={onClose} title={p.name} description={p.email} variant="side">
            <div className="space-y-6 p-6">
                {/* Identity */}
                <div className="flex items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper text-lg font-bold text-ink dark:bg-slate-800 dark:text-slate-100" aria-hidden>{initials(p.name)}</span>
                    <div className="min-w-0">
                        <p className={cn('text-[15px] font-semibold', tx.ink)}>{role.label}{isSelf && <span className={cn('ml-2 text-[12px] font-medium', tx.muted)}>(you)</span>}</p>
                        <p className={cn('flex items-center gap-1.5 text-[13px]', tx.muted)}>
                            {p.company_name && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCompanyTheme(p.company_name).primary }} aria-hidden />}
                            {p.company_name ?? 'No company'}
                        </p>
                    </div>
                </div>

                {/* Access */}
                <section aria-labelledby="pp-access" className="rounded-[12px] border border-line p-4 dark:border-slate-800">
                    <h3 id="pp-access" className={cn('flex items-center gap-2 text-sm font-semibold', tx.ink)}><KeyRound className="h-4 w-4" aria-hidden /> Access</h3>
                    <p className={cn('mt-2 text-[15px] font-semibold', p.access === 'no_login' ? 'text-blocked dark:text-red-300' : tx.ink)}>{ACCESS[p.access].label}</p>
                    <p className={cn('text-[13px]', tx.muted)}>
                        {p.access === 'signed_in' || p.access === 'quiet' ? `Last signed in ${ago(p.lastSignIn).toLowerCase()}.` : ACCESS[p.access].hint + '.'}
                    </p>
                    {p.invite && (
                        <div className="mt-3 space-y-2">
                            <p className={cn('text-[12.5px]', exp?.expired ? 'font-semibold text-blocked dark:text-red-300' : tx.muted)}>
                                Invite sent {ago(p.invite.created_at).toLowerCase()}{p.invite.invited_by_name ? ` by ${p.invite.invited_by_name}` : ''}{exp ? `. ${exp.text}.` : '.'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => copy('link')} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line px-3 text-[13px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100">
                                    {copied === 'link' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied === 'link' ? 'Copied' : 'Copy link'}
                                </button>
                                <button type="button" onClick={() => copy('message')} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line px-3 text-[13px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100">
                                    {copied === 'message' ? <Check className="h-4 w-4" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />} {copied === 'message' ? 'Copied' : 'Copy message'}
                                </button>
                            </div>
                            <p className="sr-only" role="status">{copied ? 'Copied to clipboard' : ''}</p>
                        </div>
                    )}
                    {p.access === 'no_login' && canInvite && (
                        <button type="button" onClick={() => onInvite(p)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink">
                            <UserPlus className="h-4 w-4" aria-hidden /> Invite {p.name.split(' ')[0]} to sign in
                        </button>
                    )}
                </section>

                {/* Workload */}
                <section aria-labelledby="pp-load">
                    <h3 id="pp-load" className={cn('flex items-center gap-2 text-sm font-semibold', tx.ink)}><ListChecks className="h-4 w-4" aria-hidden /> Work</h3>
                    <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-[12px] border border-line dark:border-slate-800 [&>div:nth-child(even)]:border-l [&>div:nth-child(n+3)]:border-t [&>div]:border-line dark:[&>div]:border-slate-800">
                        {([['Open', p.open, false], ['Overdue', p.overdue, p.overdue > 0], ['Blocked', p.blocked, p.blocked > 0], ['Done in 30 days', p.doneLast30, false]] as const).map(([label, n, alert]) => (
                            <div key={label} className="min-w-0 px-3 py-3">
                                <dt className={cn('truncate text-[12px]', tx.muted)}>{label}</dt>
                                <dd className={cn('mt-0.5 text-[20px] font-bold tabular-nums', alert ? 'text-blocked dark:text-red-300' : tx.ink)}>{n}</dd>
                            </div>
                        ))}
                    </dl>
                    {p.open > 0 && (
                        <Link to={`/tasks?q=${encodeURIComponent(p.name)}`} onClick={onClose} className="mt-2 inline-block text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">
                            See {p.name.split(' ')[0]}'s tasks on the board
                        </Link>
                    )}
                </section>

                {/* Role */}
                <section aria-labelledby="pp-role">
                    <h3 id="pp-role" className={cn('text-sm font-semibold', tx.ink)}>What their role allows</h3>
                    <ul className={cn('mt-2 space-y-1 text-[13px]', tx.muted)}>
                        {role.can.map(c => <li key={c} className="flex gap-2"><span aria-hidden>·</span>{c}</li>)}
                    </ul>
                </section>

                {/* Activity */}
                <section aria-labelledby="pp-activity">
                    <h3 id="pp-activity" className={cn('text-sm font-semibold', tx.ink)}>Recent activity</h3>
                    {p.activity.length === 0 ? (
                        <p className={cn('mt-2 text-[13px]', tx.muted)}>Nothing recorded in the last 90 days.</p>
                    ) : (
                        <ol className="mt-2 space-y-2">
                            {p.activity.map((a, i) => (
                                <li key={i} className="text-[13px]">
                                    <p className={tx.ink}>{a.summary}</p>
                                    <p className={cn('text-[12px]', tx.muted)}>{ago(a.created_at)}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <a href={`mailto:${p.email}`} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-line px-3.5 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100">
                    <Mail className="h-4 w-4" aria-hidden /> Email {p.name.split(' ')[0]}
                </a>
            </div>
        </DialogShell>
    );
}
