'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CustomerPortalPage() {
  const [counterDiscount, setCounterDiscount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    await new Promise(r => setTimeout(r, 500));
    setSubmitted(true);
    // If counter discount is high, re-enter approval
    if (Number(counterDiscount) > 15) {
      setTimeout(() => router.push('/approvals/Q-1042'), 1200);
    }
  };

  const handleConfirm = async () => {
    await new Promise(r => setTimeout(r, 500));
    setConfirmed(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Customer Nav */}
      <header className="portal-topbar">
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginRight: 24 }}>DealFlow360</span>
        <nav style={{ display: 'flex', gap: 0 }}>
          {['My Quotation', 'Messages', 'Profile'].map(tab => (
            <a key={tab} href="#" className="topbar-tab" style={{ color: tab === 'My Quotation' ? '#fff' : 'rgba(255,255,255,0.6)', borderBottom: tab === 'My Quotation' ? '3px solid #fff' : '3px solid transparent', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', fontWeight: tab === 'My Quotation' ? 700 : 500, fontSize: 13, textDecoration: 'none' }}>
              {tab}
            </a>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, padding: '32px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <div className="page-header page-header-row">
          <div>
            <h1 className="page-title">Customer Portal — Negotiation</h1>
            <p className="support-text">Review and negotiate your quote directly — no email needed</p>
          </div>
          <span className="badge badge-warning">Status: Under Negotiation</span>
        </div>

        {/* Negotiation Table */}
        <div className="section">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Customer Comment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Extended Warranty</td>
                  <td style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>Can this be 15% off instead of 10%?</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Onsite Setup</td>
                  <td style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>Can we push this to next month?</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Fields */}
        <div className="card section">
          <h2 className="section-title">Submit a Request</h2>
          <div className="form-row form-row-2">
            <div className="field-group">
              <label className="field-label">Counter Discount %</label>
              <input
                className="input"
                type="number"
                min={0} max={50}
                placeholder="e.g. 15"
                value={counterDiscount}
                onChange={e => setCounterDiscount(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Requested Delivery Date</label>
              <input
                className="input"
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="notice" style={{ marginBottom: 20 }}>
          If final terms exceed thresholds, the quote automatically re-enters approval.
        </div>

        {confirmed ? (
          <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
            ✓ Quotation confirmed! Your order is being processed.
          </div>
        ) : submitted ? (
          <div style={{ padding: '14px 16px', background: 'var(--info-bg)', border: '2px solid var(--info-border)', borderRadius: 6, fontWeight: 700, color: 'var(--info-fg)' }}>
            {Number(counterDiscount) > 15
              ? '⚠ Counter discount exceeds threshold — quotation re-entering approval flow…'
              : '✓ Request submitted. Your sales rep has been notified.'}
          </div>
        ) : (
          <div className="action-row">
            <button className="btn btn-secondary" onClick={handleSubmit}>Submit Request</button>
            <button className="btn btn-success" onClick={handleConfirm}>Confirm Quotation</button>
          </div>
        )}
      </main>
    </div>
  );
}
