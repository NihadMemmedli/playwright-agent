'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Key, Globe, Box, Eye, EyeOff, Server } from 'lucide-react';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        llm_provider: 'anthropic',
        api_key: '',
        base_url: '',
        model_name: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        fetch('http://localhost:8001/settings')
            .then(res => res.json())
            .then(data => {
                setSettings(prev => ({ ...prev, ...data }));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('http://localhost:8001/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error(data.detail || 'Failed to save settings');
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 700 }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Configure your AI agents and environment preferences.
                </p>
            </header>

            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius)',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontWeight: 500
                }}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div className="form-group">
                    <label className="label">LLM Provider</label>
                    <div className="input-group">
                        <div className="input-icon">
                            <Server size={18} />
                        </div>
                        <select
                            name="llm_provider"
                            value={settings.llm_provider}
                            onChange={handleChange}
                            className="input has-icon"
                        >
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="zai">Z.ai (Custom Proxy)</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">API Key</label>
                    <div className="input-group">
                        <div className="input-icon">
                            <Key size={18} />
                        </div>
                        <input
                            type={showApiKey ? "text" : "password"}
                            name="api_key"
                            value={settings.api_key}
                            onChange={handleChange}
                            placeholder="sk-..."
                            className="input has-icon"
                            style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                            type="button"
                            className="visibility-toggle"
                            onClick={() => setShowApiKey(!showApiKey)}
                            title={showApiKey ? "Hide API Key" : "Show API Key"}
                        >
                            {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <p className="helper-text">
                        Stored locally in ~/.claude/settings.json
                    </p>
                </div>

                <div className="form-group">
                    <label className="label">Base URL <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
                    <div className="input-group">
                        <div className="input-icon">
                            <Globe size={18} />
                        </div>
                        <input
                            type="text"
                            name="base_url"
                            value={settings.base_url}
                            onChange={handleChange}
                            placeholder="https://api.anthropic.com"
                            className="input has-icon"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">Default Model</label>
                    <div className="input-group">
                        <div className="input-icon">
                            <Box size={18} />
                        </div>
                        <input
                            type="text"
                            name="model_name"
                            value={settings.model_name}
                            onChange={handleChange}
                            placeholder="claude-3-5-sonnet-20240620"
                            className="input has-icon"
                        />
                    </div>
                </div>

                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{
                            minWidth: '140px',
                            justifyContent: 'center',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
