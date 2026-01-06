'use client';
import { useState, useEffect } from 'react';
import { PassFailTrendChart, ErrorCategoryChart, DurationChart } from '@/components/DashboardCharts';

export default function DashboardPage() {
    const [data, setData] = useState({
        trends: [],
        errors: [],
        total_runs: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Adjust port if needed - assuming backend is on 8001 based on previous file views (page.tsx uses 8001)
        // Wait, main.py is FastAPI, usually 8000, but page.tsx used 8001. I should double check docker-compose.
        fetch('http://127.0.0.1:8001/dashboard')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="p-8">Loading dashboard...</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '1400px', padding: '2rem' }}>
            <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Reporting Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Analytics overview for <strong style={{ color: 'var(--primary)' }}>{data.total_runs}</strong> test runs.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>

                {/* Row 1: Trends and Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 className="mb-6 text-xl font-bold" style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>Pass/Fail Trends</h3>
                        <PassFailTrendChart data={data.trends} />
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 className="mb-6 text-xl font-bold" style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>Average Duration (Daily)</h3>
                        <DurationChart data={data.trends} />
                    </div>
                </div>

                {/* Row 2: Errors */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 className="mb-6 text-xl font-bold" style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>Top Error Categories</h3>
                    <div style={{ height: '400px', display: 'flex', justifyContent: 'center' }}>
                        <ErrorCategoryChart data={data.errors} />
                    </div>
                </div>
            </div>
        </div>
    );
}
