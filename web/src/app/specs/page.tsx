'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Play, Folder, FolderOpen, ChevronRight, ChevronDown, Search, FolderClosed, Tag, X, Edit, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TagEditor from '@/components/TagEditor';

interface Spec {
    name: string;
    path: string;
    content: string;
    metadata?: {
        tags: string[];
        description?: string;
        author?: string;
        lastModified?: string;
    };
}

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: Record<string, TreeNode>;
    spec?: Spec;
}

export default function SpecsPage() {
    const router = useRouter();
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());


    useEffect(() => {
        Promise.all([
            fetch('http://localhost:8001/specs').then(res => res.json()),
            fetch('http://localhost:8001/spec-metadata').then(res => res.json())
        ])
            .then(([specsData, metadataData]) => {
                // Merge metadata into specs
                const specsWithMetadata = specsData.map((spec: Spec) => ({
                    ...spec,
                    metadata: metadataData[spec.name] || { tags: [] }
                }));
                setSpecs(specsWithMetadata);
                setMetadata(metadataData);
                setLoading(false);
                const topLevelFolders = new Set<string>();
                specsData.forEach((s: Spec) => {
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

    const [runModalOpen, setRunModalOpen] = useState(false);
    const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
    const [selectedBrowser, setSelectedBrowser] = useState('chromium');

    const [tagEditModalOpen, setTagEditModalOpen] = useState(false);
    const [editingSpecName, setEditingSpecName] = useState<string | null>(null);
    const [editingTags, setEditingTags] = useState<string[]>([]);

    const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());

    const openRunModal = (specName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedSpec(specName);
        setRunModalOpen(true);
    };

    const confirmRun = async () => {
        if (!selectedSpec) return;

        try {
            const res = await fetch('http://localhost:8001/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spec_name: selectedSpec,
                    browser: selectedBrowser
                })
            });
            const data = await res.json();
            if (data.status === 'started') {
                console.log('Run started');
                setRunModalOpen(false);
                setSelectedSpec(null);
            }
        } catch (e) {
            console.error('Failed to start run');
        }
    };

    const openTagEditor = (specName: string, currentTags: string[], e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingSpecName(specName);
        setEditingTags([...currentTags]);
        setTagEditModalOpen(true);
    };

    const saveTags = async () => {
        if (!editingSpecName) return;

        try {
            await fetch(`http://localhost:8001/spec-metadata/${editingSpecName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: editingTags })
            });

            // Update local state
            setSpecs(specs.map(spec =>
                spec.name === editingSpecName
                    ? { ...spec, metadata: { ...spec.metadata, tags: editingTags } }
                    : spec
            ));

            setTagEditModalOpen(false);
            setEditingSpecName(null);
        } catch (e) {
            console.error('Failed to save tags');
            alert('Failed to save tags');
        }
    };

    const toggleSpecSelection = (specName: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const next = new Set(selectedSpecs);
        if (next.has(specName)) {
            next.delete(specName);
        } else {
            next.add(specName);
        }
        setSelectedSpecs(next);
    };

    const getAllSpecsInNode = (node: TreeNode): string[] => {
        if (node.type === 'file') return [node.spec!.name];
        return Object.values(node.children || {}).flatMap(child => getAllSpecsInNode(child));
    };

    const toggleFolderSelection = (node: TreeNode, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const folderSpecs = getAllSpecsInNode(node);
        const next = new Set(selectedSpecs);

        const allInFolderSelected = folderSpecs.every(s => next.has(s));

        if (allInFolderSelected) {
            folderSpecs.forEach(s => next.delete(s));
        } else {
            folderSpecs.forEach(s => next.add(s));
        }

        setSelectedSpecs(next);
    };

    const clearSelection = () => {
        setSelectedSpecs(new Set());
    };

    const handleBulkRun = async () => {
        if (selectedSpecs.size === 0) return;

        try {
            const res = await fetch('http://localhost:8001/runs/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spec_names: Array.from(selectedSpecs),
                    browser: selectedBrowser
                })
            });

            const data = await res.json();
            if (data.run_ids) {
                alert(`Successfully started ${data.count} test runs!`);
                clearSelection();
                // Redirect to test runs page
                router.push('/runs');
            }
        } catch (e) {
            console.error('Bulk run failed');
            alert('Bulk run failed to start');
        }
    };

    // Get all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        specs.forEach(spec => {
            spec.metadata?.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [specs]);

    const tree = useMemo(() => {
        const root: Record<string, TreeNode> = {};

        specs
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(s => selectedTags.length === 0 || selectedTags.some(tag => s.metadata?.tags?.includes(tag)))
            .forEach(spec => {
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
    }, [specs, searchTerm, selectedTags]);

    const renderNode = (node: TreeNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.path) || searchTerm.length > 0;

        if (node.type === 'file') {
            const isSelected = selectedSpecs.has(node.spec!.name);
            return (
                <div key={node.path} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                    <div
                        onClick={(e) => toggleSpecSelection(node.spec!.name, e)}
                        style={{ padding: '0 0.5rem 0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            color: 'white'
                        }}>
                            {isSelected && <Check size={12} strokeWidth={4} />}
                        </div>
                    </div>
                    <Link
                        href={`/specs/${node.spec?.name}`}
                        className="list-item"
                        style={{
                            flex: 1,
                            padding: '0.875rem 1rem',
                            paddingLeft: '0.5rem',
                            marginBottom: 0,
                            borderRadius: 0,
                            border: 'none',
                            background: 'transparent'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <div style={{
                                width: 32, height: 32,
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--primary)'
                            }}>
                                <FileText size={16} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{node.name}</span>
                                {node.spec?.metadata?.tags && node.spec.metadata.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                                        {node.spec.metadata.tags.map(tag => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    color: 'var(--primary)',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                className="btn-icon"
                                title="Edit Tags"
                                onClick={(e) => node.spec && openTagEditor(node.spec.name, node.spec.metadata?.tags || [], e)}
                                style={{
                                    width: 32, height: 32,
                                    color: 'var(--text-secondary)',
                                    background: 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <Edit size={14} />
                            </button>
                            <button
                                className="btn-icon"
                                title="Run Spec"
                                onClick={(e) => node.spec && openRunModal(node.spec.name, e)}
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
                </div>
            );
        }

        // Folder
        const folderSpecs = getAllSpecsInNode(node);
        const folderIsSelected = folderSpecs.length > 0 && folderSpecs.every(s => selectedSpecs.has(s));
        const folderIsIndeterminate = !folderIsSelected && folderSpecs.some(s => selectedSpecs.has(s));

        return (
            <div key={node.path}>
                <div
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
                        borderTop: depth === 0 && node.path !== Array.from(expandedFolders)[0] ? '1px solid var(--border)' : 'none'
                    }}
                    onClick={() => toggleFolder(node.path)}
                >
                    <div
                        onClick={(e) => toggleFolderSelection(node, e)}
                        style={{ display: 'flex', alignItems: 'center', padding: '0 0.25rem' }}
                    >
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: folderIsSelected || folderIsIndeterminate ? '2px solid var(--primary)' : '2px solid var(--border)',
                            background: folderIsSelected ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            color: 'white'
                        }}>
                            {folderIsSelected && <Check size={12} strokeWidth={4} />}
                            {folderIsIndeterminate && (
                                <div style={{ width: '10px', height: '2px', background: 'var(--primary)', borderRadius: '1px' }}></div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpanded ? 'var(--text)' : 'inherit', flex: 1 }}>
                        {isExpanded ? <FolderOpen size={16} /> : <FolderClosed size={16} />}
                        <span style={{ textTransform: 'uppercase' }}>{node.name}</span>
                    </div>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={async (e) => {
                            e.stopPropagation();
                            const folderSpecs = getAllSpecsInNode(node);
                            if (folderSpecs.length > 0) {
                                if (confirm(`Run all ${folderSpecs.length} specs in '${node.name}'?`)) {
                                    try {
                                        const res = await fetch('http://localhost:8001/runs/bulk', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                spec_names: folderSpecs,
                                                browser: selectedBrowser
                                            })
                                        });

                                        const data = await res.json();
                                        if (data.run_ids) {
                                            alert(`Successfully started ${data.count} test runs!`);
                                            router.push('/runs');
                                        }
                                    } catch (e) {
                                        console.error('Bulk run failed');
                                        alert('Bulk run failed to start');
                                    }
                                }
                            }
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                        Run All
                    </button>
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

                {/* Tag Filters */}
                {allTags.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Tag size={16} color="var(--text-secondary)" />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Filter by tags:</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {allTags.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedTags(selectedTags.filter(t => t !== tag));
                                            } else {
                                                setSelectedTags([...selectedTags, tag]);
                                            }
                                        }}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '9999px',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem'
                                        }}
                                    >
                                        {tag}
                                        {isSelected && <X size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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

            {/* Tag Edit Modal */}
            {tagEditModalOpen && (
                <div className="modal-overlay" onClick={() => setTagEditModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Tag size={24} />
                            Edit Tags
                        </h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Spec
                            </label>
                            <div style={{ padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 500 }}>
                                {editingSpecName}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Tags
                            </label>
                            <TagEditor
                                tags={editingTags}
                                onTagsChange={setEditingTags}
                                allTags={allTags}
                                placeholder="Add tags..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setTagEditModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={saveTags}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Configuration Modal */}
            {runModalOpen && (
                <div className="modal-overlay" onClick={() => setRunModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Run configuration</h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Spec
                            </label>
                            <div style={{ padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.95rem' }}>
                                {selectedSpec}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Browser
                            </label>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {['chromium', 'firefox', 'webkit'].map(browser => (
                                    <button
                                        key={browser}
                                        onClick={() => setSelectedBrowser(browser)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: selectedBrowser === browser ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: selectedBrowser === browser ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            color: selectedBrowser === browser ? 'var(--primary)' : 'var(--text)',
                                            textTransform: 'capitalize',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {browser === 'chromium' ? 'Chrome' : browser === 'webkit' ? 'Safari' : 'Firefox'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setRunModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={confirmRun}>
                                Start Run
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedSpecs.size > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface)',
                    border: '1px solid var(--primary)',
                    borderRadius: '12px',
                    padding: '1rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                    zIndex: 100,
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                        }}>
                            {selectedSpecs.size}
                        </span>
                        <span style={{ fontWeight: 600 }}>Specs Selected</span>
                    </div>

                    <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={clearSelection}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            Clear
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleBulkRun}
                        >
                            <Play size={16} fill="currentColor" />
                            Run Bulk
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                }
                .modal-content {
                    background: var(--surface);
                    padding: 2rem;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }
            `}</style>
        </div>
    );
}
