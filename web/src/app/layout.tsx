import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata = {
    title: 'Playwright Agent',
    description: 'AI-Powered Test Automation',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body style={{ display: 'flex' }}>
                <Sidebar />
                <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', height: '100vh' }}>
                    {children}
                </main>
            </body>
        </html>
    );
}
