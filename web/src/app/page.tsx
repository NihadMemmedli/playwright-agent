'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import {
    FileText, CheckCircle2, PlayCircle, BarChart2, ArrowUpRight,
    Activity, ArrowRight, Plus
} from 'lucide-react';

export default function Home() {
    // Define proper interface for state
    interface Stats {
        total_specs: number;
        total_runs: number;
        success_rate: number;
        last_run: string;
        trends: Array<{ date: string, passed: number, failed: number }>;
        errors: Array<{ category: string, count: number }>;
    }

    const [stats, setStats] = useState<Stats>({
        total_specs: 0,
        total_runs: 0,
        success_rate: 0,
        last_run: 'Never',
        trends: [],
        errors: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8001/dashboard')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '1rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Overview of your test automation suite.
                </p>
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Specs</p>
                            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.total_specs}</h3>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
                            <FileText size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ArrowUpRight size={14} /> Active
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Success Rate</p>
                            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.success_rate}%</h3>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)' }}>
                            <Activity size={20} />
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${stats.success_rate}%`, height: '100%', background: 'var(--success)' }}></div>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Runs</p>
                            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.total_runs}</h3>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', color: '#8b5cf6' }}>
                            <PlayCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Last Run</p>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {stats.last_run === 'Never' ? 'Never' : stats.last_run.split('_')[0]}
                            </h3>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                            <BarChart2 size={20} />
                        </div>
                    </div>
                    {stats.last_run !== 'Never' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {stats.last_run.split('_').slice(1).join(':').replace(/-/g, ':')}
                        </p>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', minHeight: '400px' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Execution Trends
                    </h3>
                    {stats.trends && stats.trends.length > 0 ? (
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.trends}>
                                    <defs>
                                        <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--text-secondary)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                    />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="passed"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorPassed)"
                                        name="Passed"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="failed"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorFailed)"
                                        name="Failed"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <p>No enough data for trends</p>
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Top Failure Categories
                    </h3>
                    {stats.errors && stats.errors.length > 0 ? (
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.errors} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="category"
                                        type="category"
                                        width={100}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--surface-hover)' }}
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.errors.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: 'var(--success)' }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <p>No failures recorded!</p>
                        </div>
                    )}
                </div>
            </div>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quick Actions</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <Link href="/specs/new" className="card hover-card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'inherit', padding: '1.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--surface-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                            <Plus size={20} />
                        </div>
                        <h3 style={{ fontWeight: 600 }}>Create New Spec</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Write a new test using natural language.</p>
                    </Link>
                    <Link href="/runs" className="card hover-card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'inherit', padding: '1.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--surface-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                            <PlayCircle size={20} />
                        </div>
                        <h3 style={{ fontWeight: 600 }}>View Test Runs</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Check results of recent executions.</p>
                    </Link>
                </div>
            </section>
        </div>
    );
}
