import { useEffect, useState, useId } from 'react';
import { toast } from 'react-hot-toast';
import {
    Bell,
    Building2,
    Database,
    Moon,
    Sun,
    UserRound,
    Settings,
    Mail,
    Phone,
    Lock,
    CheckCircle2,
    Shield,
    Sparkles,
    Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, useAuthStore } from '@/features/auth/hooks/useAuth';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { useTheme } from '@/contexts/ThemeContext';
import { canAdminister } from '@/lib/permissions';
import { roleLabel } from '@/lib/roles';
import { cn, getCompanyTheme, DEFAULT_BRAND_COLOR } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function SettingsPage() {
    const { user } = useAuth();
    const checkSession = useAuthStore(s => s.checkSession);
    const { data: companies = [] } = useCompanies();
    const { theme, setTheme } = useTheme();
    const isAdmin = canAdminister(user);

    const nameInputId = useId();
    const phoneInputId = useId();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const phoneOnUser = (user as unknown as { phone?: string | null })?.phone ?? '';

    useEffect(() => {
        setName(user?.name ?? '');
        setPhone(phoneOnUser);
    }, [user?.name, phoneOnUser]);

    const isDirty = !!user && (name.trim() !== (user.name ?? '') || phone.trim() !== phoneOnUser);
    const company = companies.find(c => c.id === user?.company_id);
    const companyName = company?.name ?? '';
    const companyTheme = companyName ? getCompanyTheme(companyName) : null;

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setSaving(true);
        const { error } = await supabase
            .from('users')
            .update({ name: name.trim(), phone: phone.trim() || null })
            .eq('id', user.id);

        setSaving(false);
        if (error) {
            toast.error(`Couldn't save profile: ${error.message}`);
            return;
        }

        await checkSession();
        toast.success('Profile updated successfully');
    };

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-16">
            {/* Page Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                        <Settings className="h-6 w-6" aria-hidden />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Settings & Preferences
                            </h1>
                            <Badge
                                variant="outline"
                                className="text-xs font-semibold px-2.5 py-0.5 border"
                                style={{
                                    color: DEFAULT_BRAND_COLOR,
                                    borderColor: `${DEFAULT_BRAND_COLOR}40`,
                                    backgroundColor: `${DEFAULT_BRAND_COLOR}10`
                                }}
                            >
                                {roleLabel(user?.role)}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Manage your personal profile, notification preferences, and workspace appearance.
                        </p>
                    </div>
                </div>

                {companyName && (
                    <div className="flex items-center gap-2 self-start sm:self-auto rounded-[8px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: companyTheme?.primary || DEFAULT_BRAND_COLOR }}
                            aria-hidden
                        />
                        <span>{companyName}</span>
                    </div>
                )}
            </header>

            <div className="grid gap-6 xl:grid-cols-2 items-start">
                {/* Column 1: Profile & Identity */}
                <div className="space-y-6">
                    <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <UserRound className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Your Profile
                                </CardTitle>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            {/* Profile Header Ribbon */}
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-line bg-paper/60 dark:border-slate-800 dark:bg-slate-800/40">
                                <div
                                    className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
                                    aria-hidden
                                >
                                    {getInitials(user?.name || user?.email || 'U')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {user?.name || 'Unnamed Member'}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                        <Mail className="h-3 w-3 shrink-0" />
                                        <span>{user?.email}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-brand/10 text-brand">
                                            {roleLabel(user?.role)}
                                        </span>
                                        {companyName && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                <span>·</span>
                                                <span className="truncate">{companyName}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Edit Form */}
                            <form onSubmit={saveProfile} className="space-y-4">
                                <div>
                                    <label htmlFor={nameInputId} className="block text-xs font-semibold text-ink dark:text-slate-200 mb-1">
                                        Full Name
                                    </label>
                                    <Input
                                        id={nameInputId}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        placeholder="Kwame Mensah"
                                        className="h-10 rounded-lg text-sm bg-surface dark:bg-slate-950"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor={phoneInputId} className="block text-xs font-semibold text-ink dark:text-slate-200">
                                            Phone Number
                                        </label>
                                        <span className="text-[11px] text-slate-400">Optional</span>
                                    </div>
                                    <div className="relative">
                                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                                        <Input
                                            id={phoneInputId}
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            type="tel"
                                            placeholder="+233 24 000 0000"
                                            className="h-10 rounded-lg pl-9 text-sm bg-surface dark:bg-slate-950 tabular-nums"
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                        Used by your PA or project lead for direct follow-ups.
                                    </p>
                                </div>

                                {/* Read-Only Attributes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="rounded-xl border border-line bg-paper/40 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                            <span>Email Address</span>
                                            <Lock className="h-3 w-3" aria-hidden />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate" title={user?.email}>
                                            {user?.email}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-line bg-paper/40 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                            <span>Access Clearance</span>
                                            <Shield className="h-3 w-3" aria-hidden />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            {roleLabel(user?.role)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-line dark:border-slate-800">
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        Email and role changes require administrator authorization.
                                    </p>
                                    <Button
                                        type="submit"
                                        disabled={!isDirty || saving || !name.trim()}
                                        className="h-9 px-4 rounded-[8px] text-xs font-semibold text-white shadow-sm disabled:opacity-40"
                                        style={{ backgroundColor: DEFAULT_BRAND_COLOR }}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                <span>Saving…</span>
                                            </>
                                        ) : (
                                            'Save Profile'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Admin Data & Infrastructure Panel */}
                    {isAdmin && (
                        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                    <Database className="h-4 w-4 text-slate-500" aria-hidden />
                                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        Data Infrastructure & Backups
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>
                                    Pulse360 data is persisted in Supabase PostgreSQL with real-time replication and continuous transaction logging.
                                </p>
                                <div className="rounded-xl border border-line bg-paper/50 dark:border-slate-800 dark:bg-slate-800/40 p-3.5 flex items-start gap-2.5">
                                    <Shield className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                                            Enterprise Backup Policy
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                            Point-in-time recovery and automated daily snapshots are managed via the Supabase cloud dashboard.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Column 2: Appearance & Notifications */}
                <div className="space-y-6">
                    {/* Appearance / Theme Selector */}
                    <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Workspace Appearance
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Choose your interface theme for high readability across daylight and night shifts.
                            </p>

                            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Theme selector">
                                {/* Light Mode Option */}
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === 'light'}
                                    onClick={() => setTheme('light')}
                                    className={cn(
                                        'flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                                        theme === 'light'
                                            ? 'border-brand bg-brand/5 shadow-sm ring-1 ring-brand/30 dark:bg-brand/10'
                                            : 'border-line bg-surface hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                                    )}
                                >
                                    <div className={cn(
                                        'h-10 w-10 rounded-full flex items-center justify-center',
                                        theme === 'light' ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    )}>
                                        <Sun className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Light Mode
                                        </span>
                                        <span className="block text-[11px] text-slate-400 mt-0.5">
                                            Crisp white & orange
                                        </span>
                                    </div>
                                </button>

                                {/* Dark Mode Option */}
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === 'dark'}
                                    onClick={() => setTheme('dark')}
                                    className={cn(
                                        'flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress',
                                        theme === 'dark'
                                            ? 'border-brand bg-brand/5 shadow-sm ring-1 ring-brand/30 dark:bg-brand/10'
                                            : 'border-line bg-surface hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                                    )}
                                >
                                    <div className={cn(
                                        'h-10 w-10 rounded-full flex items-center justify-center',
                                        theme === 'dark' ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    )}>
                                        <Moon className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Dark Mode
                                        </span>
                                        <span className="block text-[11px] text-slate-400 mt-0.5">
                                            High contrast slate
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications Policy Card */}
                    <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <Bell className="h-4 w-4 text-slate-500" aria-hidden />
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Notification Center
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                You receive real-time notifications in Pulse360 whenever:
                            </p>

                            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>A new project milestone or task is assigned to you.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>A task you created or lead moves, gets blocked, or is approved.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>An operator marks a dependency as waiting on your input.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Comments or executive notes are attached to your assigned items.</span>
                                </li>
                                {(user?.role === 'pa' || isAdmin) && (
                                    <li className="flex items-start gap-2.5 font-medium text-brand">
                                        <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                                        <span>Executive PA clearance: Real-time tracking across all portfolio ventures.</span>
                                    </li>
                                )}
                            </ul>

                            <p className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-line dark:border-slate-800">
                                Notifications appear under the bell in the top navigation.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Admin Companies Directory Panel */}
                    {isAdmin && (
                        <Card className="rounded-[14px] border border-line bg-surface shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="border-b border-line dark:border-slate-800 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Building2 className="h-4 w-4 text-slate-500" aria-hidden />
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                            Authorized Ventures
                                        </CardTitle>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                        {companies.length} units
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="divide-y divide-line dark:divide-slate-800">
                                    {companies.map((c: { id: string; name: string; description?: string | null }) => {
                                        const cTheme = getCompanyTheme(c.name);
                                        return (
                                            <li key={c.id} className="px-6 py-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: cTheme.primary }}
                                                            aria-hidden
                                                        />
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                            {c.name}
                                                        </p>
                                                    </div>
                                                    {c.description && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-4 mt-0.5">
                                                            {c.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    Active
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
