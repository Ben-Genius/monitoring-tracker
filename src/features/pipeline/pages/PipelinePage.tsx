import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, getCompanyTheme } from '@/lib/utils';
import { useMemo } from 'react';

import { usePipeline, usePipelineSummary } from '../hooks/usePipeline';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PipelinePage() {
    const navigate = useNavigate();
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();
    const { data: pipelineProjects = [], isLoading: pipelineLoading } = usePipeline(selectedCompanyId);
    const { data: summary, isLoading: summaryLoading } = usePipelineSummary(selectedCompanyId);

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    if (pipelineLoading || summaryLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pipeline</h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Track sales opportunities and project pipeline
                    </p>
                </div>
                <Button
                    className="shadow-lg shadow-primary/20 transition-transform hover:scale-105"
                    style={{ backgroundColor: theme.primary, boxShadow: `0 10px 15px -3px ${theme.primary}30` }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Opportunity
                </Button>
            </div>

            {/* Pipeline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200/60 shadow-sm group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Total Pipeline Value
                                </p>
                                <p className="text-3xl font-black text-slate-900 mt-2">
                                    {formatCurrency(summary?.totalValue || 0)}
                                </p>
                            </div>
                            <div
                                className="h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${theme.primary}15` }}
                            >
                                <DollarSign className="h-6 w-6" style={{ color: theme.primary }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Weighted Value
                                </p>
                                <p className="text-3xl font-black text-slate-900 mt-2">
                                    {formatCurrency(summary?.weightedValue || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center transition-transform group-hover:scale-110">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Opportunities
                                </p>
                                <p className="text-3xl font-black text-slate-900 mt-2">
                                    {summary?.opportunities || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center transition-transform group-hover:scale-110">
                                <Calendar className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline Stages */}
            <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="border-b border-slate-50 bg-slate-50/20 py-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" style={{ color: theme.primary }} />
                        Stage Funnel Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex items-end gap-3 max-w-4xl mx-auto h-32">
                        {summary?.stages.map((stage) => {
                            const maxCount = Math.max(...(summary?.stages.map(s => s.count) || [1]));
                            const height = stage.count > 0 ? (stage.count / maxCount) * 100 : 10;

                            return (
                                <div key={stage.name} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full rounded-t-xl transition-all duration-700 hover:opacity-80 relative group/bar"
                                        style={{
                                            height: `${height}%`,
                                            backgroundColor: stage.name.toLowerCase() === 'active' || stage.name.toLowerCase() === 'in progress' ? theme.primary :
                                                stage.name.toLowerCase() === 'completed' ? '#10b981' :
                                                    stage.name.toLowerCase() === 'qualified' ? `${theme.primary}80` : '#94a3b8'
                                        }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold uppercase tracking-tighter shadow-xl">
                                            {stage.count} Deals • {formatCurrency(summary?.totalValue * (height / 100))}
                                        </div>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            {stage.name}
                                        </p>
                                        <p className="text-[11px] font-black text-slate-900 mt-1">{stage.count}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Pipeline Projects */}
            <Card className="border-slate-200/60 shadow-md">
                <CardHeader className="border-b border-slate-50 bg-slate-50/20 py-4">
                    <CardTitle className="text-lg font-bold">Active Conversion List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {pipelineProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/30">
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                    <Calendar className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-400">No active opportunities found in current view.</p>
                            </div>
                        ) : (
                            pipelineProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-all group"
                                >
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                            <h3 className="font-bold text-slate-900 text-lg tracking-tight truncate max-w-md">
                                                {project.name}
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-black tracking-widest uppercase py-0 px-2 h-5 border-slate-200"
                                                style={{ color: theme.primary, backgroundColor: `${theme.primary}05`, borderColor: `${theme.primary}10` }}
                                            >
                                                {project.company_name}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] font-black tracking-widest uppercase py-0 px-2 h-5 bg-slate-100 text-slate-600"
                                            >
                                                {project.stage}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                                                <DollarSign className="h-3.5 w-3.5" />
                                                {formatCurrency(project.estimated_value)}
                                            </div>
                                            <div className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Expected {project.expected_close}
                                            </div>
                                            <div className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
                                                <Badge variant="outline" className="border-slate-100 text-[10px] font-bold text-slate-400">
                                                    Client: {project.client}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Win Bio</p>
                                            <p className="text-2xl font-black text-green-600 tabular-nums">
                                                {project.probability}%
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="font-bold h-10 px-4 transition-all hover:bg-slate-900 hover:text-white"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            View Roadmap
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
