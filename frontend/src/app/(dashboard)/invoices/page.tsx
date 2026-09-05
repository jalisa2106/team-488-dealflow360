'use client';
import Link from 'next/link';

const ROWS = [
  { id: 'INV-1042', customer: 'Acme Corp', amount: '$2,730', status: 'Unpaid', due: 'Sep 10' },
  { id: 'INV-1043', customer: 'Acme Corp', amount: '$46', status: 'Paid', due: 'Sep 15' },
  { id: 'INV-1038', customer: 'Nova Retail', amount: '$9,750', status: 'Paid', due: 'Aug 30' },
  { id: 'INV-1037', customer: 'Beta Industries', amount: '$300', status: 'Unpaid', due: 'Sep 5' },
];

export default function InvoicesPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices (List)</h1>
        <p className="support-text">Every invoice generated from one-time and recurring orders</p>
      </div>

      <div className="chip-row">
        <span className="chip chip-danger">4 Unpaid</span>
        <span className="chip chip-success">21 Paid</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.id} className="clickable" onClick={() => window.location.href = `/invoices/${row.id}`}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                <td>{row.customer}</td>
                <td className="text-right" style={{ fontWeight: 600 }}>{row.amount}</td>
                <td>
                  <span className={`badge ${row.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                    {row.status}
                  </span>
                </td>
                <td style={{ color: row.status === 'Unpaid' ? 'var(--danger-fg)' : 'var(--fg-muted)', fontWeight: row.status === 'Unpaid' ? 700 : 400 }}>
                  {row.due}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click an invoice row to open its full payment and delivery reconciliation detail.
      </div>
    </div>
  );
}
