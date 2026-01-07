'use client';
import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, PlayCircle, AlertCircle, FileText, ChevronRight, Timer } from 'lucide-react';
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
        fetch('http://localhost:8001/runs')
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

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed':
            case 'passed':
            case 'success':
                return {
                    icon: <CheckCircle2 size={24} />,
                    color: 'var(--success)',
                    bg: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    label: 'Passed'
                };
            case 'failed':
            case 'failure':
                return {
                    icon: <XCircle size={24} />,
                    color: 'var(--danger)',
                    bg: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    label: 'Failed'
                };
            case 'in_progress':
            case 'running':
                return {
                    icon: <PlayCircle size={24} />,
                    color: 'var(--primary)',
                    bg: 'rgba(59, 130, 246, 0.1)',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                    label: 'Running'
                };
            case 'pending':
                return {
                    icon: <Clock size={24} />,
                    color: 'var(--text-secondary)',
                    bg: 'var(--surface)',
                    borderColor: 'var(--border)',
                    label: 'Pending'
                };
            default: return {
                icon: <AlertCircle size={24} />,
                color: 'var(--text-secondary)',
                bg: 'var(--surface)',
                borderColor: 'var(--border)',
                label: status
            };
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>Test Runs</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    History of your automated test executions.
                </p>
            </header>

            {runs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <FileText size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>No runs found yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Execute your first test to see runs here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {runs.map(run => {
                        const status = getStatusConfig(run.status);
                        return (
                            <Link key={run.id} href={`/runs/${run.id}`} className="list-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div className="status-icon-wrapper" style={{
                                        color: status.color,
                                        background: status.bg,
                                        border: `1px solid ${status.borderColor}`
                                    }}>
                                        {status.icon}
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                            {run.test_name || 'Unnamed Test Execution'}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>#{run.id.substring(0, 8)}</span>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <Clock size={14} />
                                                {run.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    {run.total_steps > 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '0.5rem',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.875rem',
                                            width: '120px'
                                        }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                                {run.steps_completed}/{run.total_steps}
                                            </span>
                                            <span>steps</span>
                                        </div>
                                    ) : (
                                        <div style={{ width: '120px' }}></div>
                                    )}
                                    <div style={{
                                        width: '100px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        padding: '0.35rem 0',
                                        borderRadius: '999px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        background: status.bg,
                                        color: status.color,
                                        border: `1px solid ${status.borderColor}`
                                    }}>
                                        {status.label}
                                    </div>
                                    <ChevronRight size={20} color="var(--text-secondary)" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
