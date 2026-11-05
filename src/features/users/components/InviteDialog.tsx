import { useEffect, useId, useState } from 'react';
import { AlertCircle, Check, Copy, MessageSquareText } from 'lucide-react';
import { DialogShell } from '@/components/ui/dialog-shell';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/permissions';
import { createInvite, inviteLink } from '../hooks/usePeople';
import { ROLES, ROLE_ORDER, expiry, inviteMessage } from '../utils/people';

export interface InviteDraft {
    name: string;
    email: string;
    role: Role;
    company_id: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    companies: { id: string; name: string }[];
    /** Roles this person may hand out (leads cannot create admins, for example). */
    allowedRoles: Role[];
    /** Locks the company for leads, who only invite into their own. */
    lockedCompanyId?: string | null;
    initial?: Partial<InviteDraft>;
}

const field = 'h-11 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-progress focus:ring-2 focus:ring-progress/20 disabled:bg-paper dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800';
const bad = 'border-blocked dark:border-red-400';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteDialog({ open, onClose, onCreated, companies, allowedRoles, lockedCompanyId, initial }: Props) {
    const ids = { name: useId(), email: useId(), company: useId() };
    const blank: InviteDraft = { name: '', email: '', role: 'employee', company_id: lockedCompanyId ?? '' };
    const [draft, setDraft] = useState<InviteDraft>(blank);
    const [errors, setErrors] = useState<Partial<Record<keyof InviteDraft, string>>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [made, setMade] = useState<{ link: string; expires: string | null } | null>(null);
    const [copied, setCopied] = useState<'link' | 'message' | null>(null);

    useEffect(() => {
        if (!open) return;
        setDraft({ ...blank, ...initial, company_id: lockedCompanyId ?? initial?.company_id ?? '' });
        setErrors({}); setSaveError(null); setMade(null); setCopied(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const set = <K extends keyof InviteDraft>(k: K, v: InviteDraft[K]) => {
        setDraft(d => ({ ...d, [k]: v }));
        if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (!draft.name.trim()) next.name = 'Enter their full name.';
        if (!EMAIL.test(draft.email.trim())) next.email = 'Enter a work email like name@company.com.';
        if (!draft.company_id) next.company_id = 'Choose the company they work for.';
        setErrors(next);
        if (Object.keys(next).length) return;
        setSaving(true); setSaveError(null);
        try {
            const r = await createInvite(draft);
            setMade({ link: inviteLink(r.token), expires: r.expires_at });
            onCreated();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'The invite could not be created.');
        } finally {
            setSaving(false);
        }
    };

    const company = companies.find(c => c.id === draft.company_id)?.name ?? null;
    const copy = async (what: 'link' | 'message') => {
        if (!made) return;
        const text = what === 'link' ? made.link : inviteMessage({ name: draft.name, role: draft.role, company }, made.link, made.expires);
        try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); }
        catch { setSaveError('Copying was blocked by the browser. Select the link and copy it by hand.'); }
    };

    return (
        <DialogShell
            open={open}
            onClose={onClose}
            title={made ? `Invite ready for ${draft.name.split(' ')[0]}` : 'Invite someone'}
            description={made ? 'Send them the link. They choose a password and can sign in straight away.' : 'Creates a single-use signup link. Nothing is emailed automatically.'}
            className="max-w-xl"
        >
            {made ? (
                <div className="space-y-4 p-6">
                    <div className="rounded-[10px] border border-line bg-paper p-3 dark:border-slate-800 dark:bg-slate-950">
                        <label htmlFor="invite-link" className="text-[12.5px] font-semibold text-ink-muted dark:text-slate-400">Signup link</label>
                        <input id="invite-link" readOnly value={made.link} onFocus={e => e.target.select()} className="mt-1 w-full truncate bg-transparent font-mono text-[13px] text-ink outline-none dark:text-slate-100" />
                        {expiry(made.expires) && <p className="mt-1 text-[12.5px] text-ink-muted dark:text-slate-400">{expiry(made.expires)!.text}</p>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => copy('link')} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-line bg-surface text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                            {copied === 'link' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied === 'link' ? 'Link copied' : 'Copy link'}
                        </button>
                        <button type="button" onClick={() => copy('message')} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-ink text-sm font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink">
                            {copied === 'message' ? <Check className="h-4 w-4" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />} {copied === 'message' ? 'Message copied' : 'Copy a ready-to-send message'}
                        </button>
                    </div>
                    <p className="sr-only" role="status">{copied ? `${copied === 'link' ? 'Link' : 'Message'} copied` : ''}</p>
                    {saveError && <p role="alert" className="text-sm text-blocked dark:text-red-300">{saveError}</p>}
                    <div className="flex justify-end border-t border-line pt-4 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-[8px] border border-line px-4 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:text-slate-100">Done</button>
                    </div>
                </div>
            ) : (
                <form onSubmit={submit} noValidate className="space-y-5 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor={ids.name} className="block text-sm font-semibold text-ink dark:text-slate-100">Full name</label>
                            <input id={ids.name} autoComplete="off" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ama Owusu" aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? `${ids.name}-e` : undefined} className={cn(field, errors.name && bad)} />
                            {errors.name && <p id={`${ids.name}-e`} className="text-[12.5px] font-medium text-blocked dark:text-red-300">{errors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor={ids.email} className="block text-sm font-semibold text-ink dark:text-slate-100">Work email</label>
                            <input id={ids.email} type="email" inputMode="email" autoComplete="off" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? `${ids.email}-e` : undefined} className={cn(field, errors.email && bad)} />
                            {errors.email && <p id={`${ids.email}-e`} className="text-[12.5px] font-medium text-blocked dark:text-red-300">{errors.email}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor={ids.company} className="block text-sm font-semibold text-ink dark:text-slate-100">Company</label>
                        <select id={ids.company} value={draft.company_id} disabled={!!lockedCompanyId} onChange={e => set('company_id', e.target.value)} aria-invalid={!!errors.company_id || undefined} aria-describedby={errors.company_id ? `${ids.company}-e` : undefined} className={cn(field, errors.company_id && bad)}>
                            <option value="">Choose a company</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.company_id && <p id={`${ids.company}-e`} className="text-[12.5px] font-medium text-blocked dark:text-red-300">{errors.company_id}</p>}
                    </div>

                    {/* Role as described choices: what someone can do matters more than the job title. */}
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-ink dark:text-slate-100">What can they do?</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {ROLE_ORDER.filter(r => allowedRoles.includes(r)).map(r => {
                                const on = draft.role === r;
                                return (
                                    <label key={r} className={cn(
                                        'flex cursor-pointer gap-3 rounded-[10px] border p-3 transition-colors focus-within:ring-2 focus-within:ring-progress',
                                        on ? 'border-ink bg-paper dark:border-slate-200 dark:bg-slate-800' : 'border-line hover:border-ink/30 dark:border-slate-700 dark:hover:border-slate-500'
                                    )}>
                                        <input type="radio" name="role" value={r} checked={on} onChange={() => set('role', r)} aria-labelledby={`role-${r}`} aria-describedby={`role-${r}-can`} className="mt-1 h-4 w-4 accent-[#17202B] dark:accent-white" />
                                        <span className="min-w-0">
                                            <span id={`role-${r}`} className="block text-sm font-semibold text-ink dark:text-slate-100">{ROLES[r].label}</span>
                                            <span id={`role-${r}-can`} className="block text-[12.5px] text-ink-muted dark:text-slate-400">{ROLES[r].can.join(' · ')}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    {saveError && (
                        <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {saveError}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-line pt-5 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-[8px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">Cancel</button>
                        <button type="submit" disabled={saving} className="inline-flex h-10 items-center rounded-[8px] bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60 dark:bg-white dark:text-ink">
                            {saving ? 'Creating link…' : 'Create invite link'}
                        </button>
                    </div>
                </form>
            )}
        </DialogShell>
    );
}
