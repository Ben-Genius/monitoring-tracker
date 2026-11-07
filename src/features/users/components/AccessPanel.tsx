import { KeyRound, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader } from '@/features/dashboard/components/primitives';
import { tx } from '@/features/dashboard/components/tokens';
import type { Access, Person } from '../hooks/usePeople';
import { ACCESS, ACCESS_ORDER } from '../utils/people';

// Shades step from ink to pale so the bar reads as one path, not four categories.
// Only "No login yet" earns red: it is the one state that blocks someone from working.
const SHADE: Record<Exclude<Access, 'unknown'>, string> = {
    signed_in: 'bg-ink dark:bg-slate-100',
    quiet: 'bg-slate-500 dark:bg-slate-400',
    invited: 'bg-slate-300 dark:bg-slate-600',
    no_login: 'bg-blocked dark:bg-red-400',
    // Deactivation is a decision, not a problem, so it stays neutral and striped.
    deactivated: 'bg-[repeating-linear-gradient(45deg,#8A939D_0_3px,transparent_3px_6px)] dark:bg-[repeating-linear-gradient(45deg,#94A3B8_0_3px,transparent_3px_6px)]',
};

interface Props {
    people: Person[];
    known: boolean;
    isAdmin: boolean;
    filter: Access | null;
    onFilter: (a: Access | null) => void;
}

function byCompany(people: Person[]) {
    const m = new Map<string, number>();
    people.filter(p => p.access === 'no_login').forEach(p => m.set(p.company_name ?? 'No company', (m.get(p.company_name ?? 'No company') ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Who can actually get into Pulse360, as one bar from "signed in" to "cannot sign in". */
export default function AccessPanel({ people, known, isAdmin, filter, onFilter }: Props) {
    const counts = Object.fromEntries(ACCESS_ORDER.map(a => [a, people.filter(p => p.access === a).length])) as Record<Access, number>;
    // Deactivated only joins the legend once someone is deactivated.
    const legend = ACCESS_ORDER.filter(a => a !== 'deactivated' || counts.deactivated > 0);
    const total = people.length || 1;
    const blocked = counts.no_login;

    return (
        <Card aria-labelledby="access-heading" className="flex flex-col">
            <CardHeader id="access-heading" icon={KeyRound} title="Who can get in" />
            {!known ? (
                <div className="flex flex-1 items-start gap-3 border-t border-line px-5 py-5 text-sm dark:border-slate-800">
                    <Info className={cn('mt-0.5 h-4 w-4 shrink-0', tx.muted)} aria-hidden />
                    <div>
                        <p className={cn('font-semibold', tx.ink)}>Sign-in status is not available yet</p>
                        <p className={cn('mt-1', tx.muted)}>
                            A profile here does not always mean a login: people imported from Baserow cannot sign in until they are invited.
                            {isAdmin ? ' Apply the people_access database update to see who can get in.' : ' An admin can turn this on.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col border-t border-line px-5 pb-5 pt-4 dark:border-slate-800">
                    <p className={cn('text-[15px] leading-snug', tx.ink)}>
                        {blocked
                            ? <><span className="font-bold tabular-nums">{blocked} of {people.length}</span> people cannot sign in yet.</>
                            : <>Everyone here can sign in.</>}
                    </p>
                    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line dark:bg-slate-800" role="img"
                        aria-label={ACCESS_ORDER.map(a => `${ACCESS[a].label}: ${counts[a]}`).join(', ')}>
                        {ACCESS_ORDER.map(a => counts[a] > 0 && (
                            <span key={a} className={cn('h-full first:rounded-l-full last:rounded-r-full', SHADE[a as Exclude<Access, 'unknown'>])} style={{ width: `${(counts[a] / total) * 100}%` }} />
                        ))}
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-1.5">
                        {legend.map(a => {
                            const on = filter === a;
                            return (
                                <li key={a}>
                                    <button
                                        type="button"
                                        aria-pressed={on}
                                        disabled={!counts[a]}
                                        onClick={() => onFilter(on ? null : a)}
                                        title={ACCESS[a].hint}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-[8px] border px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress disabled:cursor-default disabled:opacity-60',
                                            on ? 'border-ink bg-paper dark:border-slate-200 dark:bg-slate-800' : 'border-transparent hover:border-line dark:hover:border-slate-700'
                                        )}
                                    >
                                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', SHADE[a as Exclude<Access, 'unknown'>])} aria-hidden />
                                        <span className={cn('min-w-0 flex-1 truncate', tx.ink)}>{ACCESS[a].label}</span>
                                        <span className={cn('font-semibold tabular-nums', tx.ink)}>{counts[a]}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {blocked > 0 && (
                        <div className="mt-4 border-t border-line pt-3 dark:border-slate-800">
                            <p className={cn('text-[12.5px] font-medium', tx.muted)}>Who needs an invite, by company</p>
                            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                {byCompany(people).map(([name, n]) => (
                                    <li key={name} className={cn('text-[13px]', tx.ink)}><span className="font-semibold tabular-nums">{n}</span> {name}</li>
                                ))}
                            </ul>
                            {filter !== 'no_login' && (
                                <button type="button" onClick={() => onFilter('no_login')} className="mt-2.5 text-[13px] font-semibold text-progress hover:underline dark:text-blue-300">
                                    Show the {blocked} who need an invite
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
