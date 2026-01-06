'use client';

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

// --- Types ---
export type TrendData = {
    date: string;
    passed: number;
    failed: number;
};

export type ErrorData = {
    category: string;
    count: number;
};

export type DurationData = {
    date: string;
    avg_duration: number;
};

// --- Theme Constants ---
const THEME = {
    axis: { stroke: '#94a3b8', fontSize: 12 },
    grid: { stroke: '#334155', strokeDasharray: '3 3' },
    tooltip: {
        contentStyle: { backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' },
        itemStyle: { color: '#f8fafc' },
        labelStyle: { color: '#94a3b8', marginBottom: '0.25rem' }
    },
    legend: { wrapperStyle: { paddingTop: '20px' } }
};

// --- Components ---

export function PassFailTrendChart({ data }: { data: TrendData[] }) {
    if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data available</div>;

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid {...THEME.grid} vertical={false} />
                <XAxis dataKey="date" {...THEME.axis} />
                <YAxis {...THEME.axis} />
                <Tooltip {...THEME.tooltip} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend {...THEME.legend} />
                <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" radius={[0, 0, 4, 4]} />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function ErrorCategoryChart({ data }: { data: ErrorData[] }) {
    if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No errors recorded</div>;

    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    innerRadius={80}  // Donut style
                    outerRadius={140} // Increased size
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                </Pie>
                <Tooltip {...THEME.tooltip} />
                <Legend {...THEME.legend} />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function DurationChart({ data }: { data: DurationData[] }) {
    if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data available</div>;

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid {...THEME.grid} vertical={false} />
                <XAxis dataKey="date" {...THEME.axis} />
                <YAxis label={{ value: 'Seconds', ...THEME.axis, angle: -90, position: 'insideLeft' }} {...THEME.axis} />
                <Tooltip {...THEME.tooltip} />
                <Legend {...THEME.legend} />
                <Line
                    type="monotone"
                    dataKey="avg_duration"
                    stroke="#3b82f6"
                    name="Avg Duration (s)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b' }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
