'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Save, Play } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function SpecDetailPage() {
    const params = useParams();
    const router = useRouter();

    // Handle catch-all params which come as an array
    const nameParam = params?.name;
    const rawName = Array.isArray(nameParam) ? nameParam.join('/') : (nameParam as string);
    const decodedName = decodeURIComponent(rawName || '');

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!decodedName) return;
        fetch(`http://127.0.0.1:8001/specs/${decodedName}`)
            .then(res => res.json())
            .then(data => {
                setContent(data.content);
                setOriginalContent(data.content);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [decodedName]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Re-using create spec endpoint for update, assuming it overwrites if exists
            // But wait, create spec throws 400 if exists. We need to handle this.
            // Update: User might want to edit.
            // Let's assume for now just "View" is the primary goal as per request.
            // But adding Edit support would be nice.
            // Since existing API explicitly blocks overwrite, we can't save changes without a new endpoint or flag.
            // For this MVP step, I will only implement VIEW mode to satisfy "see what is actually specs".
            // EDIT mode is a nice to have but I should be careful not to break things.
            // I will disable saving for now or just treat it as read-only view.
            alert("Edit functionality not yet implemented in backend.");
        } catch (e) {
            alert('Failed to save');
        } finally {
            setSaving(false);
            setIsEditing(false);
        }
    };

    const runTest = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8001/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spec_name: decodedName })
            });
            const data = await res.json();
            if (data.status === 'started') {
                router.push('/runs');
            }
        } catch (e) {
            alert('Failed to start run');
        }
    };

    if (loading) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            <Link href="/specs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Specs
            </Link>

            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{decodedName}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>View and run test specification.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* 
            <button className="btn" onClick={() => setIsEditing(!isEditing)} style={{ background: 'var(--surface)' }}>
                {isEditing ? 'Cancel' : <><Edit size={18} /> Edit</>}
            </button> 
            */}
                    <button className="btn btn-primary" onClick={runTest}>
                        <Play size={18} /> Run Test
                    </button>
                </div>
            </header>

            <div className="card" style={{ height: 'calc(100vh - 250px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'auto', background: '#0d1117', borderRadius: 'var(--radius)' }}>
                    <SyntaxHighlighter
                        language="markdown"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', background: '#0d1117', minHeight: '100%' }}
                        showLineNumbers={true}
                        wrapLines={true}
                    >
                        {content || ''}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
}
