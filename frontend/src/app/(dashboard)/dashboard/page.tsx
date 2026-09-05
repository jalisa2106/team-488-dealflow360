import Link from 'next/link';

export default function Dashboard() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Sales Dashboard</h1>
          <p style={{ color: 'var(--foreground-muted)' }}>Overview of your active deals, approvals, and recent activity.</p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Link href="/approvals" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card shadow" style={{ cursor: 'pointer' }}>
            <h3 className="card-title" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', fontSize: '12px' }}>Pending Approvals</h3>
            <p className="kpi-number">4</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>quotations waiting for approval</p>
          </div>
        </Link>
        <Link href="/quotations" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card shadow" style={{ cursor: 'pointer' }}>
            <h3 className="card-title" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', fontSize: '12px' }}>Open Quotations</h3>
            <p className="kpi-number">12</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>active deals</p>
          </div>
        </Link>
        <Link href="/deal-health" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card shadow" style={{ cursor: 'pointer' }}>
            <h3 className="card-title" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', fontSize: '12px' }}>At-Risk Deals</h3>
            <p className="kpi-number">3</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>flagged by Deal Health</p>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
        <div className="card">
          <h2 className="section-title">01 / RECENT ACTIVITY</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Acme Corp quotation approved by Finance</strong>
                <span className="badge badge-success">Approved</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '4px' }}>2 hours ago</div>
            </div>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Beta Industries requested a discount</strong>
                <span className="badge badge-warning">Action Required</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '4px' }}>5 hours ago</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>East Depot stock updated for Order #2291</strong>
                <span className="badge badge-info">Info</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '4px' }}>Yesterday</div>
            </div>
          </div>
        </div>
        
        <div className="card shadow-lg" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
          <h2 className="section-title">DEAL GUARDIAN</h2>
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontWeight: 'bold' }}>HIGH RISK</p>
            <p className="kpi-number" style={{ color: 'var(--danger-text)' }}>78 / 100</p>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Pipeline requires attention due to 3 stalled deals.</p>
            <Link href="/deal-health" className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }}>View Details</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
