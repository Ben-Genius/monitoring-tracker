import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Calendar, Sparkles } from 'lucide-react';
import { useCompanyStore } from '@/hooks/useCompanyStore';
import { useCompanies } from '@/features/projects/hooks/useProjects';
import { getCompanyTheme } from '@/lib/utils';
import { useMemo } from 'react';

const reports = [
    {
        id: '1',
        name: 'Task Completion Report',
        description: 'Monthly task completion metrics by team and company',
        frequency: 'Monthly',
        lastGenerated: null,
    },
    {
        id: '2',
        name: 'Financial Performance',
        description: 'Project profitability and cost analysis',
        frequency: 'Quarterly',
        lastGenerated: null,
    },
    {
        id: '3',
        name: 'Idle Task Report',
        description: 'Detailed analysis of tasks with no updates in 48+ hours',
        frequency: 'On-demand',
        lastGenerated: null,
    },
    {
        id: '4',
        name: 'Pipeline Forecast',
        description: 'Sales pipeline and revenue projections',
        frequency: 'Monthly',
        lastGenerated: null,
    },
];

export default function ReportsPage() {
    const { selectedCompanyId } = useCompanyStore();
    const { data: companies = [] } = useCompanies();

    const currentCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return 'Global View';
        return companies.find(c => c.id === selectedCompanyId)?.name || '';
    }, [selectedCompanyId, companies]);

    const theme = getCompanyTheme(currentCompanyName);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
                <p className="text-slate-500 mt-1 font-medium italic">
                    Generate and export comprehensive reports {selectedCompanyId !== 'all' ? `for company context` : '(Global View)'}
                </p>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                    <Card key={report.id} className="border-slate-200/60 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="h-1 w-full" style={{ backgroundColor: theme.primary }} />
                        <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg font-bold text-slate-900">{report.name}</CardTitle>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">
                                        {report.description}
                                    </p>
                                </div>
                                <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12"
                                    style={{ backgroundColor: `${theme.primary}15` }}
                                >
                                    <FileSpreadsheet className="h-5 w-5" style={{ color: theme.primary }} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 opacity-60" />
                                    <span>Frequency: {report.frequency}</span>
                                </div>
                                <span className="opacity-60">
                                    Last: {report.lastGenerated || 'Never'}
                                </span>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <Button variant="outline" className="flex-1 font-bold h-11 border-slate-200 hover:bg-slate-50">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                                <Button
                                    className="flex-1 font-bold h-11"
                                    style={{ backgroundColor: theme.primary }}
                                >
                                    Generate Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Custom Report Builder */}
            <Card className="border-slate-200/60border-dashed relative overflow-hidden">
                <div
                    className="absolute top-0 right-0 p-8 opacity-5"
                    style={{ color: theme.primary }}
                >
                    <Sparkles size={120} />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" style={{ color: theme.primary }} />
                        Custom Report Builder
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 relative z-10">
                        <div
                            className="h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-inner"
                            style={{ backgroundColor: `${theme.primary}10` }}
                        >
                            <FileSpreadsheet className="h-10 w-10" style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">
                            Build Custom Intelligence
                        </h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                            Create tailored analytics dashboards with your own metrics, custom filters, and multi-period date ranges.
                        </p>
                        <Button
                            size="lg"
                            className="font-black px-10 h-14 rounded-2xl shadow-xl shadow-primary/25 hover:scale-105 transition-transform"
                            style={{ backgroundColor: theme.primary }}
                        >
                            Start Building Engine
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
