'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function BillingDetailPage({ params }: { params: Promise<{ subscriptionId: string }> }) {
  const [cancelled, setCancelled] = useState(false);

  return (
    <div>
      <Link href="/subscriptions" className="back-link">← Back to Subscriptions</Link>

      <div className="page-header">
        <h1 className="page-title">Billing Detail: Acme Corp — Care Plan 2yr</h1>
        <p className="support-text">Opened by clicking a row on the Subscriptions list</p>
      </div>

      {/* One-Time Lines */}
      <div className="section">
        <h2 className="section-title">One-Time Lines (from originating order)</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Laptop Pro 14</td>
                <td className="text-right">2</td>
                <td className="text-right" style={{ fontWeight: 700 }}>$2,280</td>
              </tr>
              <tr>
                <td>Onsite Setup</td>
                <td className="text-right">1</td>
                <td className="text-right" style={{ fontWeight: 700 }}>$450</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurring Lines */}
      <div className="section">
        <h2 className="section-title">Recurring Lines</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Next Bill Date</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Care Plan 2yr</td>
                <td>Monthly</td>
                <td>Sep 15</td>
                <td className="text-right" style={{ fontWeight: 700 }}>$46</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Support SLA</td>
                <td>Quarterly</td>
                <td>Nov 1</td>
                <td className="text-right" style={{ fontWeight: 700 }}>$300</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {cancelled ? (
        <div style={{ padding: '14px 16px', background: 'var(--danger-bg)', border: '2px solid var(--danger-border)', borderRadius: 6, fontWeight: 700, color: 'var(--danger-fg)' }}>
          ✗ Subscription cancelled. Future billing stopped. History preserved.
        </div>
      ) : (
        <div className="action-row">
          <button className="btn btn-secondary">Modify Subscription</button>
          <button className="btn btn-danger" onClick={() => {
            if (confirm('Cancel this subscription? Future billing will stop. History is preserved.')) {
              setCancelled(true);
            }
          }}>Cancel Subscription</button>
        </div>
      )}
    </div>
  );
}
