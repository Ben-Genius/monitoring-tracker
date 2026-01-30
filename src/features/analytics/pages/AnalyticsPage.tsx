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

const taskStageData = [
    { name: 'Talking Stage', value: 12, color: '#94a3b8' },
    { name: 'Yet to Start', value: 18, color: '#fbbf24' },
    { name: 'In Progress', value: 45, color: '#3b82f6' },
    { name: 'Blockers', value: 8, color: '#ef4444' },
    { name: 'Completed', value: 73, color: '#10b981' },
];

const companyPerformance = [
    { company: 'Macwest', projects: 8, revenue: 2400000, profit: 720000 },
    { company: 'Cypress', projects: 6, revenue: 1800000, profit: 360000 },
    { company: 'Northbrook', projects: 10, revenue: 3200000, profit: 640000 },
];

const monthlyTrend = [
    { month: 'Jan', tasks: 45, revenue: 450000 },
    { month: 'Feb', tasks: 52, revenue: 520000 },
    { month: 'Mar', tasks: 48, revenue: 480000 },
    { month: 'Apr', tasks: 61, revenue: 610000 },
    { month: 'May', tasks: 58, revenue: 580000 },
    { month: 'Jun', tasks: 67, revenue: 670000 },
];

const topPerformers = [
    { name: 'Sarah K.', tasksCompleted: 45, onTimeRate: 92 },
    { name: 'Mike R.', tasksCompleted: 38, onTimeRate: 88 },
    { name: 'John D.', tasksCompleted: 42, onTimeRate: 85 },
    { name: 'Lisa M.', tasksCompleted: 35, onTimeRate: 90 },
    { name: 'Tom B.', tasksCompleted: 31, onTimeRate: 87 },
];

export default function AnalyticsPage() {
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
                            {topPerformers.map((performer, index) => (
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
                                            <p className="text-lg font-bold text-success">
                                                {performer.onTimeRate}%
                                            </p>
                                        </div>
                                        <Badge variant="success">Top Performer</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
