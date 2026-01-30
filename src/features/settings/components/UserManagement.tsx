import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Copy, Check } from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    company?: {
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
}

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        const { data: usersData } = await supabase.from('users').select('*, company:companies(name)');
        const { data: companiesData } = await supabase.from('companies').select('*');
        const { data: invitesData } = await supabase.from('pending_invites').select('*').eq('used', false);

        if (usersData) setUsers(usersData);
        if (companiesData) setCompanies(companiesData);
        if (invitesData) setInvites(invitesData);
        setLoading(false);
    }

    async function handleInvite() {
        if (!formData.email || !formData.company_id || !formData.name) return;

        try {
            // Generate link manually since we can't depend on return value alone to have full URL
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



    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>User Management</CardTitle>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                </Button>
            </CardHeader>
            <CardContent>
                {/* Custom Modal Overlay */}
                {isDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold">Invite New User</h2>
                                <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email Address</label>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@example.com"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="lead">Lead</option>
                                                <option value="employee">Employee</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Company</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={formData.company_id}
                                                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                            >
                                                <option value="">Select Company</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
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
                                        <p className="text-xs text-green-600 mb-4">Share this link with the user to let them sign up.</p>

                                        <div className="flex items-center space-x-2 bg-white p-1 rounded border">
                                            <Input value={inviteLink} readOnly className="font-mono text-xs flex-1 border-0 focus-visible:ring-0" />
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

                <div className="space-y-8">
                    {/* Active Users */}
                    <div>
                        <h3 className="text-sm font-medium mb-3 text-gray-700">Active Users</h3>
                        <div className="border rounded-md overflow-hidden bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr className="text-left">
                                            <th className="p-3 font-medium text-gray-500">Name</th>
                                            <th className="p-3 font-medium text-gray-500">Role</th>
                                            <th className="p-3 font-medium text-gray-500">Company</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50/50">
                                                <td className="p-3">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className="capitalize font-normal">{user.role}</Badge>
                                                </td>
                                                <td className="p-3 text-gray-600">{user.company?.name || '-'}</td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && !loading && (
                                            <tr><td colSpan={3} className="p-6 text-center text-gray-500">No users found</td></tr>
                                        )}
                                        {loading && users.length === 0 && (
                                            <tr><td colSpan={3} className="p-6 text-center text-gray-500">Loading users...</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium mb-3 text-gray-700">Pending Invites</h3>
                            <div className="border rounded-md overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr className="text-left">
                                                <th className="p-3 font-medium text-gray-500">Email</th>
                                                <th className="p-3 font-medium text-gray-500">Role</th>
                                                <th className="p-3 font-medium text-gray-500 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {invites.map(invite => (
                                                <tr key={invite.id} className="hover:bg-gray-50/50">
                                                    <td className="p-3 text-gray-900">{invite.email}</td>
                                                    <td className="p-3"><Badge variant="secondary" className="capitalize font-normal bg-gray-100 text-gray-700">{invite.role}</Badge></td>
                                                    <td className="p-3 text-right">
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
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
