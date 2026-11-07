import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/permissions';

/** Where a person stands on getting into Pulse360. */
export type Access =
    | 'signed_in'   // has a login and used it in the last 14 days
    | 'quiet'       // has a login but has not used it lately
    | 'invited'     // no login yet, an invite link is waiting
    | 'no_login'    // no login and no invite: they cannot get in
    | 'deactivated' // an admin turned their access off
    | 'unknown';    // the access check is not installed, so we do not guess

export interface Invite {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    token: string;
    company_id: string | null;
    company_name: string | null;
    created_at: string;
    expires_at: string | null;
    invited_by_name: string | null;
}

export interface Person {
    id: string;
    name: string;
    email: string;
    role: Role;
    company_id: string | null;
    company_name: string | null;
    created_at: string | null;
    open: number;
    blocked: number;
    overdue: number;
    doneLast30: number;
    lastActivity: string | null;
    activity: { summary: string; created_at: string }[];
    access: Access;
    lastSignIn: string | null;
    deactivatedAt: string | null;
    invite: Invite | null;
}

export interface PeopleData {
    people: Person[];
    invites: Invite[];
    companies: { id: string; name: string }[];
    /** False until the people_access() migration is applied. */
    accessKnown: boolean;
    /** False until the deactivation migration is applied; hides the controls rather than offering a broken one. */
    deactivationAvailable: boolean;
    unassignedOpen: number;
}

const DAY = 86_400_000;
const RECENT_SIGN_IN_DAYS = 14;

interface Options { companyId?: string | null; enabled?: boolean }

