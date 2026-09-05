import Link from 'next/link';

const DEALS = [
  { deal: 'Zenith Co', issue: 'Idle 9 days', flagged: 'Aug 24', action: 'Nudge sent', severity: 'warning' },
  { deal: 'Delta LLC', issue: 'Discount 22% vs avg 8%', flagged: 'Aug 25', action: 'Escalated to Manager', severity: 'danger' },
  { deal: 'Nova Retail', issue: 'Delivery promise at risk', flagged: 'Aug 27', action: 'Pending', severity: 'warning' },
];

export default function DealHealthPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Deal Health and Anomaly Dashboard</h1>
        <p className="support-text">Real-time flags for stalled deals and unusual discount patterns</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
          <div className="card-label">Stalled Deals</div>
          <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>5</div>
          <div className="kpi-sub">quotes idle 7+ days</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
          <div className="card-label">Discount Anomalies</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>2</div>
          <div className="kpi-sub">above rep average</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
          <div className="card-label">Delivery Slippage</div>
          <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>3</div>
          <div className="kpi-sub">promise dates at risk</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Issue</th>
              <th>Flagged</th>
              <th>Current Action</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {DEALS.map((row, i) => (
              <tr key={i}>
                <td>
                  <Link href="/quotations/Q-1025" style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                    {row.deal}
                  </Link>
                </td>
                <td>
                  <span className={`badge badge-${row.severity}`}>{row.issue}</span>
                </td>
                <td style={{ color: 'var(--fg-muted)' }}>{row.flagged}</td>
                <td>{row.action}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Nudge Rep</button>
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }}>Escalate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
