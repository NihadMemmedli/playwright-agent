'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, MousePointer, Type, Globe, CheckCircle, HelpCircle } from 'lucide-react';

interface SpecStep {
    id: string;
    type: 'navigate' | 'click' | 'fill' | 'assert' | 'custom';
    description: string;
}

interface SpecBuilderProps {
    content: string;
    onChange: (newContent: string) => void;
}

export default function SpecBuilder({ content, onChange }: SpecBuilderProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<SpecStep[]>([]);

    // Parse content on mount or when switching to visual mode
    useEffect(() => {
        parseContent(content);
    }, []);

    const parseContent = (md: string = '') => {
        if (!md) md = '';
        const lines = md.split('\n');
        let parsedTitle = '';
        let parsedDesc = [];
        let parsedSteps: SpecStep[] = [];
        let isStepsStart = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('# ')) {
                parsedTitle = trimmed.replace('# ', '').trim();
            } else if (trimmed.startsWith('Test:')) {
                // Support legacy format
                parsedTitle = trimmed.replace('Test:', '').trim();
            } else if (/^\d+\./.test(trimmed)) {
                isStepsStart = true;
                // Parse step
                const text = trimmed.replace(/^\d+\.\s*/, '');
                parsedSteps.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: inferType(text),
                    description: text
                });
            } else if (!isStepsStart) {
                parsedDesc.push(trimmed);
            }
        }

        setTitle(parsedTitle);
        setDescription(parsedDesc.join('\n'));
        setSteps(parsedSteps);
    };

    const inferType = (text: string): SpecStep['type'] => {
        const lower = text.toLowerCase();
        if (lower.includes('go to') || lower.includes('navigate') || lower.includes('open')) return 'navigate';
        if (lower.includes('click') || lower.includes('press') || lower.includes('select')) return 'click';
        if (lower.includes('type') || lower.includes('fill') || lower.includes('enter')) return 'fill';
        if (lower.includes('assert') || lower.includes('verify') || lower.includes('check')) return 'assert';
        return 'custom';
    };

    const serialize = (currentTitle: string, currentDesc: string, currentSteps: SpecStep[]) => {
        let md = '';
        if (currentTitle) md += `# ${currentTitle}\n\n`;
        if (currentDesc) md += `${currentDesc}\n\n`;

        currentSteps.forEach((step, index) => {
            md += `${index + 1}. ${step.description}\n`;
        });

        return md;
    };

    const update = (newTitle: string, newDesc: string, newSteps: SpecStep[]) => {
        setTitle(newTitle);
        setDescription(newDesc);
        setSteps(newSteps);
        onChange(serialize(newTitle, newDesc, newSteps));
    };

    const addStep = () => {
        const newStep: SpecStep = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'custom',
            description: ''
        };
        const newSteps: SpecStep[] = [...steps, newStep];
        update(title, description, newSteps);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        update(title, description, newSteps);
    };

    const updateStep = (index: number, val: string) => {
        const newSteps = [...steps];
        newSteps[index].description = val;
        newSteps[index].type = inferType(val);
        update(title, description, newSteps);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
        update(title, description, newSteps);
    };

    const getIcon = (type: SpecStep['type']) => {
        switch (type) {
            case 'navigate': return <Globe size={16} className="text-blue-400" />;
            case 'click': return <MousePointer size={16} className="text-green-400" />;
            case 'fill': return <Type size={16} className="text-yellow-400" />;
            case 'assert': return <CheckCircle size={16} className="text-purple-400" />;
            default: return <HelpCircle size={16} className="text-gray-400" />;
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#e6edf3' }}>
            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Test Name
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => update(e.target.value, description, steps)}
                    placeholder="e.g. User Login Flow"
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: 600
                    }}
                />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => update(title, e.target.value, steps)}
                    placeholder="Describe what this test does..."
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: '#e6edf3',
                        minHeight: '80px',
                        fontSize: '0.9rem'
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Test Steps</h3>
                </div>

                {steps.map((step, index) => (
                    <div key={step.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        transition: 'border-color 0.2s'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginTop: '0.5rem'
                        }}>
                            {index + 1}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {getIcon(step.type)}
                                <span style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.05em',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600
                                }}>
                                    {step.type}
                                </span>
                            </div>
                            <input
                                type="text"
                                value={step.description}
                                onChange={(e) => updateStep(index, e.target.value)}
                                placeholder="Describe the step..."
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => moveStep(index, 'up')} className="btn-icon" title="Move Up" disabled={index === 0}>
                                <ArrowUp size={14} />
                            </button>
                            <button onClick={() => moveStep(index, 'down')} className="btn-icon" title="Move Down" disabled={index === steps.length - 1}>
                                <ArrowDown size={14} />
                            </button>
                            <button onClick={() => removeStep(index)} className="btn-icon" title="Delete Step" style={{ color: 'var(--danger)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addStep}
                    className="btn btn-secondary"
                    style={{
                        borderStyle: 'dashed',
                        justifyContent: 'center',
                        marginTop: '0.5rem',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <Plus size={16} /> Add Step
                </button>
            </div>
        </div>
    );
}