export function usePeople({ companyId, enabled = true }: Options) {
    return useQuery({
        queryKey: ['people', companyId ?? 'all'],
        enabled,
        queryFn: async (): Promise<PeopleData> => {
            let usersQ = supabase.from('users').select('id, name, email, role, company_id, created_at, company:companies(name)').order('name');
            let invitesQ = supabase.from('pending_invites').select('id, name, email, role, token, company_id, created_at, expires_at, invited_by, company:companies(name)').eq('used', false).order('created_at', { ascending: false });
            if (companyId) {
                usersQ = usersQ.eq('company_id', companyId);
                invitesQ = invitesQ.eq('company_id', companyId);
            }
            const since = new Date(Date.now() - 90 * DAY).toISOString();

            const [usersR, invitesR, companiesR, tasksR, auditR, accessR] = await Promise.all([
                usersQ,
                invitesQ,
                supabase.from('companies').select('id, name').order('name'),
                supabase.from('tasks').select('assignee_id, stage, due_date, completed_at, project:projects(company_id), company_id').is('archived_at', null),
                supabase.from('audit_log').select('user_id, summary, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(4000),
                supabase.rpc('people_access'),
            ]);
            if (usersR.error) throw usersR.error;
            if (invitesR.error) throw invitesR.error;

            type Row = { id: string; name: string; email: string; role: Role; company_id: string | null; created_at: string | null; company: { name: string } | null };
            const users = (usersR.data ?? []) as unknown as Row[];
            const byId = new Map(users.map(u => [u.id, u]));
            const now = Date.now();

            // Missing function (migration not applied) or no permission: say "unknown", never guess.
            type AccessRow = { user_id: string; has_login: boolean; last_sign_in_at: string | null; deactivated_at?: string | null };
            const accessRows = accessR.error ? null : (accessR.data as AccessRow[]);
            // The newer function also returns deactivated_at; its presence means set_user_access exists too.
            const deactivationAvailable = !!accessRows?.length && 'deactivated_at' in accessRows[0];
            const access = new Map(accessRows?.map(a => [a.user_id, a]) ?? []);

            type InviteRow = Omit<Invite, 'company_name' | 'invited_by_name'> & { invited_by: string | null; company: { name: string } | null };
            const invites: Invite[] = ((invitesR.data ?? []) as unknown as InviteRow[]).map(i => ({
                ...i,
                company_name: i.company?.name ?? null,
                invited_by_name: i.invited_by ? byId.get(i.invited_by)?.name ?? null : null,
            }));
            const inviteByEmail = new Map(invites.map(i => [i.email.toLowerCase(), i]));

            type TaskRow = { assignee_id: string | null; stage: string; due_date: string | null; completed_at: string | null; company_id: string | null; project: { company_id: string } | null };
            const tasks = (tasksR.data ?? []) as unknown as TaskRow[];
            const load = new Map<string, { open: number; blocked: number; overdue: number; done: number }>();
            let unassignedOpen = 0;
            for (const t of tasks) {
                const inScope = !companyId || (t.project?.company_id ?? t.company_id) === companyId;
                if (!inScope) continue;
                const open = t.stage !== 'completed';
                if (!t.assignee_id) { if (open) unassignedOpen++; continue; }
                const l = load.get(t.assignee_id) ?? { open: 0, blocked: 0, overdue: 0, done: 0 };
                if (open) {
                    l.open++;
                    if (t.stage === 'blockers') l.blocked++;
                    if (t.due_date && new Date(t.due_date).getTime() < now) l.overdue++;
                } else if (t.completed_at && now - new Date(t.completed_at).getTime() < 30 * DAY) {
                    l.done++;
                }
                load.set(t.assignee_id, l);
            }

            const activity = new Map<string, { summary: string; created_at: string }[]>();
            for (const a of (auditR.data ?? []) as { user_id: string | null; summary: string; created_at: string }[]) {
                if (!a.user_id) continue;
                const list = activity.get(a.user_id) ?? [];
                if (list.length < 5) list.push({ summary: a.summary, created_at: a.created_at });
                activity.set(a.user_id, list);
            }

            const people: Person[] = users.map(u => {
                const l = load.get(u.id) ?? { open: 0, blocked: 0, overdue: 0, done: 0 };
                const acts = activity.get(u.id) ?? [];
                const a = access.get(u.id);
                const invite = inviteByEmail.get(u.email.toLowerCase()) ?? null;
                let state: Access = 'unknown';
                if (accessRows) {
                    if (a?.deactivated_at) {
                        state = 'deactivated';
                    } else if (a?.has_login) {
                        const recent = a.last_sign_in_at && now - new Date(a.last_sign_in_at).getTime() < RECENT_SIGN_IN_DAYS * DAY;
                        state = recent ? 'signed_in' : 'quiet';
                    } else {
                        state = invite ? 'invited' : 'no_login';
                    }
                }
                return {
                    id: u.id, name: u.name, email: u.email, role: u.role, company_id: u.company_id,
                    company_name: u.company?.name ?? null, created_at: u.created_at,
                    open: l.open, blocked: l.blocked, overdue: l.overdue, doneLast30: l.done,
                    lastActivity: acts[0]?.created_at ?? null, activity: acts,
                    access: state, lastSignIn: a?.last_sign_in_at ?? null, deactivatedAt: a?.deactivated_at ?? null, invite,
                };
            });

            return {
                people,
                invites,
                companies: (companiesR.data ?? []) as { id: string; name: string }[],
                accessKnown: !!accessRows,
                deactivationAvailable,
                unassignedOpen,
            };
        },
    });
}

/** Creates a single-use signup link. Throws a readable message on failure. */
export async function createInvite(input: { name: string; email: string; role: Role; company_id: string }) {
    const { data, error } = await supabase
        .from('pending_invites')
        .insert({ name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, company_id: input.company_id })
        .select('id, token, expires_at')
        .single();
    if (error) {
        const msg = error.message ?? '';
        throw new Error(
            /duplicate/i.test(msg) ? 'This email already has an invite waiting. Copy that link from the Invites list instead.'
                : /fetch|network|failed to/i.test(msg) ? 'Pulse360 could not reach the server, so no invite was made. Check your connection and try again.'
                    : /permission|policy|denied/i.test(msg) ? 'Your role cannot invite into this company. Ask an admin.'
                        : 'The invite could not be created. Check the details and try again.'
        );
    }
    return data as { id: string; token: string; expires_at: string | null };
}

/** Turns a person's sign-in off or back on. The database enforces who may do this. */
export async function setUserAccess(userId: string, active: boolean) {
    const { error } = await supabase.rpc('set_user_access', { p_user: userId, p_active: active });
    if (error) {
        const msg = error.message ?? '';
        throw new Error(
            /own account/i.test(msg) ? 'You cannot deactivate your own account.'
                : /one admin/i.test(msg) ? 'At least one admin must keep access, so this admin cannot be deactivated.'
                    : /only an admin/i.test(msg) ? 'Only an admin can change who can sign in.'
                        : /fetch|network|failed to/i.test(msg) ? 'Pulse360 could not reach the server, so nothing changed. Try again.'
                            : 'Access could not be changed. Try again.'
        );
    }
}

export const inviteLink = (token: string) => `${window.location.origin}/signup?token=${token}`;
