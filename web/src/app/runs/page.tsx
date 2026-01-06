'use client';
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, PlayCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Run {
    id: string;
    timestamp: string;
    status: string;
    test_name?: string;
    steps_completed: number;
    total_steps: number;
}

export default function RunsPage() {
    const [runs, setRuns] = useState<Run[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:8001/runs')
            .then(res => res.json())
            .then(data => {
                setRuns(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
            case 'passed':
            case 'success':
                return <CheckCircle size={20} color="var(--success)" />;
            case 'failed':
            case 'failure':
                return <XCircle size={20} color="var(--danger)" />;
            case 'in_progress':
            case 'running':
                return <PlayCircle size={20} color="var(--primary)" />;
            case 'pending':
                return <Clock size={20} color="var(--text-secondary)" />;
            default: return <AlertCircle size={20} color="var(--text-secondary)" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'passed':
            case 'success':
                return <span className="badge badge-success">Passed</span>;
            case 'failed':
            case 'failure':
                return <span className="badge badge-danger">Failed</span>;
            case 'in_progress':
            case 'running':
                return <span className="badge badge-primary">Running</span>;
            case 'pending':
                return <span className="badge badge-secondary">Pending</span>;
            default: return <span className="badge badge-secondary">{status}</span>;
        }
    };

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Test Runs</h1>
                <p style={{ color: 'var(--text-secondary)' }}>History of your test executions.</p>
            </header>

            {loading ? (
                <p>Loading runs...</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {runs.map(run => (
                        <Link key={run.id} href={`/runs/${run.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'var(--surface-hover)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {getStatusIcon(run.status)}
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{run.test_name || 'Unknown Test'}</h3>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={14} /> {run.timestamp}
                                        </span>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {run.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {getStatusBadge(run.status)}
                                {run.total_steps > 0 && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        {run.steps_completed} / {run.total_steps} steps
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}

                    {runs.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No runs found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
