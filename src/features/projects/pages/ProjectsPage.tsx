import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus,
    TrendingUp,
    TrendingDown,
    Calendar,
    User,
    Clock,
    CheckCircle2,
    AlertCircle,
    LayoutGrid,
    Play
} from 'lucide-react';
import { formatCurrency, calculateProfitability, cn, getCompanyTheme } from '@/lib/utils';
import { useProjects, useCompanies } from '@/features/projects/hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateProjectModal from '@/features/projects/components/CreateProjectModal';

import { useCompanyStore } from '@/hooks/useCompanyStore';

export default function ProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { selectedCompanyId } = useCompanyStore();
    const { data: projects, isLoading } = useProjects(selectedCompanyId === 'all' ? undefined : selectedCompanyId);
    const { data: companies = [] } = useCompanies();
    const [activeTab, setActiveTab] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const isAdmin = user?.role === 'admin';
    const isLead = user?.role === 'lead';
    const canCreateProject = isAdmin || isLead;

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-10 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-12 w-full max-w-[500px]" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200/60">
                            <CardHeader className="pb-4">
                                <Skeleton className="h-5 w-24 mb-2" />
                                <Skeleton className="h-7 w-3/4" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-8 w-1/2" />
                                </div>
                                <div className="space-y-3">
                                    <Skeleton className="h-2 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                                <Skeleton className="h-11 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const filteredProjects = projects?.filter(project => {
        // First filter by company for Lead
        if (!isAdmin && project.company_id !== user?.company_id) return false;

        // Then filter by tab/status
        if (activeTab === 'all') return true;
        if (activeTab === 'upcoming') return project.status === 'planning';
        if (activeTab === 'active') return project.status === 'active';
        if (activeTab === 'completed') return project.status === 'completed';
        if (activeTab === 'backlogs') return project.status === 'on_hold';
        return true;
    }) || [];

    const stats = {
        total: projects?.length || 0,
        active: projects?.filter(p => p.status === 'active').length || 0,
        upcoming: projects?.filter(p => p.status === 'planning').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        backlogs: projects?.filter(p => p.status === 'on_hold').length || 0,
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Projects Monitoring</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Comprehensive tracking of project lifecycles and performance.
                    </p>
                </div>
                {canCreateProject && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="shadow-lg transition-transform hover:scale-105"
                        style={{
                            backgroundColor: theme.primary,
                            boxShadow: `0 10px 15px -3px ${theme.primary}30`
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                )}
            </div>

            {/* Lifecycle Tabs */}
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 border border-slate-200/50 dark:border-slate-700/50">
                        <TabsTrigger
                            value="all"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 text-slate-500 dark:text-slate-400"
                        >
                            <span
                                className="flex items-center"
                                style={activeTab === 'all' ? { color: theme.primary } : {}}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                All ({stats.total})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="upcoming"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 text-slate-500 dark:text-slate-400"
                        >
                            <span
                                className="flex items-center"
                                style={activeTab === 'upcoming' ? { color: theme.primary } : {}}
                            >
                                <Clock className="h-4 w-4 mr-2" />
                                Upcoming ({stats.upcoming})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="active"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 text-slate-500 dark:text-slate-400"
                        >
                            <span
                                className="flex items-center"
                                style={activeTab === 'active' ? { color: theme.primary } : {}}
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Active ({stats.active})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 text-slate-500 dark:text-slate-400"
                        >
                            <span
                                className="flex items-center"
                                style={activeTab === 'completed' ? { color: theme.primary } : {}}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Completed ({stats.completed})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="backlogs"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm text-warning"
                        >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Backlogs ({stats.backlogs})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => {
                        const contractValue = project.contract_value || 0;
                        const actualCost = project.actual_cost || 0;
                        const profitability = calculateProfitability(contractValue, actualCost);
                        const projectTheme = getCompanyTheme(project.company?.name || '');

                        return (
                            <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                                <CardHeader className="pb-4 relative">
                                    <div className="absolute top-0 right-0 p-4">
                                        <Badge
                                            variant={
                                                project.status === 'active' ? 'default' :
                                                    project.status === 'planning' ? 'secondary' :
                                                        project.status === 'completed' ? 'success' :
                                                            'warning'
                                            }
                                            className="capitalize shadow-sm"
                                            style={project.status === 'active' ? { backgroundColor: projectTheme.primary } : {}}
                                        >
                                            {project.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <Badge
                                            variant="outline"
                                            className="mb-2 font-bold px-2 py-0.5"
                                            style={{
                                                color: projectTheme.primary,
                                                backgroundColor: `${projectTheme.primary}10`,
                                                borderColor: `${projectTheme.primary}20`
                                            }}
                                        >
                                            {project.company?.name || 'Venture'}
                                        </Badge>
                                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors">
                                            <span className="group-hover:transition-colors">
                                                {project.name}
                                            </span>
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Project Meta */}
                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <User className="h-3.5 w-3.5" />
                                            <span className="truncate font-medium">Lead: {project.lead?.name || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No Start Date'}</span>
                                        </div>
                                    </div>

                                    {/* Performance Stats */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Budget Performance</span>
                                            <Badge
                                                variant={
                                                    profitability.status === 'healthy' ? 'success' :
                                                        profitability.status === 'at_risk' ? 'warning' : 'destructive'
                                                }
                                                className="rounded-md"
                                            >
                                                {profitability.percentage.toFixed(1)}% margin
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(contractValue)}</span>
                                            <div className={cn(
                                                "flex items-center gap-1 text-sm font-bold",
                                                profitability.profit > 0 ? "text-success" : "text-error"
                                            )}>
                                                {profitability.profit > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                {formatCurrency(Math.abs(profitability.profit))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Execution Progress */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Execution Progress</span>
                                            <span className="text-xs font-black" style={{ color: projectTheme.primary }}>
                                                {(() => {
                                                    const total = project.tasks?.length || 0;
                                                    const completed = project.tasks?.filter(t => t.stage === 'completed').length || 0;
                                                    return total > 0 ? Math.round((completed / total) * 100) : 0;
                                                })()}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
                                            <div
                                                className="h-full transition-all duration-1000 ease-out"
                                                style={{
                                                    backgroundColor: projectTheme.primary,
                                                    width: `${(() => {
                                                        const total = project.tasks?.length || 0;
                                                        const completed = project.tasks?.filter(t => t.stage === 'completed').length || 0;
                                                        return total > 0 ? Math.round((completed / total) * 100) : 0;
                                                    })()}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                            <span>Handover: {project.expected_handover ? new Date(project.expected_handover).toLocaleDateString() : 'TBD'}</span>
                                            <span>Timeline Tracked</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full h-11 border-slate-200 dark:border-slate-700 bg-transparent dark:text-slate-300 font-bold transition-all shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                        style={{ '--hover-color': projectTheme.primary } as any}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = projectTheme.primary)}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                                    >
                                        View Project Timeline
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <LayoutGrid className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">No {activeTab} projects found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Try adjusting your filters or create a new project.</p>
                        {canCreateProject && (
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-6 font-bold"
                                variant="outline"
                                style={{ color: theme.primary, borderColor: `${theme.primary}40` }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Project
                            </Button>
                        )}
                    </div>
                )}
            </Tabs>

            <CreateProjectModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
