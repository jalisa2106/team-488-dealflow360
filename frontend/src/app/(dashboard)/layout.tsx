import TopNav from '@/components/TopNav';
import { ToastProvider } from '@/components/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <ToastProvider>
        <TopNav />
        <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </ToastProvider>
    </div>
  );
}
