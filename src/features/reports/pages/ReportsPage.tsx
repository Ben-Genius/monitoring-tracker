import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';

const reports = [
    {
        id: '1',
        name: 'Task Completion Report',
        description: 'Weekly task completion metrics by team and company',
        frequency: 'Weekly',
        lastGenerated: '2026-01-28',
    },
    {
        id: '2',
        name: 'Financial Performance',
        description: 'Project profitability and cost analysis',
        frequency: 'Monthly',
        lastGenerated: '2026-01-01',
    },
    {
        id: '3',
        name: 'Idle Task Report',
        description: 'Tasks with no updates in 48+ hours',
        frequency: 'Daily',
        lastGenerated: '2026-01-30',
    },
    {
        id: '4',
        name: 'Pipeline Forecast',
        description: 'Sales pipeline and revenue projections',
        frequency: 'Monthly',
        lastGenerated: '2026-01-01',
    },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-500 mt-1">
                    Generate and export comprehensive reports
                </p>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                    <Card key={report.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{report.name}</CardTitle>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {report.description}
                                    </p>
                                </div>
                                <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center text-gray-600">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    <span>Frequency: {report.frequency}</span>
                                </div>
                                <span className="text-gray-500">
                                    Last: {report.lastGenerated}
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="outline" className="flex-1">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                                <Button className="flex-1">Generate Report</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Custom Report Builder */}
            <Card>
                <CardHeader>
                    <CardTitle>Custom Report Builder</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Build Custom Reports
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Create custom reports with your own metrics, filters, and date
                            ranges
                        </p>
                        <Button>Start Building</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
