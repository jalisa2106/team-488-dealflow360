'use client';
import { useState } from 'react';
import Link from 'next/link';

const ROWS = [
  { id: 'Q-1042', customer: 'Acme Corp', risk: 'HIGH', stage: 'Sales Manager', assigned: 'M. Shah', status: 'pending' },
  { id: 'Q-1039', customer: 'Beta Industries', risk: 'MEDIUM', stage: 'Finance', assigned: 'R. Iyer', status: 'pending' },
  { id: 'Q-1035', customer: 'Nova Retail', risk: 'LOW', stage: 'Auto-Approved', assigned: '–', status: 'approved' },
  { id: 'Q-1031', customer: 'Orion Ltd', risk: 'MEDIUM', stage: 'Sales Manager', assigned: 'M. Shah', status: 'returned' },
  { id: 'Q-1028', customer: 'Delta LLC', risk: 'HIGH', stage: 'Finance', assigned: 'R. Iyer', status: 'approved' },
];

const RISK_BADGE: Record<string, string> = {
  HIGH: 'badge-danger', MEDIUM: 'badge-warning', LOW: 'badge-success',
};

export default function ApprovalsPage() {
  const [filterPending, setFilterPending] = useState(false);
  const rows = filterPending ? ROWS.filter(r => r.status === 'pending') : ROWS;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Approvals (List)</h1>
          <p className="support-text">Every quotation that needed, needs, or is going through discount approval</p>
        </div>
        <button
          className={`btn ${filterPending ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterPending(p => !p)}
        >
          {filterPending ? '✓ Pending Only' : 'Filter: Pending Only'}
        </button>
      </div>

      <div className="chip-row">
        <span className="chip chip-warning">3 Pending</span>
        <span className="chip chip-danger">1 Returned</span>
        <span className="chip chip-success">12 Approved</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quotation</th>
              <th>Customer</th>
              <th>Blended Risk</th>
              <th>Stage</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="clickable" onClick={() => window.location.href = `/approvals/${row.id}`}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                <td>{row.customer}</td>
                <td><span className={`badge ${RISK_BADGE[row.risk]}`}>{row.risk}</span></td>
                <td>{row.stage}</td>
                <td>{row.assigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click any row to open its full approval detail, risk breakdown, and audit trail.
      </div>
    </div>
  );
}
