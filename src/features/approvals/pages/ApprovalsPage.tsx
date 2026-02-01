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
    Search,
    TrendingUp
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDate, cn, getCompanyTheme } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: approvals, isLoading } = useApprovals(selectedCompanyId);
    const processApproval = useProcessApproval();
    const [searchQuery, setSearchQuery] = useState('');

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Governance & Approvals</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">
                        Review and manage requests from Project Leads for {currentCompanyName}.
                    </p>
                </div>
                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" style={{ color: searchQuery ? theme.primary : undefined }} />
                    <Input
                        placeholder="Search requests..."
                        className="pl-10 bg-white border-slate-200 focus-visible:ring-primary/20"
                        style={{ '--tw-ring-color': theme.primary } as any}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredApprovals.map((approval) => (
                    <Card key={approval.id} className={cn(
                        "group hover:shadow-lg transition-all duration-300 border-slate-200/60 overflow-hidden relative",
                    )}>
                        <div
                            className="absolute top-0 left-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                            style={{
                                backgroundColor: approval.status === 'pending' ? '#f59e0b' :
                                    approval.status === 'approved' ? '#10b981' :
                                        '#ef4444'
                            }}
                        />
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                {/* Type & Icon */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div
                                        className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${theme.primary}10`, color: theme.primary }}
                                    >
                                        {approval.entity_type === 'budget_increase' ? <TrendingUp className="h-7 w-7" /> :
                                            approval.entity_type === 'project_completion' ? <CheckCircle2 className="h-7 w-7" /> :
                                                <Clock className="h-7 w-7" />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 capitalize text-lg tracking-tight">
                                            {approval.entity_type.replace('_', ' ')}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                            {formatDate(approval.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Requester */}
                                <div className="flex items-center gap-3 min-w-[180px]">
                                    <div
                                        className="h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md border-2 border-white"
                                        style={{ backgroundColor: theme.primary }}
                                    >
                                        {approval.requester?.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-700 leading-none">{approval.requester?.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Project Lead</span>
                                    </div>
                                </div>

                                {/* Comments/Description */}
                                <div className="flex-1 min-w-[200px] border-l border-slate-100 pl-6 hidden lg:block">
                                    <p className="text-sm text-slate-600 line-clamp-2 italic font-medium leading-relaxed">
                                        "{approval.comments || 'No additional context provided for this request.'}"
                                    </p>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-4 justify-end min-w-[220px]">
                                    {approval.status === 'pending' ? (
                                        isAdmin ? (
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] tracking-widest px-4 h-10"
                                                    onClick={() => handleAction(approval.id, 'rejected')}
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Decline
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="font-black uppercase text-[10px] tracking-widest px-6 h-10 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                                                    style={{ backgroundColor: theme.primary }}
                                                    onClick={() => handleAction(approval.id, 'approved')}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Approve
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge variant="warning" className="px-4 py-2 font-black uppercase text-[10px] tracking-widest h-8 rounded-md shadow-sm">Pending Review</Badge>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge
                                                variant={approval.status === 'approved' ? 'success' : 'destructive'}
                                                className="px-4 py-2 font-black uppercase text-[10px] tracking-widest h-8 rounded-md shadow-md"
                                            >
                                                {approval.status === 'approved' ? 'Verified & Approved' : 'Request Terminated'}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                                                By {approval.approver?.name || 'Admin Authority'}
                                            </span>
                                        </div>
                                    )}
                                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-primary transition-colors hover:bg-slate-50" style={{ '--tw-hover-text-primary': theme.primary } as any}>
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredApprovals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200/60">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 shadow-inner">
                            <CheckCircle2 className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Queue Fully Cleared</h3>
                        <p className="text-slate-500 font-medium mt-1">There are no pending legal or operational requests at this time.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
