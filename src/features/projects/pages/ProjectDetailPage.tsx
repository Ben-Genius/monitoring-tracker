import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateApproval } from '@/features/approvals/hooks/useApprovals';
import ProjectTimeline from '../components/ProjectTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Share2,
    MoreVertical,
    Download,
    BarChart2,
    DollarSign,
    Shield,
    Clock,
    CheckCircle2,
    FileText,
    History,
    Plus,
    Paperclip
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, calculateProfitability, cn } from '@/lib/utils';

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, isLoading } = useProject(id || '');
    const createApproval = useCreateApproval();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h2 className="text-2xl font-bold">Project not found</h2>
                <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </div>
        );
    }

    const profitability = calculateProfitability(project.contract_value || 0, project.actual_cost || 0);

    const handleRequestTransition = async () => {
        if (!user || !project) return;

        const nextStageMap: Record<string, string> = {
            'planning': 'active',
            'active': 'completed',
        };

        const nextStage = nextStageMap[project.status];
        if (!nextStage) return;

        try {
            await createApproval.mutateAsync({
                entity_type: 'project_completion',
                entity_id: project.id,
                requested_by: user.id,
                comments: `Requesting transition to ${nextStage} stage based on current execution milestones.`
            });
            alert('Transition request submitted for Admin review.');
        } catch (error) {
            console.error('Failed to submit request:', error);
        }
    };

    const handleRequestBudget = async () => {
        if (!user || !project) return;

        try {
            await createApproval.mutateAsync({
                entity_type: 'budget_increase',
                entity_id: project.id,
                requested_by: user.id,
                comments: `Project Lead requesting budget review and adjustment due to unforeseen technical complexities or scope expansion.`
            });
            alert('Budget adjustment request submitted for Admin review.');
        } catch (error) {
            console.error('Failed to submit request:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/projects')} className="group">
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Projects
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button size="icon" variant="outline" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Project Cover / Header */}
            <div className="relative h-64 w-full rounded-3xl overflow-hidden shadow-2xl">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-700",
                    project.company?.name.toLowerCase().includes('macwest') ? "from-indigo-600 via-indigo-500 to-indigo-800" :
                        project.company?.name.toLowerCase().includes('cypress') ? "from-purple-600 via-purple-500 to-purple-800" :
                            "from-pink-600 via-pink-500 to-pink-800"
                )} />
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />

                <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-t from-black/20 to-transparent">
                    <div className="space-y-3">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 px-3 py-1 font-bold text-[10px] tracking-widest uppercase">
                            {project.company?.name || 'Venture'}
                        </Badge>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            {project.name}
                        </h1>
                        <div className="flex items-center gap-6 text-white/80">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold">Monitor: {project.lead?.name || 'Lead Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                    <BarChart2 className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold capitalize">{project.status.replace('_', ' ')} Stage</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Project Value</p>
                            <p className="text-3xl font-black text-white">{formatCurrency(project.contract_value || 0)}</p>
                        </div>
                        {user?.role === 'lead' && (
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleRequestBudget()}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold px-6 h-12 rounded-xl backdrop-blur-md"
                                >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Budget Adjustment
                                </Button>
                                <Button
                                    onClick={handleRequestTransition}
                                    className="bg-white text-primary hover:bg-slate-100 font-bold px-6 h-12 rounded-xl shadow-xl shadow-black/20"
                                >
                                    Request Stage Change
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline View */}
            <ProjectTimeline currentStage={project.status} />

            {/* Grid for details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Statistics */}
                <Card className="lg:col-span-2 border-slate-200/60 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 text-primary" />
                            Performance Indicators
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Financial Margin</p>
                                <div className="space-y-1">
                                    <h4 className={cn(
                                        "text-4xl font-black",
                                        profitability.status === 'healthy' ? "text-success" :
                                            profitability.status === 'at_risk' ? "text-warning" : "text-destructive"
                                    )}>
                                        {profitability.percentage.toFixed(1)}%
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Net profitability analyzed vs actual cost.</p>
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-slate-100 pl-8">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Execution Efficiency</p>
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-slate-900">
                                        {(() => {
                                            const total = project.tasks?.length || 0;
                                            const completed = project.tasks?.filter(t => t.stage === 'completed').length || 0;
                                            return total > 0 ? Math.round((completed / total) * 100) : 0;
                                        })()}%
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Task completion rate across all stages.</p>
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-slate-100 pl-8">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Budget Remaining</p>
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-slate-900">
                                        {formatCurrency(Math.max(0, (project.contract_value || 0) - (project.actual_cost || 0)))}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Estimated liquidity available for completion.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Sidebar */}
                <Card className="border-slate-200/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                                <span className="text-slate-500 font-bold flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Contract
                                </span>
                                <span className="font-bold text-slate-900">{formatCurrency(project.contract_value || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                                <span className="text-slate-500 font-bold flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Start Date
                                </span>
                                <span className="font-bold text-slate-900">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                                <span className="text-slate-500 font-bold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Handover
                                </span>
                                <span className="font-bold text-slate-900">{project.expected_handover ? new Date(project.expected_handover).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>

                        {/* Recent Activity Mini-Feed */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-3.5 w-3.5" /> Project Pulse
                            </h4>
                            <div className="space-y-5">
                                {project.tasks?.slice(0, 4).map((task, i) => (
                                    <div key={task.id} className="flex gap-4 relative group/activity">
                                        {i < (project.tasks?.slice(0, 4).length || 0) - 1 && (
                                            <div className="absolute left-[13px] top-[26px] bottom-[-20px] w-0.5 bg-slate-100 group-hover/activity:bg-primary/20 transition-colors" />
                                        )}
                                        <div className={cn(
                                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm transition-all duration-300",
                                            task.stage === 'completed' ? "bg-success text-white" :
                                                task.stage === 'in_progress' ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {task.stage === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-black text-slate-900 truncate">
                                                    {task.stage === 'completed' ? 'Task Finalized' : 'Task Update'}
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-bold">• Just now</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate leading-relaxed">
                                                Moved <span className="font-bold text-slate-700">{task.title}</span> to <span className="capitalize">{task.stage.replace('_', ' ')}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!project.tasks || project.tasks.length === 0) && (
                                    <div className="py-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-[11px] text-slate-400 italic">Initiating heartbeat...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Governance Note</p>
                            <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                                All lifecycle events are logged for audit compliance. Transition approvals usually take 12-24h for review.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Documents & Files Section */}
            <div className="pt-4 px-2">
                <Card className="border-slate-200/60 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/20 py-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Project Vault & Documentation
                        </CardTitle>
                        <Button size="sm" variant="outline" className="h-8 font-bold border-dashed border-slate-300 hover:border-primary transition-all">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Attach File
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[
                                { name: 'Technical_Spec.pdf', type: 'Technical', size: '2.4 MB', date: '2 days ago', color: 'bg-blue-50 text-blue-600' },
                                { name: 'Contract_Agreement.docx', type: 'Legal', size: '1.1 MB', date: '5 days ago', color: 'bg-indigo-50 text-indigo-600' },
                                { name: 'Site_Inspection_Report.png', type: 'Inspection', size: '4.5 MB', date: 'Yesterday', color: 'bg-emerald-50 text-emerald-600' },
                                { name: 'Budget_Forecast.xlsx', type: 'Finance', size: '0.8 MB', date: 'Just now', color: 'bg-amber-50 text-amber-600' }
                            ].map((doc) => (
                                <div key={doc.name} className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-sm", doc.color)}>
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] h-5 border-slate-100 font-black tracking-widest px-2 bg-slate-50/50">
                                            {doc.type.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black text-slate-900 truncate group-hover:text-primary transition-colors leading-tight">{doc.name}</p>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                            <span className="flex items-center gap-1.5">
                                                <Paperclip className="h-3 w-3" /> {doc.size}
                                            </span>
                                            <span className="bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{doc.date}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
