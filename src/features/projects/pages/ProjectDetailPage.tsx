import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateApproval } from '@/features/approvals/hooks/useApprovals';
import ProjectTimeline from '../components/ProjectTimeline';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Share2,
    Download,
    BarChart2,
    Shield,
    Clock,
    CheckCircle2,
    FileText,
    Plus,
    Paperclip,
    Calendar,
    MessageSquare,
    Building2,
    MoreHorizontal,
    Users,
    ChevronRight,
    Send,
    DollarSign,
    Quote
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, calculateProfitability, cn, getCompanyTheme } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useProjectComments, useCreateProjectComment, useProjectAttachments } from '../hooks/useProjectDetails';
import { toast } from 'react-hot-toast';
import CreateTaskModal from '@/features/tasks/components/CreateTaskModal';

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, isLoading } = useProject(id || '');
    const { data: tasks = [] } = useTasks({ project_id: id });
    const { data: comments = [] } = useProjectComments(id || '');
    const { data: attachments = [] } = useProjectAttachments(id || '');

    const createApproval = useCreateApproval();
    const createComment = useCreateProjectComment();

    const [commentText, setCommentText] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    const theme = useMemo(() => {
        if (!project?.company?.name) return getCompanyTheme('Global View');
        return getCompanyTheme(project.company.name);
    }, [project?.company?.name]);

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
        const nextStageMap: Record<string, string> = { 'planning': 'active', 'active': 'completed' };
        const nextStage = nextStageMap[project.status];
        if (!nextStage) return;

        try {
            await createApproval.mutateAsync({
                project_id: project.id,
                type: 'stage_transition',
                content: `Request to transition project "${project.name}" from ${project.status} to ${nextStage} stage`,
                entity_type: 'project_completion',
                entity_id: project.id,
                requester_id: user.id,
                comments: `Requesting transition to ${nextStage} stage based on current execution milestones.`
            });
            toast.success('Transition request submitted for Admin review.');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to submit request.');
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        try {
            await createComment.mutateAsync({ project_id: project.id, content: commentText });
            setCommentText('');
        } catch (error) { console.error(error); }
    };

    const taskCategories = [
        "Report Blockers",
        "Follow Up",
        "Status Updates",
        "Procurement Accountability",
        "Requests & Reports",
        "Making approval request",
        "User Management"
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Action Bar */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/projects')} className="group font-bold text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Portfolio
                </Button>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            // Assuming toast is available or use alert fallback
                            alert("Link copied to clipboard!");
                        }}
                    >
                        <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200"
                        onClick={() => alert("Export started. You will receive an email shortly.")}
                    >
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Stacked Hero Section */}
            <div className="w-full mb-8 flex flex-col gap-8">
                {/* 1. Identity & Description (Full Width) */}
                <div className="space-y-6">
                    {/* Breadcrumbs & Badge */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-500">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-slate-500">
                                {project.company?.name || 'Monitoring Node'}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <Badge variant="outline" className="px-2.5 py-0.5 bg-slate-100 border-slate-200 text-slate-600 rounded-md uppercase tracking-wider text-[10px] font-bold">
                                {project.status?.replace('_', ' ') || 'Planning'}
                            </Badge>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                        {project.name}
                    </h1>

                    {/* Mission Statement (Interactive) */}
                    <div className="relative bg-slate-50 rounded-2xl p-6 border-l-4 transition-all duration-300" style={{ borderColor: theme.primary }}>
                        <Quote className="absolute top-4 left-4 h-8 w-8 text-slate-200 -z-0" />
                        <div className="relative z-10">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Mission Statement</p>
                            <div className={cn("text-sm text-slate-700 leading-relaxed font-medium transition-all", isExpanded ? "max-h-full" : "max-h-[120px] overflow-hidden relative")}>
                                <p>
                                    {project.description || 'Strategic infrastructure initiative designed to optimize regional operational throughput and enhance system reliability.'}
                                </p>
                                {!isExpanded && project.description && project.description.length > 200 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
                                )}
                            </div>
                            {project.description && project.description.length > 200 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
                                >
                                    {isExpanded ? 'Read Less' : 'Read More'}
                                    <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded ? "-rotate-90" : "rotate-90")} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Metrics & Actions (Full Width Grid) */}
                <div className="space-y-4">
                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-end gap-3 w-full">
                        {user?.role === 'lead' && (
                            <>
                                <Button
                                    onClick={handleRequestTransition}
                                    className="h-10 px-6 font-bold shadow-md hover:translate-y-[-2px] transition-all rounded-xl text-white border-0"
                                    style={{ backgroundColor: theme.primary }}
                                >
                                    Update Stage
                                </Button>
                                <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {/* Valuation */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    <span>Valuation</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {formatCurrency(project.contract_value || 0)}
                                </p>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Timeline</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 h-8 flex items-center">
                                    Q1 2024 - Q4 2025
                                </p>
                            </div>

                            {/* Project Lead */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Project Lead</span>
                                </div>
                                <div className="flex items-center gap-2 h-8">
                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                        {project.lead?.name?.[0] || 'JD'}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {project.lead?.name || 'John Doe'}
                                    </span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    <span>Completion</span>
                                </div>
                                <div className="flex items-center gap-2 h-8">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                        <div className="h-full bg-slate-900 rounded-full" style={{ width: '0%', backgroundColor: theme.primary }} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimal Navigation & Content Tabs */}
            <Tabs defaultValue="overview" className="w-full space-y-8" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-2 rounded-2xl border border-slate-200">
                    <TabsList className="bg-transparent h-auto p-0 flex gap-1">
                        {[
                            { id: 'overview', label: 'Overview', icon: BarChart2 },
                            { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
                            { id: 'comments', label: 'Discussion', icon: MessageSquare },
                            { id: 'attachments', label: 'Vault', icon: FileText }
                        ].map(tab => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 gap-2 border border-transparent",
                                    activeTab === tab.id ? "bg-slate-900 text-white shadow-none" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )}
                                style={activeTab === tab.id ? { backgroundColor: theme.primary } : {}}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex items-center gap-4 px-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(_ => (
                                <div key={_} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500">
                                    {String.fromCharCode(64 + _)}
                                </div>
                            ))}
                            <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white">+5</div>
                        </div>
                        <Button variant="ghost" size="sm" className="font-bold text-slate-400 text-xs hover:text-slate-900">Manage Team</Button>
                    </div>
                </div>

                {/* --- OVERVIEW TAB --- */}
                <TabsContent value="overview" className="space-y-6 mt-0 outline-none">
                    <ProjectTimeline
                        currentStage={project.status}
                        theme={theme}
                        onRequestTransition={handleRequestTransition}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-none overflow-hidden">
                            <CardHeader className="p-6 bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Executive Summary</h3>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Key Performance Metrics</p>
                                </div>
                                <ActivityBadge status={profitability.status} />
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <MetricItem label="Financial Margin" value={`${profitability.percentage.toFixed(1)}%`} sub="Revenue Efficiency" color={profitability.status === 'healthy' ? "text-emerald-600" : "text-rose-600"} />
                                    <MetricItem label="Completion Rate" value={`${project.tasks && project.tasks.length > 0 ? Math.round((project.tasks.filter(t => t.stage === 'completed').length / project.tasks.length) * 100) : 0}%`} sub="Task Execution" color="text-slate-900" />
                                    <MetricItem label="Liquidity" value={formatCurrency(Math.max(0, (project.contract_value || 0) - (project.actual_cost || 0)))} sub="Available Budget" color="text-slate-900" />
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-100">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Strategic Milestones</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoStrip icon={Calendar} label="Kickoff Date" value={project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Pending'} />
                                        <InfoStrip icon={Clock} label="Expected Handover" value={project.expected_handover ? new Date(project.expected_handover).toLocaleDateString() : 'Pending'} />
                                        <InfoStrip icon={Shield} label="Lead Monitor" value={project.lead?.name || 'Unassigned'} />
                                        <InfoStrip icon={Users} label="Team Composition" value="8 Verified Operators" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-2xl border-slate-200 shadow-none bg-white">
                                <CardHeader className="p-6 pb-2">
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Project Pulse</h3>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Live Activity Feed</p>
                                </CardHeader>
                                <CardContent className="px-6 pb-6 pt-2">
                                    <div className="space-y-5">
                                        {tasks.slice(0, 5).map((task, i) => (
                                            <PulseItem key={task.id} task={task} isLast={i === 4} theme={theme} />
                                        ))}
                                    </div>
                                    <Button variant="ghost" className="w-full mt-6 font-bold text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setActiveTab('tasks')}>
                                        View All Tasks <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TASKS TAB --- */}
                <TabsContent value="tasks" className="mt-0 outline-none animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="rounded-2xl border-slate-200 shadow-none p-5 space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Filters</h4>
                                    <div className="space-y-1">
                                        {['All Tasks', 'My Tasks', 'In Progress', 'High Priority'].map(f => (
                                            <button key={f} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                                                <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">{f}</span>
                                                <ChevronRight className="h-3 w-3 text-slate-300" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Directives</h4>
                                    <Button
                                        onClick={() => setIsCreateTaskOpen(true)}
                                        className="w-full justify-start rounded-xl font-bold text-[10px] uppercase tracking-wider px-4 h-10 shadow-none"
                                        style={{ backgroundColor: theme.primary }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> New Task
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-3 space-y-6">
                            {taskCategories.map(cat => (
                                <div key={cat} className="space-y-3">
                                    <div className="grid grid-cols-1 gap-3">
                                        {tasks.filter(t => t.category === cat).length > 0 ? (
                                            tasks.filter(t => t.category === cat).map(task => (
                                                <ProjectTaskRow key={task.id} task={task} theme={theme} />
                                            ))
                                        ) : (
                                            <div className="p-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">No active tasks in this segment</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* --- COMMENTS TAB --- */}
                <TabsContent value="comments" className="mt-0 outline-none animate-in fade-in duration-300">
                    <Card className="rounded-2xl border-slate-200 shadow-none overflow-hidden bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-3">
                            <div className="lg:col-span-2 p-8 space-y-8 border-r border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Collaboration Feed</h3>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-400 rounded-full py-1 px-3 font-bold text-[10px] uppercase tracking-wider">{comments.length} Signals</Badge>
                                </div>

                                <div className="space-y-8 min-h-[400px]">
                                    {comments.map((comment) => (
                                        <CommentItem key={comment.id} comment={comment} />
                                    ))}

                                    {comments.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                                <MessageSquare className="h-6 w-6 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">Awaiting first contribution</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8 border-t border-slate-100">
                                    <div className="relative">
                                        <textarea
                                            placeholder="Secure message to team leads..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:ring-1 focus:ring-primary/20 min-h-[100px] transition-all resize-none"
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                        />
                                        <Button
                                            onClick={handleAddComment}
                                            className="absolute bottom-3 right-3 h-10 w-10 rounded-xl shadow-none"
                                            style={{ backgroundColor: theme.primary }}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 bg-slate-50/10">
                                <section className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Objectives</h4>
                                    <div className="space-y-3">
                                        {['Strategic alignment with Cypress Energy goals', 'Real-time logistics monitoring', 'Automated anomaly detection'].map((obj, _) => (
                                            <div key={_} className="flex gap-3">
                                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                                    {_ + 1}
                                                </div>
                                                <p className="text-xs font-medium text-slate-600 leading-relaxed">{obj}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic Access</h4>
                                    <div className="space-y-4">
                                        {[
                                            { name: 'Emmanuel S.', role: 'Senior Monitor', active: true },
                                            { name: 'Sarah J.', role: 'Regional Lead', active: true },
                                            { name: 'Kofi A.', role: 'Specialist', active: false }
                                        ].map(u => (
                                            <div key={u.name} className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-white border border-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">{u.name[0]}</div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{u.name}</p>
                                                    <p className="text-[9px] font-semibold text-slate-400">{u.role}</p>
                                                </div>
                                                {u.active && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-auto" />}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- ATTACHMENTS TAB --- */}
                <TabsContent value="attachments" className="mt-0 outline-none animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Project Vault</h3>
                                <p className="text-slate-500 text-xs font-medium mt-1">Centralized documentation for audit and technical reference</p>
                            </div>
                            <Button className="h-10 px-6 rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-none" style={{ backgroundColor: theme.primary }}>
                                <Plus className="h-4 w-4 mr-2" /> Upload Asset
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {(attachments.length > 0 ? attachments : [
                                { id: '1', name: 'Technical_Spec.pdf', type: 'Design', size: '2.4 MB', created_at: '2026-01-30' },
                                { id: '2', name: 'Contract_Agreement.docx', type: 'Legal', size: '1.1 MB', created_at: '2026-01-25' },
                                { id: '3', name: 'Site_Report.img', type: 'Field', size: '4.5 MB', created_at: '2026-01-31' },
                                { id: '4', name: 'Budget_Q1.xlsx', type: 'Finance', size: '0.8 MB', created_at: '2026-02-01' }
                            ]).map((asset) => (
                                <AttachmentCard key={asset.id} asset={asset} theme={theme} />
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <CreateTaskModal
                open={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
                initialProjectId={project.id}
            />
        </div>
    );
}

// --- Sub-components ---

function MetricItem({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <h4 className={cn("text-3xl font-bold tracking-tight", color)}>{value}</h4>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{sub}</p>
        </div>
    );
}

function InfoStrip({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors cursor-default">
            <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Icon className="h-4 w-4" /></div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
            </div>
        </div>
    );
}

function PulseItem({ task, isLast, theme }: { task: any, isLast: boolean, theme: any }) {
    return (
        <div className="flex gap-4 relative">
            {!isLast && <div className="absolute left-[13px] top-[26px] bottom-[-20px] w-px bg-slate-100" />}
            <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 border border-white",
                task.stage === 'completed' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
            )}
                style={task.stage === 'in_progress' ? { backgroundColor: theme.primary, color: '#fff' } : {}}
            >
                {task.stage === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{task.title}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{task.stage.replace('_', ' ')}</p>
            </div>
        </div>
    );
}

function ProjectTaskRow({ task, theme }: { task: any, theme: any }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <input type="checkbox" className="h-4 w-4 rounded-md border-slate-300 text-primary focus:ring-offset-0 focus:ring-0 cursor-pointer" style={{ color: theme.primary } as any} />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider h-4 px-1.5 bg-slate-50 border-slate-200 text-slate-500">{task.priority}</Badge>
                        <span className="text-[9px] font-semibold text-slate-300 uppercase">Assigned to Lead Monitor</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                    <p className="text-xs font-semibold text-slate-600">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

function CommentItem({ comment }: { comment: any }) {
    return (
        <div className="flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                {comment.user?.name[0]}
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{comment.user?.name} <span className="text-[9px] font-semibold text-slate-400 ml-1 uppercase">Monitor</span></p>
                    <p className="text-[10px] font-semibold text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{comment.content}"</p>
                </div>
                <div className="flex items-center gap-4 px-1">
                    <button className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-900 transition-colors">Acknowledge</button>
                    <button className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-900 transition-colors">Reply</button>
                </div>
            </div>
        </div>
    );
}

function AttachmentCard({ asset, theme }: { asset: any, theme: any }) {
    return (
        <div className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.primary}10`, color: theme.primary }}>
                    <FileText className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-slate-200 font-bold bg-slate-50 text-slate-500 uppercase">{asset.type || 'Doc'}</Badge>
            </div>
            <div className="space-y-3">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight group-hover:text-slate-900 transition-colors">{asset.name}</p>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Paperclip className="h-3 w-3" /> {asset.size}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    );
}

function ActivityBadge({ status }: { status: 'healthy' | 'at_risk' | 'critical' }) {
    const configs = {
        healthy: { border: 'border-emerald-100', text: 'text-emerald-700', label: 'Nominal' },
        at_risk: { border: 'border-amber-100', text: 'text-amber-700', label: 'At Risk' },
        critical: { border: 'border-rose-100', text: 'text-rose-700', label: 'Critical' }
    };
    const config = configs[status];
    return (
        <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider bg-white", config.border, config.text)}>
            <div className={cn("h-1 w-1 rounded-full", config.text.replace('text', 'bg'))} />
            {config.label}
        </Badge>
    );
}
