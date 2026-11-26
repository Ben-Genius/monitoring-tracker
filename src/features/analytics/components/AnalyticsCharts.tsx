import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';

// The Analytics page's charts, in their own chunk with recharts (see AnalyticsPage).

interface TooltipPayloadEntry {
    name: string;
    value: number;
    color?: string;
    fill?: string;
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
    isCurrency?: boolean;
}

/**
 * Custom dark-mode friendly tooltip for Recharts charts
 */
function ChartTooltip({ active, payload, label, isCurrency = false }: ChartTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="rounded-xl border border-line bg-surface/95 dark:border-slate-800 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm text-xs">
            {label && (
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-line dark:border-slate-800 pb-1">
                    {label}
                </p>
            )}
            <div className="space-y-1.5">
                {payload.map((entry, index) => {
                    const value = isCurrency || entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('profit')
                        ? formatCurrency(entry.value)
                        : entry.value.toLocaleString();

                    return (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.color || entry.fill }}
                                    aria-hidden
                                />
                                {entry.name}:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                                {value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


export function StageDonut({ data, primaryColor }: { data: { name: string; value: number; color: string }[]; primaryColor: string }) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                >
                    {data.map((entry, index) => {
                        const isPrimary = entry.name.toLowerCase() === 'active' || entry.name.toLowerCase() === 'in progress';
                        return (
                            <Cell
                                key={`cell-${index}`}
                                fill={isPrimary ? primaryColor : entry.color}
                                stroke="transparent"
                            />
                        );
                    })}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function RevenueBars({ data, primaryColor }: { data: object[]; primaryColor: string }) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis
                    dataKey="company"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                />
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                />
                <Bar
                    dataKey="revenue"
                    fill={primaryColor}
                    radius={[5, 5, 0, 0]}
                    name="Contract Revenue"
                    maxBarSize={44}
                />
                <Bar
                    dataKey="profit"
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                    name="Net Profit"
                    maxBarSize={44}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function TrendLines({ data, primaryColor }: { data: object[]; primaryColor: string }) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                />
                <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                />
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="tasks"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: primaryColor, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Tasks Delivered"
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Recognized Revenue"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
