'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, PlayCircle, AlertCircle, FileText, Layout, Code, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
export default function RunDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);


    useEffect(() => {
        if (!id) return;
        fetch(`http://127.0.0.1:8001/runs/${id}`)
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="container">Loading...</div>;
    if (!data) return <div className="container">Run not found.</div>;

    return (
        <div className="container">
            <Link href="/runs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Runs
            </Link>

            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                            {data.plan?.testName || 'Test Run'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>ID: {id}</p>
                    </div>
                    <div className="badge" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                        {data.run?.finalState || 'Unknown Status'}
                    </div>
                </div>

                {data.run?.notes?.some((note: string) => note.includes('Reused existing code')) && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(46, 160, 67, 0.15)',
                        border: '1px solid rgba(46, 160, 67, 0.4)',
                        borderRadius: 'var(--radius)',
                        color: '#3fb950',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <CheckCircle size={20} />
                        <div>
                            <strong>Smart Run Active:</strong> We found an existing generated test for this spec and reused it.
                        </div>
                    </div>
                )}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <section className="card">
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layout size={20} /> Execution Plan
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.plan?.steps?.map((step: any, i: number) => (
                                <div key={i} style={{
                                    padding: '1rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 'var(--radius)',
                                    borderLeft: '4px solid var(--primary)'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Step {i + 1}</div>
                                    <div>{step.description}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                                        {step.action} {JSON.stringify(step.params)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card">
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Code size={20} /> Generated Code
                        </h2>
                        {data.export?.testFilePath && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <p style={{ margin: 0 }}>Generated file: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{data.export.testFilePath}</code></p>
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            if (data.generated_code) {
                                                navigator.clipboard.writeText(data.generated_code);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', height: 'auto', background: 'var(--surface)', color: 'white' }}
                                    >
                                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Code</>}
                                    </button>
                                </div>
                                <div style={{
                                    borderRadius: 'var(--radius)',
                                    overflow: 'hidden',
                                    marginTop: '0.5rem'
                                }}>
                                    <SyntaxHighlighter
                                        language="typescript"
                                        style={vscDarkPlus}
                                        customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', background: '#0d1117' }}
                                        showLineNumbers={true}
                                    >
                                        {data.generated_code || '// Code content not available'}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="card">
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} /> Execution Log
                        </h2>
                        <div style={{
                            background: '#0d1117',
                            padding: '1rem',
                            borderRadius: 'var(--radius)',
                            maxHeight: '400px',
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            color: '#e6edf3'
                        }}>
                            {data.log || 'No logs available.'}
                        </div>
                    </section>

                </div>

                <div>
                    <section className="card">
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Run Details</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration</div>
                                <div style={{ fontWeight: 600 }}>{data.run?.duration ? `${data.run.duration.toFixed(2)}s` : '-'}</div>
                            </li>
                            <li>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</div>
                                <div style={{ fontWeight: 600 }}>{data.run?.finalState || 'Pending'}</div>
                            </li>
                            <li>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Validation</div>
                                <div style={{ fontWeight: 600 }}>
                                    {data.validation?.status === 'success' ? (
                                        <span style={{ color: 'var(--success)' }}>Passed</span>
                                    ) : (
                                        <span>{data.validation?.status || '-'}</span>
                                    )}
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
