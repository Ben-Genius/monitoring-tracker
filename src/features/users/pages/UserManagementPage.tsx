import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Mail, MessageSquareText, Search, UserPlus, Users } from 'lucide-react';
import { cn, getCompanyTheme } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { canAdminister, canViewAllCompanies, type Role } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import { usePeople, inviteLink, type Access, type Invite, type Person } from '../hooks/usePeople';
import { ACCESS, ROLES, ROLE_ORDER, ago, expiry, initials, inviteMessage } from '../utils/people';
import AccessPanel from '../components/AccessPanel';
import WorkloadPanel from '../components/WorkloadPanel';
import PersonPanel from '../components/PersonPanel';
import InviteDialog, { type InviteDraft } from '../components/InviteDialog';

type Sort = 'name' | 'load' | 'recent';
const PAGE = 25;

const control = 'h-10 rounded-[8px] border border-line bg-surface text-sm text-ink outline-none focus:border-progress dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function UserManagementPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const isAdmin = canAdminister(user);
    const seesAll = canViewAllCompanies(user);
    // Leads see only their own company; everyone else follows the header's company switch.
    const scopeId = seesAll ? (selectedCompanyId === 'all' ? null : selectedCompanyId) : user?.company_id ?? null;
    const { data, isLoading, error, refetch } = usePeople({ companyId: scopeId, enabled: !!user });

    const [q, setQ] = useState('');
    const [roleF, setRoleF] = useState<Role | 'all'>('all');
    const [accessF, setAccessF] = useState<Access | null>(null);
    const [sort, setSort] = useState<Sort>('name');
    const [limit, setLimit] = useState(PAGE);
    const [openId, setOpenId] = useState<string | null>(null);
    const [invite, setInvite] = useState<{ open: boolean; initial?: Partial<InviteDraft> }>({ open: false });

    const people = useMemo(() => data?.people ?? [], [data]);
    const allowedRoles: Role[] = isAdmin ? ROLE_ORDER : ['lead', 'employee'];
    const scopeName = scopeId ? data?.companies.find(c => c.id === scopeId)?.name ?? 'your company' : 'all companies';

    const shown = useMemo(() => {
        const term = q.trim().toLowerCase();
        const list = people.filter(p =>
            (roleF === 'all' || p.role === roleF) &&
            (!accessF || p.access === accessF) &&
            (!term || p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) || (p.company_name ?? '').toLowerCase().includes(term)));
        const by: Record<Sort, (a: Person, b: Person) => number> = {
            name: (a, b) => a.name.localeCompare(b.name),
            load: (a, b) => b.open - a.open || b.overdue - a.overdue || a.name.localeCompare(b.name),
            recent: (a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '') || a.name.localeCompare(b.name),
        };
        return list.sort(by[sort]);
    }, [people, q, roleF, accessF, sort]);

    const filtering = !!q.trim() || roleF !== 'all' || !!accessF;
    const resetFilters = () => { setQ(''); setRoleF('all'); setAccessF(null); setLimit(PAGE); };
    const roleCounts = useMemo(() => Object.fromEntries(ROLE_ORDER.map(r => [r, people.filter(p => p.role === r).length])), [people]);
    const opened = people.find(p => p.id === openId) ?? null;

    const inviteFor = (p?: Person) => setInvite({
        open: true,
        initial: p ? { name: p.name, email: p.email, role: p.role, company_id: p.company_id ?? '' } : { company_id: scopeId ?? '' },
    });

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-16">
            {/* Title, scope and the one primary action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={cn('text-[26px] font-bold tracking-tight', tx.ink)}>People</h1>
                    <p className={cn('mt-0.5 text-sm', tx.muted)}>
                        {isLoading ? 'Loading people…' : `${people.length} ${people.length === 1 ? 'person' : 'people'} across ${scopeName}: who can get in, who is carrying the work, and what each role allows.`}
                    </p>
                </div>
                <button type="button" onClick={() => inviteFor()} className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-[8px] bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progress dark:bg-white dark:text-ink dark:hover:bg-white/90 sm:self-auto">
                    <UserPlus className="h-4 w-4" aria-hidden /> Invite someone
                </button>
            </div>

            {error && (
                <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    People could not be loaded. <button type="button" onClick={() => refetch()} className="font-semibold underline">Try again</button>
                </div>
            )}

            {/* The two questions this page answers, before the list */}
            {isLoading ? (
                <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-[260px] rounded-[14px]" /><Skeleton className="h-[260px] rounded-[14px]" /></div>
            ) : data && (
                <div className="grid items-stretch gap-5 lg:grid-cols-2">
                    <AccessPanel people={people} known={data.accessKnown} isAdmin={isAdmin} filter={accessF} onFilter={a => { setAccessF(a); setLimit(PAGE); }} />
                    <WorkloadPanel people={people} unassigned={data.unassignedOpen} onOpen={p => setOpenId(p.id)} />
                </div>
            )}

            {/* Directory */}
            <Card aria-labelledby="dir-heading">
                <CardHeader
                    id="dir-heading"
                    icon={Users}
                    title="Everyone"
                    count={isLoading ? undefined : shown.length}
                    action={filtering ? <button type="button" onClick={resetFilters} className="text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">Clear filters</button> : undefined}
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 dark:border-slate-800">
                    <label className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-xs">
                        <span className="sr-only">Search people</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-slate-400" aria-hidden />
                        <input type="search" value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search name, email or company" className={cn(control, 'w-full pl-9 pr-3 placeholder:text-ink-muted dark:placeholder:text-slate-400')} />
                    </label>
                    <Select label="Role" value={roleF} onChange={v => { setRoleF(v as Role | 'all'); setLimit(PAGE); }}
                        options={[['all', `All roles (${people.length})`], ...ROLE_ORDER.filter(r => roleCounts[r]).map(r => [r, `${ROLES[r].label} (${roleCounts[r]})`] as [string, string])]} />
                    <Select label="Sort" value={sort} onChange={v => setSort(v as Sort)}
                        options={[['name', 'Name A–Z'], ['load', 'Most open tasks'], ['recent', 'Recently active']]} />
                    {accessF && (
                        <button type="button" onClick={() => setAccessF(null)} className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-ink bg-paper px-3 text-[13px] font-semibold text-ink dark:border-slate-200 dark:bg-slate-800 dark:text-slate-100" aria-label={`Remove filter: ${ACCESS[accessF].label}`}>
                            {ACCESS[accessF].label} <span aria-hidden>×</span>
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3 border-t border-line p-5 dark:border-slate-800">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : shown.length === 0 ? (
                    <div className="border-t border-line px-5 py-12 text-center dark:border-slate-800">
                        <p className={cn('text-[15px] font-semibold', tx.ink)}>{filtering ? 'No one matches these filters.' : 'No people here yet.'}</p>
                        <div className="mt-3">
                            {filtering
                                ? <button type="button" onClick={resetFilters} className="text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">Clear filters</button>
                                : <button type="button" onClick={() => inviteFor()} className="text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">Invite the first person</button>}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Column labels for wide screens; rows reflow into cards on phones. */}
                        <div className={cn('hidden border-y border-line px-5 py-2.5 text-[12px] font-medium dark:border-slate-800 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_7.5rem_minmax(0,1.3fr)] lg:gap-4', tx.muted)} aria-hidden>
                            <span>Person</span><span>Role</span><span>Company</span><span>Open work</span><span>Last active</span><span>Access</span>
                        </div>
                        <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800 lg:border-t-0">
                            {shown.slice(0, limit).map(p => (
                                <PersonRow key={p.id} p={p} isSelf={p.id === user?.id} showCompany={!scopeId} maxOpen={Math.max(1, ...people.map(x => x.open))} onOpen={() => setOpenId(p.id)} onInvite={() => inviteFor(p)} />
                            ))}
                        </ul>
                        {shown.length > limit && (
                            <button type="button" onClick={() => setLimit(l => l + PAGE)} className="w-full border-t border-line py-3 text-[13px] font-semibold text-progress hover:bg-paper/70 dark:border-slate-800 dark:text-blue-300 dark:hover:bg-slate-800/50">
                                Show {Math.min(PAGE, shown.length - limit)} more of {shown.length - limit}
                            </button>
                        )}
                    </>
                )}
            </Card>

            {data && data.invites.length > 0 && <InvitesCard invites={data.invites} />}

            <PersonPanel
                key={opened?.id ?? 'none'}
                person={opened}
                onClose={() => setOpenId(null)}
                isSelf={opened?.id === user?.id}
                canInvite
                onInvite={p => { setOpenId(null); inviteFor(p); }}
                canManageAccess={isAdmin && !!data?.deactivationAvailable}
                onAccessChanged={() => refetch()}
            />
            <InviteDialog
                open={invite.open}
                initial={invite.initial}
                onClose={() => setInvite({ open: false })}
                onCreated={() => refetch()}
                companies={data?.companies ?? []}
                allowedRoles={allowedRoles}
                lockedCompanyId={seesAll ? null : user?.company_id}
            />
        </div>
    );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
    return (
        <label className="relative">
            <span className="sr-only">{label}</span>
            <select value={value} onChange={e => onChange(e.target.value)} className={cn(control, 'cursor-pointer appearance-none pl-3 pr-9 font-medium')}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-slate-400" aria-hidden />
        </label>
    );
}

