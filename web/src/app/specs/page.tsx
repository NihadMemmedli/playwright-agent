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
    const [searchTerm, setSearchTerm] = useState('');
    const [groupedSpecs, setGroupedSpecs] = useState<Record<string, Spec[]>>({});

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

    useEffect(() => {
        if (!specs.length) return;

        // Filter
        const filtered = specs.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Group
        const groups: Record<string, Spec[]> = {};
        filtered.forEach(spec => {
            const parts = spec.name.split('/');
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Root';
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(spec);
        });

        setGroupedSpecs(groups);
    }, [specs, searchTerm]);

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
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Test Specs</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Manage your test specifications.</p>
                    </div>
                    <Link href="/specs/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                        <Plus size={18} />
                        New Spec
                    </Link>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search specs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 2.5rem',
                            background: '#0d1117',
                            border: '1px solid #30363d',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.95rem'
                        }}
                    />
                    <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                </div>
            </header>

            {loading ? (
                <p>Loading specs...</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(groupedSpecs).length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No specs found.</p>
                        </div>
                    )}

                    {Object.entries(groupedSpecs).sort().map(([folder, folderSpecs]) => (
                        <div key={folder}>
                            {folder !== 'Root' && (
                                <h3 style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.8rem',
                                    letterSpacing: '0.05em',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    {folder}
                                </h3>
                            )}

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {folderSpecs.map(spec => (
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
                                                        {spec.name.split('/').pop()}
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
