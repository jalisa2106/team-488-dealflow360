import Link from 'next/link';

export default function DashboardPage() {
  const activities = [
    { text: 'Acme Corp quotation approved by Finance', badge: 'badge-success', label: 'Approved', time: '2h ago' },
    { text: 'Beta Industries requested a discount change', badge: 'badge-warning', label: 'Action Needed', time: '5h ago' },
    { text: 'East Depot stock updated for Order #2291', badge: 'badge-info', label: 'Info', time: 'Yesterday' },
  ];

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
            <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>4</div>
            <div className="kpi-sub">quotations waiting</div>
          </div>
        </Link>
        <Link href="/quotations" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card card-shadow">
            <div className="card-label">Open Quotations</div>
            <div className="kpi-value" style={{ color: 'var(--primary)' }}>12</div>
            <div className="kpi-sub">active deals</div>
          </div>
        </Link>
        <Link href="/deal-health" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card card-shadow">
            <div className="card-label">At-Risk Deals</div>
            <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>3</div>
            <div className="kpi-sub">flagged by Deal Health</div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="section-title">Recent Activity</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((a, i) => (
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
