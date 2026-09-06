'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

type PortalLine = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  proposedDiscount: number;
};

export default function CustomerPortalPageWrapper() {
  return (
    <ToastProvider>
      <CustomerPortalPage />
    </ToastProvider>
  );
}

function CustomerPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const quoteIdParam = searchParams.get('quoteId') || '';

  const [quote, setQuote] = useState<any>(null);
  const [lines, setLines] = useState<PortalLine[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    async function fetchQuote() {
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/portal/quote?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
          setLines(data.lines.map((l: any) => ({ ...l, proposedDiscount: l.discountPercent })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [token]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const updateProposedDiscount = (lineId: string, val: number) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, proposedDiscount: val } : l));
  };

  const handleSubmitCounterOffer = async () => {
    if (!quote) return;
    setSubmitting(true);
    try {
      const proposedTerms = lines
        .filter(l => l.proposedDiscount !== l.discountPercent)
        .map(l => ({ lineId: l.id, proposedDiscountPercent: l.proposedDiscount }));

      if (proposedTerms.length === 0) {
        toast.error('No changes detected. Modify a discount to submit a counter-offer.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/quotes/${quote.id}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalToken: token, proposedTerms, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setResult(data);
      toast.success('Counter-offer submitted successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!quote) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/quotes/${token}/confirm`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Confirmation failed');
      }
      setResult({ confirmed: true });
      toast.success('Quotation confirmed successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute totals from proposed discounts
  const proposedTotal = lines.reduce((sum, l) => {
    return sum + l.unitPrice * l.quantity * (1 - l.proposedDiscount / 100);
  }, 0);
  const originalTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const hasChanges = lines.some(l => l.proposedDiscount !== l.discountPercent);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <main style={{ flex: 1, padding: '32px', maxWidth: 900, margin: '0 auto', width: '100%' }}>

        {!token ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, marginBottom: 12 }}>Customer Portal</h2>
            <p style={{ color: 'var(--fg-muted)', marginBottom: 20 }}>
              To access your quotation, open the link your sales rep sent you.<br />
              It contains a unique token like: <code>?token=abc123&amp;quoteId=xxx</code>
            </p>
            <div className="notice">
              <strong>Demo mode:</strong> Ask your sales rep to copy the Portal Link from the Quotation Detail page.
            </div>
          </div>
        ) : loading ? (
          <div style={{ padding: 40 }}>Loading your quotation...</div>
        ) : !quote ? (
          <div className="notice" style={{ color: 'var(--danger-fg)' }}>Invalid or expired portal link. Please contact your sales rep.</div>
        ) : result?.confirmed ? (
          <div style={{ padding: '20px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Quotation Confirmed!</h2>
            <p style={{ color: 'var(--fg-muted)' }}>Your order is now being processed. You will receive a confirmation email shortly.</p>
          </div>
        ) : result ? (
          <div>
            <div style={{
              padding: '16px 20px',
              background: result.status === 'UNDER_NEGOTIATION' || result.status === 'PENDING_APPROVAL' ? '#fffbeb' : 'var(--success-bg)',
              border: `2px solid ${result.status === 'UNDER_NEGOTIATION' || result.status === 'PENDING_APPROVAL' ? '#f59e0b' : 'var(--success-border)'}`,
              borderRadius: 8, marginBottom: 20
            }}>
              {result.status === 'PENDING_APPROVAL' || result.status === 'UNDER_NEGOTIATION' ? (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>⚠ Counter-offer Under Review</div>
                  <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>
                    Your requested changes have exceeded our standard discount thresholds and have been automatically submitted for internal approval. A sales manager has been notified and will respond within 24 hours.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>✓ Counter-offer Submitted</div>
                  <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Your sales rep has been notified and will respond shortly.</p>
                </>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>← View My Quotation</button>
          </div>
        ) : (
          <>
            <div className="page-header page-header-row">
              <div>
                <h1 className="page-title">Quotation {quote.quoteNumber}</h1>
                <p className="support-text">Review and negotiate your quote — no email needed</p>
              </div>
              <span className={`badge ${quote.status === 'APPROVED' ? 'badge-success' : quote.status === 'PENDING_APPROVAL' ? 'badge-warning' : 'badge-neutral'}`}>
                {quote.status?.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="card section">
              <div className="form-row form-row-2">
                <div className="field-group">
                  <label className="field-label">Prepared For</label>
                  <input className="input" value={quote.customer} disabled />
                </div>
                <div className="field-group">
                  <label className="field-label">Quote Reference</label>
                  <input className="input" value={quote.quoteNumber} disabled />
                </div>
              </div>
            </div>

            {/* Line Items with Negotiation */}
            <div className="section">
              <h2 className="section-title">Quote Lines</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Current Disc %</th>
                      <th className="text-right">Proposed Disc %</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const proposedTotal = line.unitPrice * line.quantity * (1 - line.proposedDiscount / 100);
                      const changed = line.proposedDiscount !== line.discountPercent;
                      return (
                        <tr key={line.id} style={changed ? { background: '#fffbeb' } : {}}>
                          <td style={{ fontWeight: 600 }}>{line.productName}</td>
                          <td className="text-right">{line.quantity}</td>
                          <td className="text-right">${line.unitPrice.toLocaleString()}</td>
                          <td className="text-right" style={{ color: 'var(--fg-muted)' }}>{line.discountPercent}%</td>
                          <td className="text-right">
                            <input
                              type="number"
                              min={0} max={50} step={1}
                              value={line.proposedDiscount}
                              onChange={e => updateProposedDiscount(line.id, parseFloat(e.target.value) || 0)}
                              style={{ width: 64, textAlign: 'right', padding: '4px 8px', border: `2px solid ${changed ? '#f59e0b' : 'var(--border)'}`, borderRadius: 4, fontFamily: 'inherit' }}
                            />%
                          </td>
                          <td className="text-right" style={{ fontWeight: 700 }}>
                            ${proposedTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            {changed && (
                              <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 6 }}>↓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, padding: 12 }}>
                        {hasChanges ? 'Proposed Total' : 'Total'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, padding: 12 }}>
                        ${proposedTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        {hasChanges && (
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400 }}>
                            Original: ${originalTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Message */}
            <div className="card section">
              <h2 className="section-title">Message to Sales Rep (optional)</h2>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. We need delivery by end of month…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {hasChanges && (
              <div className="notice" style={{ marginBottom: 16 }}>
                <strong>Negotiation Notice:</strong> If your proposed discounts exceed our standard policy thresholds, the quotation will automatically re-enter the internal approval process.
              </div>
            )}

            <div className="action-row">
              <button
                className="btn btn-secondary"
                onClick={handleSubmitCounterOffer}
                disabled={submitting || !hasChanges}
              >
                {submitting ? 'Submitting…' : 'Submit Counter-Offer'}
              </button>
              <button className="btn btn-success" onClick={handleConfirm} disabled={submitting}>
                ✓ Accept & Confirm Quotation
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
