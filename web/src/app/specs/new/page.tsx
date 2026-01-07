'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TagEditor from '@/components/TagEditor';

export default function NewSpecPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
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

    useEffect(() => {
        setContent(template);
        // Fetch all existing tags for autocomplete
        fetch('http://localhost:8001/spec-metadata')
            .then(res => res.json())
            .then(metadata => {
                const tagsSet = new Set<string>();
                Object.values(metadata).forEach((meta: any) => {
                    meta.tags?.forEach((tag: string) => tagsSet.add(tag));
                });
                setAllTags(Array.from(tagsSet).sort());
            })
            .catch(err => console.error('Failed to load tags:', err));
    }, []);

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

            const res = await fetch('http://127.0.0.1:8001/specs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content })
            });

            if (res.ok) {
                // Save tags if any
                if (tags.length > 0) {
                    await fetch(`http://localhost:8001/spec-metadata/${name}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tags })
                    });
                }
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

            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700 }}>New Test Spec</h1>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Spec'}
                </button>
            </header>

            <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
                <div className="card">
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>Filename (e.g. login.md)</label>
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
                            fontSize: '1rem',
                            transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>

                <div className="card">
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>Tags</label>
                    <TagEditor
                        tags={tags}
                        onTagsChange={setTags}
                        allTags={allTags}
                        placeholder="Add tags (smoke, p0, auth...)"
                    />
                </div>

                <div className="card" style={{ height: 'calc(100vh - 450px)', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>Content</label>
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
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            resize: 'none',
                            transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
            </div>
        </div>
    );
}
