import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Building2, Database, Moon, Sun, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, useAuthStore } from '@/features/auth/hooks/useAuth';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useTheme } from '@/contexts/ThemeContext';
import { canAdminister } from '@/lib/permissions';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';

/**
 * Only settings that do something. The previous page had a hard-coded company
 * name, a time-zone list, notification checkboxes and "Backup now"/"Add
 * company" buttons that saved nothing.
 */
export default function SettingsPage() {
    const { user } = useAuth();
    const checkSession = useAuthStore(s => s.checkSession);
    const { data: companies = [] } = useCompanies();
    const { theme, toggleTheme } = useTheme();
    const isAdmin = canAdminister(user);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const phoneOnUser = (user as unknown as { phone?: string | null })?.phone ?? '';

    useEffect(() => { setName(user?.name ?? ''); setPhone(phoneOnUser); }, [user?.name, phoneOnUser]);

    const dirty = !!user && (name.trim() !== user.name || phone.trim() !== phoneOnUser);
    const companyName = companies.find(c => c.id === user?.company_id)?.name ?? '';

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('users').update({ name: name.trim(), phone: phone.trim() || null }).eq('id', user.id);
        setSaving(false);
        if (error) { toast.error(`Couldn't save: ${error.message}`); return; }
        await checkSession();
        toast.success('Profile saved');
    };

    return (
        <div className="w-full space-y-5 pb-12">
            <div>
                <h1 className="text-[26px] font-bold tracking-tight text-ink">Settings</h1>
                <p className="mt-0.5 text-sm text-ink-muted">Your profile and how the tracker looks for you.</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2 items-start">
                <Panel icon={UserRound} title="Your profile">
                    <form onSubmit={saveProfile} className="space-y-4">
                        <Field label="Name">
                            <input value={name} onChange={e => setName(e.target.value)} required
                                className="h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-progress" />
                        </Field>
                        <Field label="Phone" hint="Used by your PA or lead to reach you about a task.">
                            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+233 …"
                                className="h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-progress" />
                        </Field>
                        <dl className="grid grid-cols-3 gap-3 text-sm">
                            <div><dt className="text-[12px] text-ink-muted">Email</dt><dd className="truncate text-ink">{user?.email}</dd></div>
                            <div><dt className="text-[12px] text-ink-muted">Role</dt><dd className="text-ink">{roleLabel(user?.role)}</dd></div>
                            <div><dt className="text-[12px] text-ink-muted">Company</dt><dd className="text-ink">{companyName}</dd></div>
                        </dl>
                        <p className="text-[12px] text-ink-faint">Role and company are set by an admin.</p>
                        <button type="submit" disabled={!dirty || saving || !name.trim()}
                            className="h-10 rounded-[8px] bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
                            {saving ? 'Saving…' : 'Save profile'}
                        </button>
                    </form>
                </Panel>

                <div className="space-y-5">
                    <Panel icon={theme === 'light' ? Sun : Moon} title="Appearance">
                        <div className="inline-grid grid-cols-2 gap-1 rounded-[10px] border border-line p-1 text-sm font-semibold">
                            {(['light', 'dark'] as const).map(t => (
                                <button key={t} type="button" onClick={() => theme !== t && toggleTheme()}
                                    aria-pressed={theme === t}
                                    className={cn('rounded-[7px] px-4 py-2 capitalize', theme === t ? 'bg-ink text-white' : 'text-ink-muted')}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </Panel>

                    <Panel icon={Bell} title="What you're notified about">
                        <ul className="space-y-2 text-sm text-ink">
                            <li>A task is assigned to you.</li>
                            <li>A task you assigned moves, is blocked, changes progress or is accepted.</li>
                            <li>Someone marks a task as waiting on you.</li>
                            <li>Someone comments on your task, or Mr Blay leaves a note on it.</li>
                            {(user?.role === 'pa' || isAdmin) && <li>As PA: every movement, so you can prepare the morning brief.</li>}
                        </ul>
                        <p className="mt-3 text-[12px] text-ink-faint">Notifications appear under the bell. Email and phone alerts come with the mobile app.</p>
                    </Panel>
                </div>

                {isAdmin && (
                    <Panel icon={Building2} title="Companies">
                        <ul className="divide-y divide-line">
                            {companies.map((c: { id: string; name: string; description?: string | null }) => (
                                <li key={c.id} className="py-2.5">
                                    <p className="text-sm font-semibold text-ink">{c.name}</p>
                                    {c.description && <p className="text-[13px] text-ink-muted">{c.description}</p>}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 text-[12px] text-ink-faint">Adding a company is a database change; ask the developer.</p>
                    </Panel>
                )}

                {isAdmin && (
                    <Panel icon={Database} title="Data and backups">
                        <p className="text-sm text-ink">
                            Data is stored in Supabase. The free plan has no point-in-time restore, so move to Pro before go-live.
                            Usage and backups are shown in the Supabase dashboard.
                        </p>
                    </Panel>
                )}
            </div>
        </div>
    );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[12px] border border-line bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink"><Icon className="h-4 w-4 text-ink-faint" /> {title}</h2>
            {children}
        </section>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-ink">{label}</span>
            {children}
            {hint && <span className="block text-[12px] text-ink-faint">{hint}</span>}
        </label>
    );
}
