'use client';
import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewSpecPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    // Default template
    const template = `# Test: [Name]

## Description
[Description of what the test does]

## Steps
1. Navigate to [URL]
2. [Action]
3. [Assertion]

## Expected Outcome
- [Expected result]
`;

    useState(() => {
        setContent(template);
    });

    const handleSave = async () => {
        if (!name || !content) {
            alert('Please fill in name and content');
            return;
        }

        setLoading(true);
        try {
            // In a real app we'd have a POST /specs endpoint. 
            // For now, we will simulate or add a simple endpoint if needed.
            // Wait, we didn't add POST /specs to API. Let's add it or rely on user asking for it.
            // Actually, I should add it to main.py as well.

            const res = await fetch('http://127.0.0.1:8000/specs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content })
            });

            if (res.ok) {
                router.push('/specs');
            } else {
                alert('Failed to save spec');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving spec');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <Link href="/specs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} /> Back to Specs
            </Link>

            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2rem' }}>New Test Spec</h1>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Spec'}
                </button>
            </header>

            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
                <div className="card">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Filename (e.g. login.md)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="my-test.md"
                        style={{
                            width: '100%', padding: '0.75rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'white',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div className="card" style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Content</label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        style={{
                            flex: 1,
                            width: '100%', padding: '1rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'white',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            resize: 'none'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
