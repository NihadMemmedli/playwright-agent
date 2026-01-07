'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
    const [stats, setStats] = useState({
        total_specs: 0,
        total_runs: 0,
        success_rate: 0,
        last_run: 'Never'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:8001/dashboard')
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

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Overview of your test automation suite.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card">
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Specs</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                        {loading ? '-' : stats.total_specs}
                    </p>
                </div>
                <div className="card">
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Success Rate</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
                        {loading ? '-' : `${stats.success_rate}%`}
                    </p>
                </div>
                <div className="card">
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Last Run</h3>
                    <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                        {loading ? '-' : stats.last_run}
                    </p>
                </div>
            </div>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Quick Actions</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <Link href="/specs/new" className="card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'inherit' }}>
                        <h3 style={{ fontWeight: 600 }}>Create New Spec</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Write a new test using natural language.</p>
                    </Link>
                    <Link href="/runs" className="card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'inherit' }}>
                        <h3 style={{ fontWeight: 600 }}>View Test Runs</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Check results of recent executions.</p>
                    </Link>
                </div>
            </section>
        </div>
    );
}
