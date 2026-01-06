'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Play, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface Spec {
    name: string;
    path: string;
    content: string;
}

interface TreeNode {
    name: string;
    path: string; // Full relative path for file, or folder path
    type: 'file' | 'folder';
    children?: Record<string, TreeNode>;
    spec?: Spec; // Only for files
}

export default function SpecsPage() {
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch('http://127.0.0.1:8001/specs')
            .then(res => res.json())
            .then(data => {
                setSpecs(data);
                setLoading(false);
                // Auto-expand top level by default
                const topLevelFolders = new Set<string>();
                data.forEach((s: Spec) => {
                    const parts = s.name.split('/');
                    if (parts.length > 1) topLevelFolders.add(parts[0]);
                });
                setExpandedFolders(topLevelFolders);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const toggleFolder = (path: string) => {
        const next = new Set(expandedFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setExpandedFolders(next);
    };

    const runTest = async (specName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
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

    // Filter and Build Tree
    const tree = useMemo(() => {
        const root: Record<string, TreeNode> = {};

        specs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).forEach(spec => {
            const parts = spec.name.split('/');
            let currentLevel = root;

            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1;
                const path = parts.slice(0, index + 1).join('/');

                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        name: part,
                        path: path,
                        type: isFile ? 'file' : 'folder',
                        children: isFile ? undefined : {},
                        spec: isFile ? spec : undefined
                    };
                }

                if (!isFile && currentLevel[part].children) {
                    currentLevel = currentLevel[part].children!;
                }
            });
        });

        return root;
    }, [specs, searchTerm]);

    const renderNode = (node: TreeNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.path) || searchTerm.length > 0; // Auto expand on search

        if (node.type === 'file') {
            return (
                <div key={node.path} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    paddingLeft: `${depth * 1.5 + 0.75}rem`,
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '0.9rem'
                }}>
                    <Link href={`/specs/${node.spec?.name}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', flex: 1 }}>
                        <FileText size={16} color="var(--primary)" />
                        <span>{node.name}</span>
                    </Link>
                    <button
                        className="btn-icon"
                        title="Run Spec"
                        onClick={(e) => node.spec && runTest(node.spec.name, e)}
                        style={{ padding: '4px', color: 'var(--success)' }}
                    >
                        <Play size={14} />
                    </button>
                </div>
            );
        }

        return (
            <div key={node.path}>
                <div
                    onClick={() => toggleFolder(node.path)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        paddingLeft: `${depth * 1.5}rem`,
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid var(--border)'
                    }}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                    {node.name}
                </div>
                {isExpanded && node.children && (
                    <div>
                        {Object.values(node.children)
                            .sort((a, b) => {
                                // Folders first, then files
                                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                                return a.name.localeCompare(b.name);
                            })
                            .map(child => renderNode(child, depth + 1))
                        }
                    </div>
                )}
            </div>
        );
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
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {Object.keys(tree).length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No specs found.
                        </div>
                    )}

                    {Object.values(tree)
                        .sort((a, b) => {
                            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                            return a.name.localeCompare(b.name);
                        })
                        .map(node => renderNode(node))}
                </div>
            )}
        </div>
    );
}
