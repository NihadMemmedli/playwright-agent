'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Play, Folder, FolderOpen, ChevronRight, ChevronDown, Search, FolderClosed } from 'lucide-react';
import Link from 'next/link';

interface Spec {
    name: string;
    path: string;
    content: string;
}

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: Record<string, TreeNode>;
    spec?: Spec;
}

export default function SpecsPage() {
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch('http://localhost:8001/specs')
            .then(res => res.json())
            .then(data => {
                setSpecs(data);
                setLoading(false);
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
            const res = await fetch('http://localhost:8001/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spec_name: specName })
            });
            const data = await res.json();
            if (data.status === 'started') {
                // Could show toast here
                console.log('Run started');
            }
        } catch (e) {
            console.error('Failed to start run');
        }
    };

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
        const isExpanded = expandedFolders.has(node.path) || searchTerm.length > 0;

        if (node.type === 'file') {
            return (
                <Link
                    key={node.path}
                    href={`/specs/${node.spec?.name}`}
                    className="list-item"
                    style={{
                        padding: '0.875rem 1rem',
                        paddingLeft: `${depth * 1.5 + 1}rem`,
                        borderBottom: '1px solid var(--border)',
                        marginBottom: 0,
                        borderRadius: 0,
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        background: 'transparent'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 32, height: 32,
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)'
                        }}>
                            <FileText size={16} />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{node.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            className="btn-icon"
                            title="Run Spec"
                            onClick={(e) => node.spec && runTest(node.spec.name, e)}
                            style={{
                                width: 32, height: 32,
                                color: 'var(--success)',
                                background: 'rgba(16, 185, 129, 0.1)'
                            }}
                        >
                            <Play size={14} fill="currentColor" />
                        </button>
                        <ChevronRight size={18} color="var(--text-secondary)" />
                    </div>
                </Link>
            );
        }

        // Folder
        return (
            <div key={node.path}>
                <div
                    onClick={() => toggleFolder(node.path)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        paddingLeft: `${depth * 1.5 + 0.5}rem`,
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: 'var(--text)',
                        background: 'transparent',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--border)',
                        borderTop: depth === 0 && node.path !== Array.from(expandedFolders)[0] ? '1px solid var(--border)' : 'none' // Add separator logic if needed, or just keep simple
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpanded ? 'var(--text)' : 'inherit' }}>
                        {isExpanded ? <FolderOpen size={16} /> : <FolderClosed size={16} />}
                        <span style={{ textTransform: 'uppercase' }}>{node.name}</span>
                    </div>
                </div>
                {isExpanded && node.children && (
                    <div style={{ background: 'var(--surface)' }}>
                        {Object.values(node.children)
                            .sort((a, b) => {
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

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Test Specs</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Manage and execute your test specifications.</p>
                    </div>
                    <Link href="/specs/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.6rem 1.25rem' }}>
                        <Plus size={18} />
                        New Spec
                    </Link>
                </div>

                <div className="input-group">
                    <div className="input-icon">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search specs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input has-icon"
                        style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}
                    />
                </div>
            </header>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {Object.keys(tree).length === 0 && (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 64, height: 64, background: 'var(--surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <Search size={24} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)' }}>No specs found.</p>
                    </div>
                )}

                {Object.values(tree)
                    .sort((a, b) => {
                        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    })
                    .map(node => renderNode(node))}
            </div>
        </div>
    );
}
