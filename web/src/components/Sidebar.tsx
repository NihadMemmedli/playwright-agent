'use client';
import { Home, FileText, Play, Settings, Bot, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Overview', icon: Home },
        { href: '/dashboard', label: 'Reporting', icon: BarChart2 },
        { href: '/specs', label: 'Test Specs', icon: FileText },
        { href: '/runs', label: 'Test Runs', icon: Play },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside style={{
            width: '260px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem'
        }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '40px', height: '40px', background: 'var(--primary)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Bot size={24} color="white" />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Playwright</h1>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Agent Console</span>
                </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {links.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link key={link.href} href={link.href} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius)',
                            background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}>
                            <link.icon size={20} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                }}>
                    <p>Status: <span style={{ color: 'var(--success)' }}>Online</span></p>
                    <p>Agent v0.1.0</p>
                </div>
            </div>
        </aside>
    );
}
