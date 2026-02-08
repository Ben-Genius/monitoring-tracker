import { useApprovals, useProcessApproval } from '../hooks/useApprovals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    User,
    Building2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDate, cn, getCompanyTheme } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';

import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: approvals, isLoading } = useApprovals(selectedCompanyId);
    const processApproval = useProcessApproval();
    const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    const isAdmin = user?.role === 'admin';

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        if (!user) return;
        try {
            const notes = adminNotes.trim() || (status === 'approved' ? 'Request verified and approved.' : 'Request declined after review.');
            await processApproval.mutateAsync({
                id,
                status,
                comments: notes
            });
            toast.success(status === 'approved' ? 'Approval granted successfully!' : 'Request declined.');
            setSelectedApproval(null);
            setAdminNotes('');
        } catch (error) {
            console.error('Failed to process approval:', error);
            toast.error('Failed to process request. Please try again.');
        }
    };

    const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];
    const processedApprovals = approvals?.filter(a => a.status !== 'pending') || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Approvals & Governance</h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Review and manage project transition requests from team leads.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{pendingApprovals.length}</p>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{processedApprovals.filter(a => a.status === 'approved').length}</p>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{processedApprovals.filter(a => a.status === 'rejected').length}</p>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Declined</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Pending Requests</h2>
                    {pendingApprovals.map((approval) => (
                        <Card key={approval.id} className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center">
                                                <FileText className="h-7 w-7 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 capitalize">
                                                    {approval.type.replace('_', ' ')}
                                                </h3>
                                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                                    {formatDate(approval.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="warning" className="px-3 py-1 font-bold uppercase text-xs">
                                            Pending Review
                                        </Badge>
                                    </div>

                                    {/* Project Details */}
                                    <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Building2 className="h-4 w-4" />
                                            <span className="font-bold text-sm">Project Details</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase">Project</p>
                                                    <p className="text-sm font-bold text-slate-900">{approval.project?.name || 'Unknown'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase">Requested By</p>
                                                    <p className="text-sm font-bold text-slate-900">{approval.requester?.name || 'Unknown'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Request Details */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Details</p>
                                        <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
                                            {approval.content || approval.comments || 'No details provided'}
                                        </p>
                                    </div>

                                    {/* Admin Actions */}
                                    {isAdmin && (
                                        <div className="space-y-4 pt-4 border-t border-slate-200">
                                            {selectedApproval === approval.id ? (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                                                            Admin Notes (Optional)
                                                        </label>
                                                        <textarea
                                                            placeholder="Add any notes or reasons for your decision..."
                                                            className="w-full min-h-[100px] resize-none rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                            value={adminNotes}
                                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedApproval(null);
                                                                setAdminNotes('');
                                                            }}
                                                            className="flex-1"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleAction(approval.id, 'rejected')}
                                                            className="flex-1"
                                                        >
                                                            <XCircle className="h-4 w-4 mr-2" />
                                                            Decline
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAction(approval.id, 'approved')}
                                                            className="flex-1"
                                                            style={{ backgroundColor: theme.primary }}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => setSelectedApproval(approval.id)}
                                                    className="w-full"
                                                    variant="outline"
                                                >
                                                    Review Request
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Processed Approvals */}
            {processedApprovals.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Recent Decisions</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {processedApprovals.slice(0, 5).map((approval) => (
                            <Card key={approval.id} className={cn(
                                "border-l-4",
                                approval.status === 'approved' ? "border-l-emerald-500" : "border-l-rose-500"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                                approval.status === 'approved' ? "bg-emerald-50" : "bg-rose-50"
                                            )}>
                                                {approval.status === 'approved' ?
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                                                    <XCircle className="h-5 w-5 text-rose-600" />
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">{approval.project?.name || 'Unknown Project'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{approval.type.replace('_', ' ')} • {formatDate(approval.created_at)}</p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={approval.status === 'approved' ? 'success' : 'destructive'}
                                            className="px-3 py-1 font-bold uppercase text-xs"
                                        >
                                            {approval.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {approvals?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">All Clear</h3>
                    <p className="text-slate-500 font-medium mt-1">No approval requests at this time.</p>
                </div>
            )}
        </div>
    );
}
