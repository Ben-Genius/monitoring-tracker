import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Copy, Check, Search, Briefcase, Mail, Shield, Activity } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn, getCompanyTheme } from '@/lib/utils';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    is_active: boolean;
    company?: {
        id: string;
        name: string;
    };
}

interface Company {
    id: string;
    name: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    token: string;
    created_at: string;
    company?: {
        name: string;
    };
}

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companiesFromStore = [] } = useCompanies();
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'lead',
        company_id: '',
    });

    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companiesFromStore.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companiesFromStore]);

    const theme = getCompanyTheme(currentCompanyName);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        let usersQuery = supabase.from('users').select('*, company:companies(id, name)').order('created_at', { ascending: false });
        let invitesQuery = supabase.from('pending_invites').select('*, company:companies(name)').eq('used', false);

        // Filter by company if lead
        if (!isAdmin && currentUser?.company_id) {
            usersQuery = usersQuery.eq('company_id', currentUser.company_id);
            invitesQuery = invitesQuery.eq('company_id', currentUser.company_id);
        }

        const { data: usersData } = await usersQuery;
        const { data: companiesData } = await supabase.from('companies').select('*');
        const { data: invitesData } = await invitesQuery;

        if (usersData) setUsers(usersData);
        if (companiesData) setCompanies(companiesData);
        if (invitesData) setInvites(invitesData);
        setLoading(false);
    }

    async function handleInvite() {
        if (!formData.email || !formData.company_id || !formData.name) return;

        try {
            const { data, error } = await supabase
                .from('pending_invites')
                .insert({
                    email: formData.email,
                    name: formData.name,
                    role: formData.role,
                    company_id: formData.company_id,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const link = `${window.location.origin}/signup?token=${data.token}`;
                setInviteLink(link);
                fetchData();
            }
        } catch (error) {
            console.error('Error creating invite:', error);
            alert('Failed to create invite');
        }
    }

    async function toggleUserStatus(userId: string, currentStatus: boolean) {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        } catch (error) {
            console.error('Error updating user status:', error);
            alert('Failed to update status');
        }
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompany = selectedCompanyFilter === 'all' || user.company_id === selectedCompanyFilter;
        return matchesSearch && matchesCompany;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Identity & Access</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Manage team members and roles for {currentCompanyName}</p>
                </div>
                <Button
                    className="font-black uppercase text-[10px] tracking-widest px-6 h-11 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    style={{ backgroundColor: theme.primary }}
                    onClick={() => {
                        // Pre-select company if lead
                        if (!isAdmin && currentUser?.company_id) {
                            setFormData(prev => ({ ...prev, company_id: currentUser.company_id }));
                        }
                        setIsDialogOpen(true);
                    }}
                >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" style={{ color: searchTerm ? theme.primary : undefined }} />
                    <Input
                        placeholder="Search operators..."
                        className="pl-10 h-12 bg-white border-slate-200 focus-visible:ring-primary/20"
                        style={{ '--tw-ring-color': theme.primary } as any}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {isAdmin && (
                    <div className="relative w-full sm:w-[240px] group">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <select
                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                            style={{ '--tw-ring-color': theme.primary } as any}
                            value={selectedCompanyFilter}
                            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                        >
                            <option value="all">All Organizations</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Provision Member</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">New System Access Request</p>
                            </div>
                            <button onClick={() => { setIsDialogOpen(false); setInviteLink(null); }} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!inviteLink ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Legal Name</label>
                                    <Input
                                        className="h-12 rounded-xl focus-visible:ring-primary/20"
                                        style={{ '--tw-ring-color': theme.primary } as any}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Full legal name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Email</label>
                                    <Input
                                        type="email"
                                        className="h-12 rounded-xl focus-visible:ring-primary/20"
                                        style={{ '--tw-ring-color': theme.primary } as any}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="institutional@domain.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clearance Level</label>
                                        <select
                                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                            style={{ '--tw-ring-color': theme.primary } as any}
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="lead">Project Lead</option>
                                            <option value="employee">Specialist</option>
                                            {isAdmin && <option value="admin">Administrator</option>}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization</label>
                                        <select
                                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                            style={{ '--tw-ring-color': theme.primary } as any}
                                            value={formData.company_id}
                                            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                        >
                                            <option value="">Select Division</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <Button
                                        className="h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/25"
                                        style={{ backgroundColor: theme.primary }}
                                        onClick={handleInvite}
                                    >
                                        Generate Access Link
                                    </Button>
                                    <Button variant="ghost" className="h-12 rounded-xl font-bold text-slate-400" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-8 bg-green-50 rounded-3xl border border-green-100/50 text-center animate-in zoom-in-95 duration-500">
                                    <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 transition-transform hover:rotate-6">
                                        <Shield className="h-8 w-8 text-green-500" />
                                    </div>
                                    <p className="text-lg font-black text-slate-900 tracking-tight mb-1">Provisioning Successful</p>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">System access token has been generated.</p>

                                    <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-inner group">
                                        <Input value={inviteLink} readOnly className="font-mono text-[10px] flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-slate-500" />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all"
                                            style={{ color: theme.primary }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(inviteLink);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                        >
                                            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-slate-900 shadow-xl shadow-slate-900/20"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        setInviteLink(null);
                                        setFormData({ email: '', name: '', role: 'lead', company_id: '' });
                                    }}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Users List */}
            <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-3xl overflow-hidden border-none">
                <CardHeader className="bg-slate-50/30 border-b border-slate-50 p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white shadow-sm" style={{ color: theme.primary }}>
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold text-slate-900 tracking-tight">Active Personnel</CardTitle>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Master Workforce Directory</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="px-5 py-2 rounded-full font-black text-[10px] bg-white border border-slate-100 shadow-sm text-slate-600 uppercase tracking-widest">{filteredUsers.length} Active</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-6 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center space-x-5">
                                        <Skeleton variant="circle" width={48} height={48} />
                                        <div className="space-y-3">
                                            <Skeleton variant="text" width={200} />
                                            <Skeleton variant="text" width={120} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-left">
                                        <th className="p-6 font-black text-[11px] text-slate-400 uppercase tracking-widest">Name & Verification</th>
                                        <th className="p-6 font-black text-[11px] text-slate-400 uppercase tracking-widest">Role Clearance</th>
                                        {isAdmin && <th className="p-6 font-black text-[11px] text-slate-400 uppercase tracking-widest">Associated Firm</th>}
                                        <th className="p-6 font-black text-[11px] text-slate-400 uppercase tracking-widest text-center">Security Status</th>
                                        <th className="p-6 font-black text-[11px] text-slate-400 uppercase tracking-widest text-right">Administrative</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/20 group transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-[11px] shadow-md transition-transform group-hover:scale-105"
                                                        style={{ backgroundColor: user.is_active ? theme.primary : '#94a3b8' }}
                                                    >
                                                        {user.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <div className="font-sans text-slate-900 text-base tracking-tight">{user.name}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Mail className="h-3 w-3 text-slate-300" />
                                                            <div className="text-xs font-mono text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <Badge variant="outline" className={cn(
                                                    "capitalize px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-md h-7",
                                                    user.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-100 shadow-sm shadow-purple-900/5" :
                                                        user.role === 'lead' ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm shadow-indigo-900/5" :
                                                            "bg-slate-50 text-slate-500 border-slate-100"
                                                )}
                                                    style={user.role === 'lead' ? { backgroundColor: `${theme.primary}10`, color: theme.primary, borderColor: `${theme.primary}20` } : undefined}
                                                >{user.role}</Badge>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2.5 font-semibold text-slate-600">
                                                        <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center">
                                                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                        </div>
                                                        {user.company?.name || 'Unassigned'}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    <Badge variant="secondary" className={cn(
                                                        "px-3 py-1 font-black text-[9px] uppercase tracking-widest h-7 rounded-md shadow-sm border",
                                                        user.is_active
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            : "bg-rose-50 text-rose-600 border-rose-100"
                                                    )}>
                                                        <Activity className="h-2.5 w-2.5 mr-1.5 animate-pulse" />
                                                        {user.is_active ? 'Active' : 'Locked'}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isAdmin && user.id !== currentUser?.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 px-4 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all",
                                                                user.is_active ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            )}
                                                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                                                        >
                                                            {user.is_active ? 'Terminate' : 'Restore Access'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan={5} className="p-16 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-6 shadow-inner">
                                                    <Users className="h-8 w-8 text-slate-300" />
                                                </div>
                                                <p className="font-black text-slate-900 text-xl tracking-tight">No Results Found</p>
                                                <p className="text-slate-500 font-medium mt-1">No personnel record matches your current search filters.</p>
                                            </div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invites Section - Only for Leads/Admins */}
            {invites.length > 0 && (
                <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-6 duration-700 border-none">
                    <CardHeader className="bg-slate-50/30 border-b border-slate-50 p-8">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm text-amber-500">
                                <Mail className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight">Pending Authorizations</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-left">
                                        <th className="p-6 font-semibold text-[11px] text-slate-400 uppercase tracking-widest">Awaiting Email</th>
                                        <th className="p-6 font-semibold text-[11px] text-slate-400 uppercase tracking-widest">Target Role</th>
                                        {isAdmin && <th className="p-6 font-semibold text-[11px] text-slate-400 uppercase tracking-widest">Entity</th>}
                                        <th className="p-6 font-semibold text-[11px] text-slate-400 uppercase tracking-widest text-right">Access Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invites.map(invite => (
                                        <tr key={invite.id} className="hover:bg-slate-50/20 transition-colors">
                                            <td className="p-6 text-slate-900 font-semibold tracking-tight">{invite.email}</td>
                                            <td className="p-6">
                                                <Badge variant="secondary" className="bg-slate-50 text-slate-400 px-3 py-1 font-black text-[9px] uppercase tracking-widest border border-slate-100">{invite.role}</Badge>
                                            </td>
                                            {isAdmin && <td className="p-6 text-slate-500 font-semibold">{invite.company?.name}</td>}
                                            <td className="p-6 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 px-6 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all hover:bg-primary/5 hover:text-primary"
                                                    style={{ '--tw-hover-text-primary': theme.primary } as any}
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/signup?token=${invite.token}`;
                                                        navigator.clipboard.writeText(link);
                                                        alert('Direct link secured and copied to clipboard.');
                                                    }}
                                                >
                                                    Copy Token
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
