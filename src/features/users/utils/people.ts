import type { Role } from '@/lib/permissions';
import type { Access, Person } from '../hooks/usePeople';

export const ROLES: Record<Role, { label: string; summary: string; can: string[] }> = {
    admin: {
        label: 'Admin',
        summary: 'Runs the system',
        can: ['Sees every company', 'Invites people and changes settings', 'Approves work'],
    },
    executive: {
        label: 'Executive',
        summary: 'Reads the morning brief',
        can: ['Sees every company', 'Reads the brief the PA prepares', 'Cannot change settings'],
    },
    pa: {
        label: 'Executive PA',
        summary: 'Prepares the brief',
        can: ['Sees every company', 'Curates the daily brief', 'Creates and chases tasks'],
    },
    lead: {
        label: 'Project lead',
        summary: 'Runs projects in one company',
        can: ['Sees their own company', 'Creates and assigns tasks', 'Approves work'],
    },
    employee: {
        label: 'Staff',
        summary: 'Works on assigned tasks',
        can: ['Sees their own tasks', 'Posts updates and proof', 'Cannot assign work'],
    },
};

export const ROLE_ORDER: Role[] = ['admin', 'executive', 'pa', 'lead', 'employee'];

export const ACCESS: Record<Access, { label: string; hint: string }> = {
    signed_in: { label: 'Signed in recently', hint: 'Used their login in the last 14 days' },
    quiet: { label: 'Has a login, quiet', hint: 'Has a login but has not signed in for 14+ days' },
    invited: { label: 'Invite waiting', hint: 'An invite link exists but has not been used' },
    no_login: { label: 'No login yet', hint: 'Added to Pulse360 but cannot sign in until invited' },
    unknown: { label: 'Not checked', hint: 'Sign-in status needs the access check installed' },
};

export const ACCESS_ORDER: Access[] = ['signed_in', 'quiet', 'invited', 'no_login'];

export function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const DAY = 86_400_000;

/** "Today", "Yesterday", "4 days ago", "3 weeks ago", then a date. */
export function ago(iso: string | null, empty = 'Never') {
    if (!iso) return empty;
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 14) return `${days} days ago`;
    if (days < 60) return `${Math.round(days / 7)} weeks ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Expires in 3 days" / "Expired 2 days ago" / null when no expiry is set. */
export function expiry(iso: string | null) {
    if (!iso) return null;
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
    if (days < 0) return { text: `Expired ${-days === 1 ? 'yesterday' : `${-days} days ago`}`, expired: true };
    if (days === 0) return { text: 'Expires today', expired: false };
    return { text: `Expires in ${days} ${days === 1 ? 'day' : 'days'}`, expired: false };
}

export function inviteMessage(p: { name: string | null; role: Role; company: string | null }, link: string, expires: string | null) {
    const first = p.name?.trim().split(/\s+/)[0];
    const exp = expires ? ` The link works until ${new Date(expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` : '';
    return `Hi${first ? ` ${first}` : ''}, you have been added to Pulse360 as ${ROLES[p.role]?.label ?? p.role}${p.company ? ` for ${p.company}` : ''}. Set up your login here: ${link}${exp}`;
}

/** Workload in plain words, used by the table and the person panel. */
export function loadLabel(p: Person) {
    if (!p.open) return 'No open tasks';
    return `${p.open} open${p.overdue ? `, ${p.overdue} overdue` : ''}${p.blocked ? `, ${p.blocked} blocked` : ''}`;
}
