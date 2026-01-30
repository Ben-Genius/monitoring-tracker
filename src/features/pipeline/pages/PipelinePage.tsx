import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const pipelineProjects = [
    {
        id: '1',
        name: 'Commercial Plaza',
        client: 'ABC Corp',
        estimatedValue: 1500000,
        probability: 75,
        stage: 'Proposal',
        expectedClose: '2026-03-15',
        company: 'Macwest',
    },
    {
        id: '2',
        name: 'Residential Complex',
        client: 'XYZ Developers',
        estimatedValue: 2200000,
        probability: 60,
        stage: 'Negotiation',
        expectedClose: '2026-04-20',
        company: 'Cypress',
    },
    {
        id: '3',
        name: 'Industrial Warehouse',
        client: 'DEF Logistics',
        estimatedValue: 980000,
        probability: 90,
        stage: 'Contract',
        expectedClose: '2026-02-28',
        company: 'Northbrook',
    },
];

const stages = [
    { name: 'Lead', count: 8, color: 'bg-gray-400' },
    { name: 'Qualified', count: 5, color: 'bg-blue-400' },
    { name: 'Proposal', count: 3, color: 'bg-yellow-400' },
    { name: 'Negotiation', count: 2, color: 'bg-orange-400' },
    { name: 'Contract', count: 1, color: 'bg-green-400' },
];

export default function PipelinePage() {
    const totalValue = pipelineProjects.reduce(
        (sum, project) => sum + project.estimatedValue,
        0
    );
    const weightedValue = pipelineProjects.reduce(
        (sum, project) => sum + project.estimatedValue * (project.probability / 100),
        0
    );

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
                                    {formatCurrency(totalValue)}
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
                                    {formatCurrency(weightedValue)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-success" />
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
                                    {pipelineProjects.length}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-warning" />
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
                        {stages.map((stage) => (
                            <div key={stage.name} className="flex-1">
                                <div className={`${stage.color} h-8 rounded-t-md`} />
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
                        {pipelineProjects.map((project) => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="font-semibold text-gray-900">
                                            {project.name}
                                        </h3>
                                        <Badge
                                            variant={
                                                project.company === 'Macwest'
                                                    ? 'macwest'
                                                    : project.company === 'Cypress'
                                                        ? 'cypress'
                                                        : 'northbrook'
                                            }
                                        >
                                            {project.company}
                                        </Badge>
                                        <Badge variant="outline">{project.stage}</Badge>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-2">
                                        <p className="text-sm text-gray-600">
                                            Client: {project.client}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Value: {formatCurrency(project.estimatedValue)}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Close: {project.expectedClose}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">Probability</p>
                                        <p className="text-lg font-bold text-success">
                                            {project.probability}%
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
