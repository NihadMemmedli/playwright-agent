'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Activity, Clock, Plus, List, ArrowRight } from 'lucide-react';

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

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === 'Never') return 'Never';
        try {
            const [datePart, timePart] = dateString.split('_');
            const [year, month, day] = datePart.split('-');
            const [hour, minute] = timePart.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '2rem' }}>
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Overview of your test automation suite.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                {/* Total Specs Card */}
                <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 40, height: 40,
                            borderRadius: '10px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <FileText size={20} />
                        </div>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Specs</h3>
                    </div>
                    <div>
                        <p style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
                            {loading ? '-' : stats.total_specs}
                        </p>
                    </div>
                </div>

                {/* Success Rate Card */}
                <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 40, height: 40,
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Activity size={20} />
                        </div>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</h3>
                    </div>
                    <div>
                        <p style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: 'var(--success)' }}>
                            {loading ? '-' : `${stats.success_rate}%`}
                        </p>
                    </div>
                </div>

                {/* Last Run Card */}
                <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 40, height: 40,
                            borderRadius: '10px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: 'var(--warning)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Clock size={20} />
                        </div>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Run</h3>
                    </div>
                    <div>
                        <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.5, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {loading ? '-' : formatDate(stats.last_run)}
                        </p>
                    </div>
                </div>
            </div>

            <section>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Quick Actions</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    <Link href="/specs/new" className="card" style={{
                        textDecoration: 'none',
                        padding: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: 56, height: 56,
                                borderRadius: '16px',
                                background: 'var(--surface-hover)',
                                color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Plus size={28} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text)' }}>Create New Spec</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Write a new test using natural language.</p>
                            </div>
                        </div>
                        <ArrowRight size={24} color="var(--text-secondary)" />
                    </Link>

                    <Link href="/runs" className="card" style={{
                        textDecoration: 'none',
                        padding: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: 56, height: 56,
                                borderRadius: '16px',
                                background: 'var(--surface-hover)',
                                color: 'var(--success)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <List size={28} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text)' }}>View Test Runs</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Check results of recent executions.</p>
                            </div>
                        </div>
                        <ArrowRight size={24} color="var(--text-secondary)" />
                    </Link>

                </div>
            </section>
        </div>
    );
}
