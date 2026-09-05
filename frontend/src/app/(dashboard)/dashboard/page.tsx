'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function DashboardPage() {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    openQuotations: 0,
    atRiskDeals: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [approvalsRes, quotesRes, healthRes] = await Promise.all([
          fetch('/api/approvals').catch(() => null),
          fetch('/api/quotes').catch(() => null),
          fetch('/api/deal-health').catch(() => null)
        ]);

        let pendingApprovals = 0;
        let openQuotations = 0;
        let atRiskDeals = 0;
        
        if (approvalsRes?.ok) {
          const appData = await approvalsRes.json();
          pendingApprovals = appData.data?.pendingApprovalsCount || appData.approvals?.filter((a: any) => a.status === 'PENDING').length || 0;
        }
        
        if (quotesRes?.ok) {
          const qData = await quotesRes.json();
          const quotes = Array.isArray(qData) ? qData : qData.data || qData.quotes || [];
          openQuotations = quotes.filter((q: any) => q.status !== 'COMPLETED' && q.status !== 'CANCELLED').length;
          
          // Generate activities from recent quotes
          const recentQuotes = [...quotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
          
          setActivities(recentQuotes.map(q => ({
            text: `Quote ${q.quoteNumber} for ${q.customer?.companyName || 'Unknown'} is now ${q.status.replace('_', ' ')}`,
            badge: q.status === 'APPROVED' ? 'badge-success' : q.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-info',
            label: q.status,
            time: new Date(q.updatedAt).toLocaleDateString()
          })));
        }
        
        if (healthRes?.ok) {
          const hData = await healthRes.json();
          atRiskDeals = hData.results?.filter((d: any) => d.healthLevel === 'AT_RISK' || d.healthLevel === 'CRITICAL').length || 0;
        }

        setStats({ pendingApprovals, openQuotations, atRiskDeals });
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Sales Dashboard / Home</h1>
          <p className="support-text">Central hub, links out to every module below</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/quotations/new" className="btn btn-primary">+ New Quotation</Link>
          <Link href="/approvals" className="btn btn-secondary">View Approvals</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <Link href="/approvals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card card-shadow">
            <div className="card-label">Pending Approvals</div>
            <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>{stats.pendingApprovals}</div>
            <div className="kpi-sub">quotations waiting</div>
          </div>
        </Link>
        <Link href="/quotations" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card card-shadow">
            <div className="card-label">Open Quotations</div>
            <div className="kpi-value" style={{ color: 'var(--primary)' }}>{stats.openQuotations}</div>
            <div className="kpi-sub">active deals</div>
          </div>
        </Link>
        <Link href="/deal-health" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card card-shadow">
            <div className="card-label">At-Risk Deals</div>
            <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{stats.atRiskDeals}</div>
            <div className="kpi-sub">flagged by Deal Health</div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="section-title">Recent Activity</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--fg-muted)' }}>No recent activity to show.</div>
          ) : activities.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: i < activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              gap: 12,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.text}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{a.time}</div>
              </div>
              <span className={`badge ${a.badge}`}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
