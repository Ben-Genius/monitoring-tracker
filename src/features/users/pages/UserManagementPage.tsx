import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Copy, Check, Search, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';

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

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: usersData } = await supabase.from('users').select('*, company:companies(id, name)').order('created_at', { ascending: false });
        const { data: companiesData } = await supabase.from('companies').select('*');
        const { data: invitesData } = await supabase.from('pending_invites').select('*, company:companies(name)').eq('used', false);

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage team members, roles, and access</p>
                </div>
                <Button onClick={() => {
                    // Pre-select company if lead
                    if (!isAdmin && currentUser?.company_id) {
                        setFormData(prev => ({ ...prev, company_id: currentUser.company_id }));
                    }
                    setIsDialogOpen(true);
                }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {isAdmin && (
                    <div className="relative w-full sm:w-[200px]">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={selectedCompanyFilter}
                            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                        >
                            <option value="all">All Companies</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Invite New User</h2>
                            <button onClick={() => { setIsDialogOpen(false); setInviteLink(null); }} className="text-gray-400 hover:text-gray-600">
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!inviteLink ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role</label>
                                    <select
                                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="lead">Lead</option>
                                        <option value="employee">Employee</option>
                                        {isAdmin && <option value="admin">Admin</option>}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Company</label>
                                    <select
                                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                                        value={formData.company_id}
                                        onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                        disabled={!isAdmin} // Leads can't change company
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleInvite}>Create Invite Link</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                                    <div className="mx-auto w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <p className="text-sm text-green-700 font-medium mb-1">Invite Created Successfully!</p>
                                    <p className="text-xs text-green-600 mb-4">Share this link with user to sign up.</p>

                                    <div className="flex items-center space-x-2 bg-white p-1 rounded border">
                                        <Input value={inviteLink} readOnly className="font-mono text-xs flex-1 border-0 shadow-none focus-visible:ring-0" />
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                            navigator.clipboard.writeText(inviteLink);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}>
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <Button onClick={() => {
                                        setIsDialogOpen(false);
                                        setInviteLink(null);
                                        setFormData({ email: '', name: '', role: 'lead', company_id: '' });
                                    }}>Done</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Users List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-primary" />
                            <CardTitle>Team Members</CardTitle>
                        </div>
                        <Badge variant="secondary">{filteredUsers.length} Users</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <Skeleton variant="circle" width={40} height={40} />
                                        <div className="space-y-2">
                                            <Skeleton variant="text" width={150} />
                                            <Skeleton variant="text" width={100} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-left">
                                        <th className="p-4 font-medium text-gray-500">Name / Email</th>
                                        <th className="p-4 font-medium text-gray-500">Role</th>
                                        <th className="p-4 font-medium text-gray-500">Company</th>
                                        <th className="p-4 font-medium text-gray-500">Status</th>
                                        <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50">
                                            <td className="p-4">
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={cn(
                                                    "capitalize font-normal",
                                                    user.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                        user.role === 'lead' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-gray-50 text-gray-700"
                                                )}>{user.role}</Badge>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="h-3 w-3" />
                                                    {user.company?.name || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="secondary" className={cn(
                                                    "font-normal",
                                                    user.is_active
                                                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                        : "bg-red-100 text-red-700 hover:bg-red-100"
                                                )}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isAdmin && user.id !== currentUser?.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={user.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                                                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                                                        >
                                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found matching your criteria</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invites Section - Only for Leads/Admins */}
            {invites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending Invites</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-left">
                                        <th className="p-4 font-medium text-gray-500">Email</th>
                                        <th className="p-4 font-medium text-gray-500">Role</th>
                                        <th className="p-4 font-medium text-gray-500">Company</th>
                                        <th className="p-4 font-medium text-gray-500 text-right">Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invites.map(invite => (
                                        <tr key={invite.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 text-gray-900">{invite.email}</td>
                                            <td className="p-4"><Badge variant="secondary" className="bg-gray-100 text-gray-600">{invite.role}</Badge></td>
                                            <td className="p-4 text-gray-500">{invite.company?.name}</td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                                                    const link = `${window.location.origin}/signup?token=${invite.token}`;
                                                    navigator.clipboard.writeText(link);
                                                    alert('Link copied to clipboard!');
                                                }}>
                                                    Copy Link
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