function PersonRow({ p, isSelf, showCompany, maxOpen, onOpen, onInvite }: { p: Person; isSelf: boolean; showCompany: boolean; maxOpen: number; onOpen: () => void; onInvite: () => void }) {
    const role = ROLES[p.role] ?? ROLES.employee;
    const blockedOut = p.access === 'no_login';
    return (
        <li className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-5 py-3.5 hover:bg-paper/70 focus-within:bg-paper/70 dark:hover:bg-slate-800/50 dark:focus-within:bg-slate-800/50 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_7.5rem_minmax(0,1.3fr)] lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-[12px] font-bold text-ink dark:bg-slate-800 dark:text-slate-100" aria-hidden>{initials(p.name)}</span>
                <div className="min-w-0">
                    {/* The name is the row's one link; its stretched area opens the panel from anywhere on the row. */}
                    <button type="button" onClick={onOpen} className={cn('block max-w-full truncate text-left text-sm font-semibold outline-none after:absolute after:inset-0 after:content-[\'\'] focus-visible:underline', tx.ink)}>
                        {p.name}{isSelf && <span className={cn('ml-1.5 text-[12px] font-medium', tx.muted)}>(you)</span>}
                    </button>
                    <p className={cn('truncate text-[12.5px]', tx.muted)}>{p.email}</p>
                </div>
            </div>
            <div className="col-start-1 min-w-0 pl-12 lg:col-start-auto lg:pl-0">
                <p className={cn('text-[13px] font-medium', tx.ink)} title={role.summary}>{role.label}</p>
            </div>
            <p className={cn('col-start-1 hidden min-w-0 items-center gap-1.5 truncate text-[13px] lg:col-start-auto lg:flex', tx.ink)}>
                {p.company_name ? (<>{showCompany && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getCompanyTheme(p.company_name).primary }} aria-hidden />}{p.company_name}</>) : <span className={tx.muted}>No company</span>}
            </p>
            <div className="col-start-1 min-w-0 pl-12 lg:col-start-auto lg:pl-0">
                {p.open === 0 ? <span className={cn('text-[13px]', tx.muted)}>No open tasks</span> : (
                    <span className="flex items-center gap-2">
                        <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-line dark:bg-slate-800" aria-hidden>
                            <span className="flex h-full" style={{ width: `${(p.open / maxOpen) * 100}%` }}>
                                <span className="h-full bg-slate-600 dark:bg-slate-300" style={{ width: `${((p.open - p.overdue) / p.open) * 100}%` }} />
                                <span className="h-full bg-blocked dark:bg-red-400" style={{ width: `${(p.overdue / p.open) * 100}%` }} />
                            </span>
                        </span>
                        <span className={cn('whitespace-nowrap text-[13px] tabular-nums', tx.ink)}>
                            <span className="font-semibold">{p.open}</span> open{p.overdue > 0 && <span className="text-blocked dark:text-red-300"> · {p.overdue} late</span>}
                        </span>
                    </span>
                )}
            </div>
            <p className={cn('hidden text-[13px] lg:block', tx.muted)}>
                {p.lastActivity ? ago(p.lastActivity) : <><span aria-hidden>—</span><span className="sr-only">No activity recorded</span></>}
            </p>
            <div className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-auto lg:row-span-1 lg:row-start-auto lg:justify-start">
                {p.access === 'unknown' ? <span className={cn('text-[13px]', tx.muted)}>—</span> : (
                    // Red lives in the summary bar; on rows the Invite button is the call to action.
                    <span className={cn('text-[13px]', blockedOut ? tx.muted : cn('font-medium', tx.ink))}>{ACCESS[p.access].label}</span>
                )}
                {blockedOut && (
                    <button type="button" onClick={onInvite} className="relative z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-[7px] border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" aria-label={`Invite ${p.name}`}>
                        <UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite
                    </button>
                )}
            </div>
        </li>
    );
}

