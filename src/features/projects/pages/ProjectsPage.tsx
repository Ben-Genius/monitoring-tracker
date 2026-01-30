import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency, calculateProfitability } from '@/lib/utils';

const mockProjects = [
    {
        id: '1',
        name: 'Site Alpha',
        company: 'Macwest',
        status: 'active',
        contractValue: 500000,
        actualCost: 120000,
        expectedHandover: '2026-03-15',
        tasksCompleted: 45,
        totalTasks: 60,
    },
    {
        id: '2',
        name: 'Bridge B',
        company: 'Cypress',
        status: 'active',
        contractValue: 800000,
        actualCost: 704000,
        expectedHandover: '2026-04-20',
        tasksCompleted: 32,
        totalTasks: 50,
    },
    {
        id: '3',
        name: 'Housing Block 1',
        company: 'Northbrook',
        status: 'active',
        contractValue: 1200000,
        actualCost: 1164000,
        expectedHandover: '2026-05-10',
        tasksCompleted: 78,
        totalTasks: 90,
    },
];

export default function ProjectsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                    <p className="text-gray-500 mt-1">
                        Manage and track all company projects
                    </p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                </Button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {mockProjects.map((project) => {
                    const profitability = calculateProfitability(
                        project.contractValue,
                        project.actualCost
                    );
                    const completionRate = Math.round(
                        (project.tasksCompleted / project.totalTasks) * 100
                    );

                    return (
                        <Card key={project.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{project.name}</CardTitle>
                                        <Badge
                                            variant={
                                                project.company === 'Macwest'
                                                    ? 'macwest'
                                                    : project.company === 'Cypress'
                                                        ? 'cypress'
                                                        : 'northbrook'
                                            }
                                            className="mt-2"
                                        >
                                            {project.company}
                                        </Badge>
                                    </div>
                                    <Badge
                                        variant={
                                            profitability.status === 'healthy'
                                                ? 'success'
                                                : profitability.status === 'at_risk'
                                                    ? 'warning'
                                                    : 'destructive'
                                        }
                                    >
                                        {profitability.percentage.toFixed(1)}% margin
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Financial Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Contract Value</span>
                                        <span className="font-semibold">
                                            {formatCurrency(project.contractValue)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Actual Cost</span>
                                        <span className="font-semibold">
                                            {formatCurrency(project.actualCost)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Profit</span>
                                        <span
                                            className={`font-semibold flex items-center ${profitability.profit > 0
                                                    ? 'text-success'
                                                    : 'text-error'
                                                }`}
                                        >
                                            {profitability.profit > 0 ? (
                                                <TrendingUp className="h-4 w-4 mr-1" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 mr-1" />
                                            )}
                                            {formatCurrency(profitability.profit)}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-600">Progress</span>
                                        <span className="font-semibold">{completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${completionRate}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {project.tasksCompleted} of {project.totalTasks} tasks
                                        completed
                                    </p>
                                </div>

                                {/* Expected Handover */}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    <span>Handover: {project.expectedHandover}</span>
                                </div>

                                {/* Actions */}
                                <Button variant="outline" className="w-full">
                                    View Details
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
