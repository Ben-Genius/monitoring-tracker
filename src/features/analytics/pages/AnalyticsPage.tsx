import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';

import { useTaskDistribution } from '@/features/dashboard/hooks/useDashboard';
import {
    useCompanyPerformance,
    useMonthlyTrend,
    useTopPerformers
} from '../hooks/useAnalytics';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AnalyticsPage() {
    const { data: taskStageData = [], isLoading: taskLoading } = useTaskDistribution();
    const { data: companyPerformance = [], isLoading: companyLoading } = useCompanyPerformance();
    const { data: monthlyTrend = [], isLoading: trendLoading } = useMonthlyTrend();
    const { data: topPerformers = [], isLoading: performersLoading } = useTopPerformers();

    const isLoading = taskLoading || companyLoading || trendLoading || performersLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-500 mt-1">
                    Comprehensive insights into performance and productivity
                </p>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Stage Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Task Stage Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={taskStageData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {taskStageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Company Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Company Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={companyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="company" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                <Legend />
                                <Bar dataKey="revenue" fill="#2563eb" name="Revenue" />
                                <Bar dataKey="profit" fill="#10b981" name="Profit" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Monthly Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tasks"
                                    stroke="#2563eb"
                                    name="Tasks Completed"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    name="Revenue"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topPerformers.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No completion data yet.</p>
                            ) : (
                                topPerformers.map((performer, index) => (
                                    <div
                                        key={performer.name}
                                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {performer.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {performer.tasksCompleted} tasks completed
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">On-Time Rate</p>
                                                <p className="text-lg font-bold text-green-600">
                                                    {performer.onTimeRate}%
                                                </p>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700">Top Performer</Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
