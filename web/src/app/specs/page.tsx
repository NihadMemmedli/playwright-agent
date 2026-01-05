'use client';
import { useState, useEffect } from 'react';
import { FileText, Plus, Play } from 'lucide-react';
import Link from 'next/link';

interface Spec {
    name: string;
    path: string;
    content: string;
}

export default function SpecsPage() {
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:8001/specs')
            .then(res => res.json())
            .then(data => {
                setSpecs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const runTest = async (specName: string) => {
        try {
            const res = await fetch('http://127.0.0.1:8001/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spec_name: specName })
            });
            const data = await res.json();
            if (data.status === 'started') {
                alert('Run started! Check Runs tab.');
            }
        } catch (e) {
            alert('Failed to start run');
        }
    };

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Test Specs</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your test specifications.</p>
                </div>
                <Link href="/specs/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Plus size={18} />
                    New Spec
                </Link>
            </header>

            {loading ? (
                <p>Loading specs...</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {specs.map(spec => (
                        <div key={spec.name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary)'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 600 }}>
                                        <Link href={`/specs/${spec.name}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            {spec.name}
                                        </Link>
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {spec.path}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}
                                    onClick={() => runTest(spec.name)}
                                >
                                    <Play size={16} />
                                    Run
                                </button>
                            </div>
                        </div>
                    ))}

                    {specs.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No specs found. Create one to get started.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
