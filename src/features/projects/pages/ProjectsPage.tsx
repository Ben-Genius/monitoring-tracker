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
import { formatCurrency, calculateProfitability, cn } from '@/lib/utils';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: projects, isLoading } = useProjects();
    const [activeTab, setActiveTab] = useState('all');

    const isAdmin = user?.role === 'admin';
    const isLead = user?.role === 'lead';
    const canCreateProject = isAdmin || isLead;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects Monitoring</h1>
                    <p className="text-slate-500 mt-1">
                        Comprehensive tracking of project lifecycles and performance.
                    </p>
                </div>
                {canCreateProject && (
                    <Button className="shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                )}
            </div>

            {/* Lifecycle Tabs */}
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100/50 p-1 border border-slate-200/50">
                        <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            All ({stats.total})
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-blue-600">
                            <Clock className="h-4 w-4 mr-2" />
                            Upcoming ({stats.upcoming})
                        </TabsTrigger>
                        <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-primary">
                            <Play className="h-4 w-4 mr-2" />
                            Active ({stats.active})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-success">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Completed ({stats.completed})
                        </TabsTrigger>
                        <TabsTrigger value="backlogs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-warning">
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

                        // Mock progress for now - in real app, fetch task counts
                        const completionRate = project.status === 'completed' ? 100 :
                            project.status === 'planning' ? 0 : 45;

                        return (
                            <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 overflow-hidden bg-white">
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
                                        >
                                            {project.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "mb-2 font-bold px-2 py-0.5 border-slate-200",
                                                project.company?.name.toLowerCase().includes('macwest') ? "text-indigo-600 bg-indigo-50 border-indigo-100" :
                                                    project.company?.name.toLowerCase().includes('cypress') ? "text-purple-600 bg-purple-50 border-purple-100" :
                                                        "text-pink-600 bg-pink-50 border-pink-100"
                                            )}
                                        >
                                            {project.company?.name || 'Venture'}
                                        </Badge>
                                        <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                            {project.name}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Project Meta */}
                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User className="h-3.5 w-3.5" />
                                            <span className="truncate font-medium">Lead: {project.lead?.name || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No Start Date'}</span>
                                        </div>
                                    </div>

                                    {/* Performance Stats */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Budget Performance</span>
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
                                            <span className="text-xl font-bold text-slate-900">{formatCurrency(contractValue)}</span>
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
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Progress</span>
                                            <span className="text-xs font-black text-primary">
                                                {(() => {
                                                    const total = project.tasks?.length || 0;
                                                    const completed = project.tasks?.filter(t => t.stage === 'completed').length || 0;
                                                    return total > 0 ? Math.round((completed / total) * 100) : 0;
                                                })()}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                            <div
                                                className="h-full bg-primary transition-all duration-1000 ease-out"
                                                style={{
                                                    width: `${(() => {
                                                        const total = project.tasks?.length || 0;
                                                        const completed = project.tasks?.filter(t => t.stage === 'completed').length || 0;
                                                        return total > 0 ? Math.round((completed / total) * 100) : 0;
                                                    })()}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                            <span>Handover: {project.expected_handover ? new Date(project.expected_handover).toLocaleDateString() : 'TBD'}</span>
                                            <span>Timeline Tracked</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full h-11 border-slate-200 hover:bg-slate-50 hover:text-primary font-bold transition-all shadow-sm"
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                    >
                                        View Project Timeline
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <LayoutGrid className="h-12 w-12 text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No {activeTab} projects found</h3>
                        <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or create a new project.</p>
                        {canCreateProject && (
                            <Button className="mt-6 font-bold" variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Project
                            </Button>
                        )}
                    </div>
                )}
            </Tabs>
        </div>
    );
}
