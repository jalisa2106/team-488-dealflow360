'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const [paid, setPaid] = useState(false);
  const toast = useToast();

  const trackerSteps = [
    { label: 'Order Confirmed', state: 'done' },
    { label: 'Shipped', state: 'done' },
    { label: 'Invoiced', state: paid ? 'done' : 'current' },
    { label: 'Paid', state: paid ? 'current' : 'pending' },
  ];

  return (
    <div>
      <Link href="/invoices" className="back-link">← Back to Invoices</Link>

      <div className="page-header">
        <h1 className="page-title">Invoice Detail: INV-1042</h1>
        <p className="support-text">Opened by clicking a row on the Invoices list</p>
      </div>

      {/* Lifecycle Tracker */}
      <div className="card section">
        <h2 className="section-title">Billing Lifecycle</h2>
        <div className="tracker">
          {trackerSteps.map((step, i) => (
            <div key={step.label} className={`tracker-step ${step.state === 'done' ? 'done' : step.state === 'current' ? 'current' : ''}`}>
              <div className="tracker-dot">{i + 1}</div>
              <div className="tracker-label">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="section">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700 }}>INV-1042</td>
                <td className="text-right" style={{ fontWeight: 700 }}>$2,730</td>
                <td>
                  <span className={`badge ${paid ? 'badge-success' : 'badge-danger'}`}>
                    {paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td style={{ color: paid ? 'var(--fg-muted)' : 'var(--danger-fg)', fontWeight: paid ? 400 : 700 }}>Sep 10</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>INV-1043 <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>(Recurring)</span></td>
                <td className="text-right" style={{ fontWeight: 700 }}>$46</td>
                <td><span className="badge badge-success">Paid</span></td>
                <td style={{ color: 'var(--fg-muted)' }}>Sep 15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 20 }}>
        Partial invoicing stays reconciled with partial delivery — nothing is billed before it ships.
      </div>

      {paid ? (
        <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
          ✓ Payment recorded successfully.
        </div>
      ) : (
        <div className="action-row">
          <button className="btn btn-success" onClick={async () => {
            const ok = await toast.confirm('Record payment of $2,730 for INV-1042?');
            if (ok) setPaid(true);
          }}>Record Payment</button>
          <button className="btn btn-secondary">Download Summary</button>
        </div>
      )}
    </div>
  );
}
