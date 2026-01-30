import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    ArrowUpRight,
    FileEdit,
    Users,
    FolderKanban,
    CheckCircle2,
    DollarSign
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import {
    AreaChart,
    Area,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Mock data for charts (replace with real data hook later)
const performanceData = [
    { name: 'Week 1', value: 4000 },
    { name: 'Week 2', value: 3000 },
    { name: 'Week 3', value: 5000 },
    { name: 'Week 4', value: 2780 },
    { name: 'Week 5', value: 1890 },
    { name: 'Week 6', value: 2390 },
    { name: 'Week 7', value: 3490 },
    { name: 'Week 8', value: 4200 },
];

const taskDistributionData = [
    { name: 'In Progress', value: 400, color: '#3b82f6' }, // Blue
    { name: 'Completed', value: 300, color: '#22c55e' },  // Green
    { name: 'On Hold', value: 100, color: '#f59e0b' },    // Orange
    { name: 'Late', value: 50, color: '#ef4444' },        // Red
];

// Mock recent activity
const recentActivity = [
    {
        id: 1,
        user: 'John Doe',
        action: 'updated Project Cypress',
        time: '2m ago',
        type: 'edit', // icon type
        details: 'Updated documentation and adjusted the quarterly roadmap for Q3.'
    },
    {
        id: 2,
        user: 'New milestone reached in Northbrook',
        action: 'Development Phase 2 has been completed ahead of schedule',
        time: '45m ago',
        type: 'flag',
        details: ''
    },
    {
        id: 3,
        user: 'Sarah Connor',
        action: 'joined Project Macwest',
        time: '2h ago',
        type: 'user',
        details: 'Assigned as Senior UX Lead for the mobile app redesign.'
    }
];

export default function DashboardPage() {
    const { data: stats, isLoading: statsLoading } = useDashboardStats();

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const statsCards = [
        {
            title: 'Total Projects',
            value: stats?.totalProjects.toString() || '0',
            change: 5.2,
            icon: FolderKanban,
            color: 'bg-blue-500', // line color visual
        },
        {
            title: 'Active Tasks',
            value: stats?.activeTasks.toString() || '0',
            change: 12.1,
            icon: Activity,
            color: 'bg-orange-500',
        },
        {
            title: 'Completion Rate',
            value: '92%',
            change: 2.4,
            icon: CheckCircle2,
            color: 'bg-green-500',
        },
        {
            title: 'Profitability',
            value: formatCurrency(stats?.totalRevenue || 2400000), // Mock if 0
            change: 8.7,
            icon: DollarSign,
            color: 'bg-indigo-500',
        },
    ];

    return (
        <div className="space-y-8 p-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Overview of project performance</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" />
                                    +{stat.change}%
                                </Badge>
                            </div>
                            {/* Decorative Analysis Line */}
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                                <div className={`h-full ${stat.color} rounded-full`} style={{ width: '70%' }}></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Trend */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Performance Trend</h3>
                                <p className="text-sm text-gray-500">Project velocity over the last 30 days</p>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs">
                                Export
                            </Button>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Task Distribution */}
                <Card>
                    <CardContent className="p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Task Distribution</h3>
                            <p className="text-sm text-gray-500">Current breakdown by status</p>
                        </div>
                        <div className="h-[200px] w-full flex items-center justify-center relative">
                            {/* Inner Circle Label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900">{stats?.activeTasks || 842}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={taskDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {taskDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom Legend */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {taskDistributionData.map((item) => (
                                <div key={item.name} className="flex items-center text-sm">
                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-gray-600">{item.name}</span>
                                    <span className="ml-auto font-medium text-gray-900">{Math.round((item.value / 850) * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/5">
                            View All Activities
                        </Button>
                    </div>
                    <div className="space-y-6">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex gap-4 group">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                    ${activity.type === 'edit' ? 'bg-blue-50 text-blue-600' :
                                        activity.type === 'flag' ? 'bg-green-50 text-green-600' :
                                            'bg-purple-50 text-purple-600'}
                                `}>
                                    {activity.type === 'edit' && <FileEdit className="w-5 h-5" />}
                                    {activity.type === 'flag' && <FolderKanban className="w-5 h-5" />}
                                    {activity.type === 'user' && <Users className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 border-b border-gray-100 pb-6 group-last:border-0 group-last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {activity.type !== 'flag' && <span className="font-bold">{activity.user} </span>}
                                                {activity.type === 'flag' && <span className="font-bold">{activity.user} </span>}
                                                <span className="text-gray-600">{activity.action}</span>
                                            </p>
                                            {activity.details && (
                                                <p className="text-sm text-gray-500 mt-1">{activity.details}</p>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