function InvitesCard({ invites }: { invites: Invite[] }) {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = async (inv: Invite, what: 'link' | 'message') => {
        const link = inviteLink(inv.token);
        const text = what === 'link' ? link : inviteMessage({ name: inv.name, role: inv.role, company: inv.company_name }, link, inv.expires_at);
        try { await navigator.clipboard.writeText(text); setCopied(inv.id + what); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard blocked */ }
    };
    return (
        <Card aria-labelledby="inv-heading">
            <CardHeader id="inv-heading" icon={Mail} title="Invites waiting" count={invites.length} />
            <ul className="divide-y divide-line border-t border-line dark:divide-slate-800 dark:border-slate-800">
                {invites.map(inv => {
                    const exp = expiry(inv.expires_at);
                    return (
                        <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                            <div className="min-w-0 flex-1">
                                <p className={cn('truncate text-sm font-semibold', tx.ink)}>{inv.name || inv.email}</p>
                                <p className={cn('truncate text-[12.5px]', tx.muted)}>
                                    {inv.name ? `${inv.email} · ` : ''}{ROLES[inv.role]?.label ?? inv.role}{inv.company_name ? ` · ${inv.company_name}` : ''}
                                </p>
                            </div>
                            <p className={cn('text-[12.5px]', exp?.expired ? 'font-semibold text-blocked dark:text-red-300' : tx.muted)}>
                                Sent {ago(inv.created_at).toLowerCase()}{inv.invited_by_name ? ` by ${inv.invited_by_name}` : ''}{exp ? ` · ${exp.text}` : ''}
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => copy(inv, 'link')} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-line px-2.5 text-[12px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100" aria-label={`Copy invite link for ${inv.name || inv.email}`}>
                                    {copied === inv.id + 'link' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />} {copied === inv.id + 'link' ? 'Copied' : 'Link'}
                                </button>
                                <button type="button" onClick={() => copy(inv, 'message')} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-line px-2.5 text-[12px] font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100" aria-label={`Copy invite message for ${inv.name || inv.email}`}>
                                    {copied === inv.id + 'message' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <MessageSquareText className="h-3.5 w-3.5" aria-hidden />} {copied === inv.id + 'message' ? 'Copied' : 'Message'}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <p className="sr-only" role="status">{copied ? 'Copied to clipboard' : ''}</p>
        </Card>
    );
}
