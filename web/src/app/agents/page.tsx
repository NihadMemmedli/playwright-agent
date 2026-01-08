'use client';
import { useState, useEffect, useRef } from 'react';
import { Bot, FileText, Play, Terminal, ChevronRight, CheckCircle2, AlertTriangle, Loader2, Clock, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgentRun {
    id: string;
    agent_type: string;
    status: string;
    created_at: string;
    config: any;
    summary?: string;
    result?: any;
}

export default function AgentsPage() {
    const [selectedAgent, setSelectedAgent] = useState<'exploratory' | 'writer'>('exploratory');
    const [url, setUrl] = useState('');
    const [instructions, setInstructions] = useState('');

    const [history, setHistory] = useState<AgentRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [activeRun, setActiveRun] = useState<AgentRun | null>(null);

    const [isStarting, setIsStarting] = useState(false);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Fetch history
    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8001/api/agents/runs');
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (e) { console.error("Failed to fetch history", e); }
    };

    useEffect(() => {
        fetchHistory();
        return () => { if (pollInterval.current) clearInterval(pollInterval.current); }
    }, []);

    // Fetch single run
    const fetchRun = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:8001/api/agents/runs/${id}`);
            if (res.ok) {
                const data = await res.json();
                setActiveRun(data);

                // If actively running, keep polling
                if (data.status === 'running' || data.status === 'pending') {
                    // Continue polling
                } else {
                    // Stop polling if this was the selected one
                    if (pollInterval.current && selectedRunId === id) {
                        clearInterval(pollInterval.current);
                        pollInterval.current = null;
                        fetchHistory(); // Refresh list to update status
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch run", e);
        }
    };

    // When selection changes
    useEffect(() => {
        if (!selectedRunId) {
            setActiveRun(null);
            return;
        }

        // Clear existing poll
        if (pollInterval.current) clearInterval(pollInterval.current);

        // Initial fetch
        fetchRun(selectedRunId);

        // Start polling
        pollInterval.current = setInterval(() => {
            fetchRun(selectedRunId);
        }, 2000); // 2s poll

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [selectedRunId]);


    const handleRun = async () => {
        if (!url) {
            alert("URL is required");
            return;
        }

        setIsStarting(true);
        try {
            const res = await fetch('http://localhost:8001/api/agents/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_type: selectedAgent,
                    config: {
                        url,
                        instructions,
                        max_steps: 10
                    }
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Agent run failed');
            }

            const data = await res.json();
            // Refresh history but select the new run
            await fetchHistory();
            setSelectedRunId(data.run_id);

        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsStarting(false);
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short' });
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '1rem', paddingBottom: '4rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Bot size={28} color="var(--primary)" />
                    Autonomous Agents
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Deploy AI agents to explore, test, and specify your application autonomously.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 350px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>

                {/* History Sidebar */}
                <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Run History</h3>
                        <button onClick={fetchHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <RotateCcw size={14} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {history.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                No runs yet.
                            </div>
                        ) : (
                            history.map(run => (
                                <div
                                    key={run.id}
                                    onClick={() => setSelectedRunId(run.id)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        background: selectedRunId === run.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                        borderLeft: selectedRunId === run.id ? '3px solid var(--primary)' : '3px solid transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: run.agent_type === 'writer' ? 'var(--primary)' : '#eab308' }}>
                                            {run.agent_type === 'writer' ? 'Writer' : 'Explorer'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(run.created_at)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                                        {run.config.url.replace('https://', '')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                        {run.status === 'running' ? <Loader2 size={12} className="spin" color="var(--primary)" /> :
                                            run.status === 'failed' ? <AlertTriangle size={12} color="#ef4444" /> :
                                                <CheckCircle2 size={12} color="var(--success)" />}
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{run.status}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Left Column: Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>

                    {/* Agent Selection */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '0.9rem' }}>New Run</h3>
                        </div>
                        <div style={{ padding: '0.5rem' }}>
                            <div
                                onClick={() => setSelectedAgent('exploratory')}
                                style={{
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    background: selectedAgent === 'exploratory' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    border: selectedAgent === 'exploratory' ? '1px solid var(--primary)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    marginBottom: '0.5rem',
                                    display: 'flex', gap: '0.75rem'
                                }}
                            >
                                <Terminal size={20} color={selectedAgent === 'exploratory' ? 'var(--primary)' : 'var(--text-secondary)'} />
                                <div>
                                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedAgent === 'exploratory' ? 'var(--primary)' : 'var(--text)' }}>Exploratory Tester</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Explore for errors.
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={() => setSelectedAgent('writer')}
                                style={{
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    background: selectedAgent === 'writer' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    border: selectedAgent === 'writer' ? '1px solid var(--primary)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    display: 'flex', gap: '0.75rem'
                                }}
                            >
                                <FileText size={20} color={selectedAgent === 'writer' ? 'var(--primary)' : 'var(--text-secondary)'} />
                                <div>
                                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedAgent === 'writer' ? 'var(--primary)' : 'var(--text)' }}>Test Case Writer</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Generate test spec.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Form */}
                    <div className="card" style={{ padding: '1.25rem', flexShrink: 0 }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem' }}>Target URL</label>
                            <input
                                type="text"
                                placeholder="https://example.com"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.6rem', borderRadius: '6px', fontSize: '0.9rem',
                                    border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem' }}>Instructions (Optional)</label>
                            <textarea
                                placeholder={selectedAgent === 'exploratory' ? "Focus on the checkout flow..." : "Generate a spec for the login page..."}
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                rows={4}
                                style={{
                                    width: '100%', padding: '0.6rem', borderRadius: '6px', fontSize: '0.9rem',
                                    border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleRun}
                            disabled={isStarting}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem',
                                background: 'var(--primary)', color: 'white', fontWeight: 600, border: 'none', cursor: isStarting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                opacity: isStarting ? 0.7 : 1
                            }}
                        >
                            {isStarting ? <><Loader2 className="spin" size={16} /> Starting...</> : <><Play size={16} /> Start Agent</>}
                        </button>
                    </div>
                </div>

                {/* Right Column: Output */}
                <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {activeRun ? `Result: ${activeRun.config.url}` : 'Agent Output'}
                        </h3>
                        {activeRun && (
                            <span style={{
                                fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px',
                                background: activeRun.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : activeRun.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: activeRun.status === 'completed' ? 'var(--success)' : activeRun.status === 'failed' ? '#ef4444' : 'var(--primary)'
                            }}>
                                {activeRun.status}
                            </span>
                        )}
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', background: 'var(--surface)' }}>
                        {!activeRun ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                                <Bot size={64} style={{ marginBottom: '1rem' }} />
                                <p>Select a run from history or start a new one.</p>
                            </div>
                        ) : activeRun.status === 'running' ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <Loader2 size={48} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                                <p>Agent is working...</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>This may take a few minutes.</p>
                            </div>
                        ) : activeRun.status === 'failed' ? (
                            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={18} /> Run Failed
                                </h4>
                                <p style={{ marginTop: '0.5rem', fontFamily: 'monospace' }}>
                                    {activeRun.result?.error || "Unknown error occurred"}
                                </p>
                            </div>
                        ) : (
                            // Completed successfully
                            <div className="markdown-content">
                                {activeRun.agent_type === 'writer' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(activeRun.result.spec_content || '')}
                                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Copy Spec
                                            </button>
                                        </div>
                                        <div style={{ background: '#1e1e1e', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', color: '#e5e5e5' }}>
                                                {activeRun.result.spec_content || JSON.stringify(activeRun.result, null, 2)}
                                            </pre>
                                        </div>
                                    </>
                                ) : (
                                    // Exploratory Result
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                                            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Summary</h4>
                                            <p>{activeRun.result.summary}</p>
                                        </div>

                                        {/* Issues */}
                                        {activeRun.result.issues_found && activeRun.result.issues_found.length > 0 ? (
                                            <div>
                                                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#ef4444' }}>Issues Found ({activeRun.result.issues_found.length})</h4>
                                                {activeRun.result.issues_found.map((issue: any, i: number) => (
                                                    <div key={i} style={{ padding: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>{issue.type}:</span>
                                                        {issue.description}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <CheckCircle2 size={20} /> No issues found.
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {activeRun.result.actions_performed && (
                                            <div>
                                                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Actions Log</h4>
                                                <div style={{ background: '#0f0f0f', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto' }}>
                                                    {activeRun.result.actions_performed.map((action: any, i: number) => (
                                                        <div key={i} style={{ marginBottom: '0.25rem', color: '#a3a3a3' }}>
                                                            <span style={{ color: 'var(--primary)' }}>[{action.step}]</span> {action.action} {action.target} - {action.outcome}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
