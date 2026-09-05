'use client';
import Link from 'next/link';

const ROWS = [
  { id: 'SUB-001', customer: 'Acme Corp', plan: 'Care Plan 2yr', cycle: 'Monthly', nextBill: 'Sep 15', status: 'Active' },
  { id: 'SUB-002', customer: 'Beta Industries', plan: 'Support SLA', cycle: 'Quarterly', nextBill: 'Nov 1', status: 'Active' },
  { id: 'SUB-003', customer: 'Delta LLC', plan: 'Care Plan 1yr', cycle: 'Monthly', nextBill: '–', status: 'Paused' },
  { id: 'SUB-004', customer: 'Nova Retail', plan: 'Support SLA', cycle: 'Monthly', nextBill: '–', status: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  Active: 'badge-success', Paused: 'badge-warning', Cancelled: 'badge-danger',
};

export default function SubscriptionsPage() {
  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Subscriptions (List)</h1>
          <p className="support-text">Every recurring plan across every customer, regardless of which order it came from</p>
        </div>
        <button className="btn btn-secondary">+ New Plan (Admin)</button>
      </div>

      <div className="chip-row">
        <span className="chip chip-success">18 Active</span>
        <span className="chip chip-warning">2 Paused</span>
        <span className="chip chip-danger">3 Cancelled</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Next Bill</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.id} className="clickable" onClick={() => window.location.href = `/subscriptions/${row.id}`}>
                <td style={{ fontWeight: 600 }}>{row.customer}</td>
                <td>{row.plan}</td>
                <td>{row.cycle}</td>
                <td style={{ color: row.nextBill === '–' ? 'var(--fg-muted)' : 'inherit' }}>{row.nextBill}</td>
                <td><span className={`badge ${STATUS_BADGE[row.status]}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click a subscription row to open its billing detail and proration history.
      </div>
    </div>
  );
}
