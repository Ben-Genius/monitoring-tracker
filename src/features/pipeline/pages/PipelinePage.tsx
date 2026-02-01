import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

import { usePipeline, usePipelineSummary } from '../hooks/usePipeline';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PipelinePage() {
    const { selectedCompanyId } = useCompanyStore();
    const { data: pipelineProjects = [], isLoading: pipelineLoading } = usePipeline(selectedCompanyId);
    const { data: summary, isLoading: summaryLoading } = usePipelineSummary(selectedCompanyId);

    if (pipelineLoading || summaryLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
                    <p className="text-gray-500 mt-1">
                        Track sales opportunities and project pipeline
                    </p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Opportunity
                </Button>
            </div>

            {/* Pipeline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Total Pipeline Value
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {formatCurrency(summary?.totalValue || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Weighted Value
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {formatCurrency(summary?.weightedValue || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Opportunities
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {summary?.opportunities || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline Stages */}
            <Card>
                <CardHeader>
                    <CardTitle>Pipeline Stages</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        {summary?.stages.map((stage) => (
                            <div key={stage.name} className="flex-1">
                                <div className={`${stage.color} h-8 rounded-t-md transition-all duration-500`}
                                    style={{ opacity: stage.count > 0 ? 1 : 0.3 }} />
                                <div className="text-center mt-2">
                                    <p className="text-sm font-medium text-gray-900">
                                        {stage.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{stage.count} deals</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Pipeline Projects */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {pipelineProjects.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No active opportunities found.</p>
                        ) : (
                            pipelineProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="font-semibold text-gray-900">
                                                {project.name}
                                            </h3>
                                            <Badge variant="outline">
                                                {project.company_name}
                                            </Badge>
                                            <Badge variant="secondary">{project.stage}</Badge>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-2">
                                            <p className="text-sm text-gray-600">
                                                Client: {project.client}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Value: {formatCurrency(project.estimated_value)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Close: {project.expected_close}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Probability</p>
                                            <p className="text-lg font-bold text-green-600">
                                                {project.probability}%
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            View Details
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
