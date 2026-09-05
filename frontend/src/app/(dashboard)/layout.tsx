import React from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '24px', fontWeight: 'bold', fontSize: '20px' }}>
          DealFlow360
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
          <div style={{ padding: '12px', fontSize: '12px', color: 'var(--foreground-muted)' }}>Workspace</div>
          <Link href="/dashboard" className="sidebar-link">Dashboard</Link>
          <Link href="/quotations" className="sidebar-link">Quotations</Link>
          
          <div style={{ padding: '12px', fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '16px' }}>Operations</div>
          <Link href="/approvals" className="sidebar-link">Approvals</Link>
          <Link href="/fulfillment" className="sidebar-link">Fulfillment</Link>
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div style={{ flexGrow: 1 }}>Search deals...</div>
          <Link href="/quotations/new" className="btn btn-primary">
            + Create Quote
          </Link>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>
      <style>{`
        .sidebar-link {
          padding: 10px 12px;
          color: var(--inverse-text);
          text-decoration: none;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        .sidebar-link:hover, .sidebar-link.active {
          background-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
