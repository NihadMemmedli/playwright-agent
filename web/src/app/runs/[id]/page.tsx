'use client';
import { useState, useEffect } from 'react';
import {
    ArrowLeft, CheckCircle, Copy, Check, Image as ImageIcon, Video as VideoIcon,
    ExternalLink, Code, Layout, FileText, Eye, Globe, Chrome, Compass, Clock, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Artifact {
    name: string;
    path: string;
    type: 'image' | 'video';
}

interface VisualDiff {
    name: string;
    diff?: Artifact;
    expected?: Artifact;
    actual?: Artifact;
}

export default function RunDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetch(`http://localhost:8001/runs/${id}`)
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

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );
    if (!data) return <div className="container" style={{ paddingTop: '2rem' }}>Run not found.</div>;

    // Process Artifacts for Visual Regression
    const artifacts: Artifact[] = data.artifacts || [];
    const visualDiffs: VisualDiff[] = [];
    const standardArtifacts: Artifact[] = [];

    // Group related screenshots
    const processedIndices = new Set<number>();

    artifacts.forEach((art, index) => {
        if (processedIndices.has(index)) return;

        if (art.name.endsWith('-diff.png')) {
            const baseName = art.name.replace('-diff.png', '');
            const expected = artifacts.find(a => a.name === `${baseName}-expected.png`);
            const actual = artifacts.find(a => a.name === `${baseName}-actual.png`);

            visualDiffs.push({
                name: baseName,
                diff: art,
                expected,
                actual
            });

            processedIndices.add(index);
            if (expected) processedIndices.add(artifacts.indexOf(expected));
            if (actual) processedIndices.add(artifacts.indexOf(actual));
        } else if (!art.name.match(/-(expected|actual)\.png$/)) {
            // Only add if not part of a diff set (handled above)
            standardArtifacts.push(art);
        }
    });

    // Add orphan actual/expected if diff is missing (edge case)
    artifacts.forEach((art, index) => {
        if (!processedIndices.has(index) && !standardArtifacts.includes(art)) {
            standardArtifacts.push(art);
        }
    });

    const formatRunId = (id: string) => {
        try {
            // Extract time portion from format 2026-01-07_22-12-37
            const timePart = id.split('_')[1];
            if (timePart) {
                // Remove dashes and create a compact ID like #221237
                return `#${timePart.replace(/-/g, '')}`;
            }
            // Fallback to last 6 characters
            return `#${id.slice(-6)}`;
        } catch (e) {
            return `#${id.substring(0, 6)}`;
        }
    };


    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '1rem' }}>
            <Link href="/runs" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', paddingLeft: 0 }}>
                <ArrowLeft size={16} /> Back to Runs
            </Link>

            <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                            {data.plan?.testName || 'Test Run'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>Run ID: {formatRunId(id)}</p>
                    </div>
                    <div className={`badge badge-${data.run?.finalState === 'passed' ? 'success' : data.run?.finalState === 'failed' ? 'danger' : 'secondary'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                        {data.run?.finalState || 'Unknown Status'}
                    </div>
                </div>

                {/* Run Metadata Bar */}
                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    padding: '1rem 1.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration:</span>
                        <span style={{ fontWeight: 600 }}>{data.run?.duration ? `${data.run.duration.toFixed(2)}s` : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(() => {
                            const browser = data.run?.browser;
                            switch (browser) {
                                case 'firefox':
                                    return <Globe size={16} color="#FF7139" />;
                                case 'webkit':
                                    return <Compass size={16} color="#007AFF" />;
                                case 'chromium':
                                default:
                                    return <Chrome size={16} color="#4285F4" />;
                            }
                        })()}
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Browser:</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{data.run?.browser || 'chromium'}</span>
                    </div>
                    {data.validation?.status && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {data.validation.status === 'success' ? <CheckCircle size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Validation:</span>
                            <span style={{ fontWeight: 600, color: data.validation.status === 'success' ? 'var(--success)' : 'inherit' }}>
                                {data.validation.status === 'success' ? 'Passed' : data.validation.status}
                            </span>
                        </div>
                    )}
                    {data.report_url && (
                        <div style={{ marginLeft: 'auto' }}>
                            <a
                                href={`http://localhost:8001${data.report_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem', height: 'auto', display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
                            >
                                <ExternalLink size={14} /> View HTML Report
                            </a>
                        </div>
                    )}
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
                            <strong>Smart Run Active:</strong> Reused existing test code.
                        </div>
                    </div>
                )}
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Visual Regression Section */}
                    {visualDiffs.length > 0 && (
                        <section className="card">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                                <Eye size={20} className="text-primary" /> Visual Regression Failures
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {visualDiffs.map((diff, i) => (
                                    <div key={i} style={{ background: '#0d1117', padding: '1rem', borderRadius: 'var(--radius)' }}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>{diff.name}</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            {diff.expected && (
                                                <div>
                                                    <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected</div>
                                                    <a href={`http://localhost:8001${diff.expected.path}`} target="_blank" rel="noreferrer">
                                                        <img src={`http://localhost:8001${diff.expected.path}`} style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                                    </a>
                                                </div>
                                            )}
                                            {diff.actual && (
                                                <div>
                                                    <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Actual</div>
                                                    <a href={`http://localhost:8001${diff.actual.path}`} target="_blank" rel="noreferrer">
                                                        <img src={`http://localhost:8001${diff.actual.path}`} style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                                    </a>
                                                </div>
                                            )}
                                            {diff.diff && (
                                                <div>
                                                    <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)' }}>Diff</div>
                                                    <a href={`http://localhost:8001${diff.diff.path}`} target="_blank" rel="noreferrer">
                                                        <img src={`http://localhost:8001${diff.diff.path}`} style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--danger)' }} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="card">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                            <Layout size={20} /> Execution Plan
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.plan?.steps?.map((step: any, i: number) => (
                                <div key={i} style={{
                                    padding: '1rem',
                                    background: 'var(--surface-hover)',
                                    borderRadius: 'var(--radius)',
                                    borderLeft: '4px solid var(--primary)'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Step {i + 1}</div>
                                    <div style={{ lineHeight: 1.5 }}>{step.description}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', display: 'inline-block', borderRadius: '4px' }}>
                                        {step.action} {step.params?.selector || step.params?.url || ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                            <Code size={20} /> Generated Code
                        </h2>
                        {data.export?.testFilePath && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>File: <code style={{ background: 'var(--surface-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>{data.export.testFilePath}</code></p>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            if (data.generated_code) {
                                                navigator.clipboard.writeText(data.generated_code);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', height: 'auto' }}
                                    >
                                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                    </button>
                                </div>
                                <div style={{
                                    borderRadius: 'var(--radius)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)'
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
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
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
                            color: '#e6edf3',
                            border: '1px solid var(--border)'
                        }}>
                            {data.log || 'No logs available.'}
                        </div>
                    </section>

                    {standardArtifacts.length > 0 && (
                        <section className="card">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                                <ImageIcon size={20} /> Other Artifacts
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {standardArtifacts.map((art: any, i: number) => (
                                    <div key={i} style={{ borderRadius: 'var(--radius)', overflow: 'hidden', background: '#0d1117', border: '1px solid var(--border)' }}>
                                        {art.type === 'image' ? (
                                            <a href={`http://localhost:8001${art.path}`} target="_blank" rel="noreferrer">
                                                <img
                                                    src={`http://localhost:8001${art.path}`}
                                                    alt={art.name}
                                                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                                                />
                                            </a>
                                        ) : (
                                            <video
                                                controls
                                                src={`http://localhost:8001${art.path}`}
                                                style={{ width: '100%' }}
                                            />
                                        )}
                                        <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {art.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>

            </div>
        </div>
    );
}
