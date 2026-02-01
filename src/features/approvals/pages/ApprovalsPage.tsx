import { useApprovals, useProcessApproval } from '../hooks/useApprovals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Search
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDate, cn } from '@/lib/utils';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

import { useCompanyStore } from '@/hooks/useCompanyStore';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: approvals, isLoading } = useApprovals(selectedCompanyId);
    const processApproval = useProcessApproval();
    const [searchQuery, setSearchQuery] = useState('');

    const isAdmin = user?.role === 'admin';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const filteredApprovals = approvals?.filter(approval => {
        const query = searchQuery.toLowerCase();
        return (
            approval.entity_type.toLowerCase().includes(query) ||
            approval.requester?.name.toLowerCase().includes(query) ||
            approval.status.toLowerCase().includes(query)
        );
    }) || [];

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        if (!user) return;
        try {
            await processApproval.mutateAsync({
                id,
                status,
                approved_by: user.id,
                comments: status === 'approved' ? 'Request verified and approved.' : 'Request declined after review.'
            });
        } catch (error) {
            console.error('Failed to process approval:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Governance & Approvals</h1>
                    <p className="text-slate-500 mt-1">
                        Review and manage requests from Project Leads.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search requests..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredApprovals.map((approval) => (
                    <Card key={approval.id} className={cn(
                        "group hover:shadow-md transition-all duration-200 border-slate-200/60 overflow-hidden",
                        approval.status === 'pending' ? "border-l-4 border-l-warning" :
                            approval.status === 'approved' ? "border-l-4 border-l-success" :
                                "border-l-4 border-l-destructive"
                    )}>
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                {/* Type & Icon */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shadow-sm",
                                        approval.entity_type === 'budget_increase' ? "bg-indigo-50 text-indigo-600" :
                                            approval.entity_type === 'project_completion' ? "bg-success/10 text-success" :
                                                "bg-blue-50 text-blue-600"
                                    )}>
                                        {approval.entity_type === 'budget_increase' ? <TrendingUp className="h-6 w-6" /> :
                                            approval.entity_type === 'project_completion' ? <CheckCircle2 className="h-6 w-6" /> :
                                                <Clock className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 capitalize">
                                            {approval.entity_type.replace('_', ' ')}
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {formatDate(approval.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Requester */}
                                <div className="flex items-center gap-3 min-w-[180px]">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                                        {approval.requester?.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">{approval.requester?.name}</span>
                                        <span className="text-xs text-slate-500">Project Lead</span>
                                    </div>
                                </div>

                                {/* Comments/Description */}
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-sm text-slate-600 line-clamp-2 italic">
                                        "{approval.comments || 'No additional context provided for this request.'}"
                                    </p>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-4 justify-end min-w-[220px]">
                                    {approval.status === 'pending' ? (
                                        isAdmin ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10 font-bold"
                                                    onClick={() => handleAction(approval.id, 'rejected')}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1.5" />
                                                    Decline
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-success hover:bg-success/90 text-white font-bold shadow-sm shadow-success/20"
                                                    onClick={() => handleAction(approval.id, 'approved')}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                    Approve
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge variant="warning" className="px-3 py-1 font-bold">Pending Review</Badge>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge
                                                variant={approval.status === 'approved' ? 'success' : 'destructive'}
                                                className="px-3 py-1 font-bold shadow-sm"
                                            >
                                                {approval.status === 'approved' ? 'Verified & Approved' : 'Request Terminated'}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Processed by {approval.approver?.name || 'Admin'}
                                            </span>
                                        </div>
                                    )}
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredApprovals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <CheckCircle2 className="h-12 w-12 text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">Queue Cleared</h3>
                        <p className="text-slate-500 text-sm mt-1">There are no pending approval requests at this time.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Add TrendingUp import fix if needed or internal component
function TrendingUp({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}
