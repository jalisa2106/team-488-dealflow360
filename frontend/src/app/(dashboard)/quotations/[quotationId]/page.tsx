'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type LineItem = {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  discount: number;
  limit: number;
};

type Upsell = {
  productId: string;
  productName: string;
  reason: string;
  basePrice: number;
};

export default function QuotationDetailPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const { quotationId } = use(params);
  const router = useRouter();

  const [quote, setQuote] = useState<any>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [addedUpsells, setAddedUpsells] = useState<Set<string>>(new Set());
  
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [evaluation, setEvaluation] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  // AI Copilot state
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotExplanation, setCopilotExplanation] = useState<string | null>(null);

  // Portal link state
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quotationId}`);
      if (!res.ok) throw new Error('Failed to fetch quote');
      const data = await res.json();
      setQuote(data);
      setLines(data.quoteLines.map((l: any) => ({
        productId: l.productId,
        productName: l.product.name,
        qty: Number(l.quantity),
        price: Number(l.unitPrice),
        discount: Number(l.discountPercent),
        limit: 30, // Using 30% as a static display limit for now
      })));
    } catch (err) {
      console.error(err);
    }
  }, [quotationId]);

  const fetchUpsells = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quotationId}/upsell`);
      if (res.ok) {
        const data = await res.json();
        setUpsells(data.recommendations || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [quotationId]);

  useEffect(() => {
    if (quotationId === 'Q-NEW') return; // Skip if it's a dummy navigation
    fetchQuote();
    fetchUpsells();
  }, [quotationId, fetchQuote, fetchUpsells]);

  const updateDiscount = (productId: string, val: string) => {
    setLines(prev => prev.map(l => l.productId === productId ? { ...l, discount: Number(val) } : l));
  };
  
  const updateQty = (productId: string, val: string) => {
    setLines(prev => prev.map(l => l.productId === productId ? { ...l, qty: Number(val) } : l));
  };

  const addUpsell = (u: Upsell) => {
    if (addedUpsells.has(u.productId)) return;
    setAddedUpsells(prev => new Set([...prev, u.productId]));
    setLines(prev => [...prev, {
      productId: u.productId,
      productName: u.productName,
      qty: 1, 
      price: u.basePrice || 0, 
      discount: 0, 
      limit: 30,
    }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map(l => ({
            productId: l.productId,
            quantity: l.qty,
            discountPercent: l.discount
          }))
        })
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchQuote(); // Refresh state
      alert('Draft saved successfully');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`/api/quotes/${quotationId}/evaluate`, { method: 'POST' });
      const data = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSubmit = async () => {
    const hasViolation = lines.some(l => l.discount > l.limit);
    if (hasViolation) {
      if (!confirm('Some discounts exceed 30%. Submit anyway for approval?')) return;
    }
    
    // First save the draft
    await handleSave();

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotes/${quotationId}/submit`, { method: 'POST' });
      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
      setTimeout(() => router.push('/approvals'), 1200);
    } catch (err: any) {
      alert(err.message);
      setSubmitting(false);
    }
  };

  if (!quote) return <div style={{ padding: 40 }}>Loading Quote...</div>;

  const total = lines.reduce((sum, l) => sum + l.qty * l.price * (1 - l.discount / 100), 0);

  return (
    <div>
      <Link href="/quotations" className="back-link">← Back to Quotations</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Quotation Detail: {quote.quoteNumber}</h1>
          <p className="support-text">Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.</p>
        </div>
        <span className={`badge badge-${quote.status === 'DRAFT' ? 'neutral' : quote.status === 'PENDING_APPROVAL' ? 'warning' : 'success'}`}>
          {quote.status.replace('_', ' ')}
        </span>
      </div>

      {/* Customer Info */}
      <div className="card section">
        <div className="form-row form-row-2">
          <div className="field-group">
            <label className="field-label">Customer</label>
            <input className="input" defaultValue={quote.customer?.companyName || 'Unknown'} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Customer Tier</label>
            <input className="input" defaultValue={quote.customer?.tier?.name || 'Standard'} disabled />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="section">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Base Price</th>
                <th className="text-right">Discount %</th>
                <th className="text-right">Hard Limit %</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const over = line.discount > line.limit;
                const overBy = line.discount - line.limit;
                return (
                  <tr key={line.productId} style={over ? { background: '#fff5f5' } : {}}>
                    <td style={{ fontWeight: 600 }}>{line.productName}</td>
                    <td className="text-right">
                       <input
                        type="number"
                        min={1} step={1}
                        value={line.qty}
                        onChange={e => updateQty(line.productId, e.target.value)}
                        disabled={quote.status !== 'DRAFT'}
                        style={{
                          width: 64, padding: '4px 8px', border: '2px solid var(--border)',
                          borderRadius: 4, textAlign: 'right', fontFamily: 'inherit'
                        }}
                      />
                    </td>
                    <td className="text-right">${line.price.toLocaleString()}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={line.discount}
                        onChange={e => updateDiscount(line.productId, e.target.value)}
                        disabled={quote.status !== 'DRAFT'}
                        style={{
                          width: 64,
                          padding: '4px 8px',
                          border: `2px solid ${over ? 'var(--danger-border)' : 'var(--border)'}`,
                          borderRadius: 4,
                          textAlign: 'right',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      />%
                    </td>
                    <td className="text-right">{line.limit}%</td>
                    <td className="text-center">
                      {over
                        ? <span className="badge badge-danger">OVER (+{overBy}pt)</span>
                        : <span className="badge badge-success">OK</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, padding: '12px' }}>Total (after discounts)</td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, padding: '12px' }}>${total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Upsells */}
      {quote.status === 'DRAFT' && upsells.length > 0 && (
        <div className="section">
          <h2 className="section-title">Upsell & Cross-Sell Suggestions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {upsells.map(u => (
              <div key={u.productId} className="card card-shadow" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>+ {u.productName}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{u.reason}</div>
                {addedUpsells.has(u.productId) ? (
                  <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Added ✓</span>
                ) : (
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px', alignSelf: 'flex-start' }} onClick={() => addUpsell(u)}>
                    Add to Quote
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Output */}
      {evaluation && (
        <div className="section card" style={{ borderColor: evaluation.risk?.level === 'CRITICAL' ? 'var(--danger-border)' : 'var(--border)' }}>
          <h2 className="section-title">Engine Evaluation</h2>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <div><strong>Risk Score:</strong> <span className={`badge ${evaluation.risk.level === 'CRITICAL' || evaluation.risk.level === 'HIGH' ? 'badge-danger' : 'badge-success'}`}>{evaluation.risk.score} ({evaluation.risk.level})</span></div>
            <div><strong>Margin:</strong> {evaluation.margin.quoteMarginPercent}%</div>
            <div><strong>Approval Required:</strong> {evaluation.approval.approvalRequired ? 'Yes' : 'No'}</div>
          </div>
          {evaluation.approval.approvalRequired && (
            <div style={{ fontSize: 13, color: 'var(--danger-fg)', fontWeight: 600 }}>
              Required Roles: {evaluation.approval.requiredRoles.join(', ')}
            </div>
          )}
          {/* AI Copilot inline — appears only after evaluation */}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>🤖 AI Deal Copilot</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '5px 12px' }}
                disabled={copilotLoading}
                onClick={async () => {
                  setCopilotLoading(true);
                  setCopilotExplanation(null);
                  try {
                    const res = await fetch('/api/ai/explain', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ quoteId: quotationId }),
                    });
                    const data = await res.json();
                    setCopilotExplanation(data.explanation || data.error || 'No explanation returned.');
                  } catch {
                    setCopilotExplanation('AI service unavailable. Please try again.');
                  } finally {
                    setCopilotLoading(false);
                  }
                }}
              >
                {copilotLoading ? 'Explaining…' : '✨ Explain This Deal Risk'}
              </button>
            </div>
            {copilotExplanation && (
              <div style={{
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '12px 14px', fontSize: 13, lineHeight: 1.65,
                color: 'var(--fg)', fontStyle: 'italic'
              }}>
                {copilotExplanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portal Link — for sending to customer */}
      {quote.portalToken && (
        <div className="card section">
          <h2 className="section-title">🔗 Customer Portal Link</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
            Share this link with the customer so they can review and negotiate the quote directly.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/quotation?token=${quote.portalToken}&quoteId=${quote.id}`}
              style={{ flex: 1, fontSize: 12, color: 'var(--fg-muted)' }}
            />
            <button
              className={`btn ${copySuccess ? 'btn-success' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}
              onClick={() => {
                const link = `${window.location.origin}/portal/quotation?token=${quote.portalToken}&quoteId=${quote.id}`;
                navigator.clipboard.writeText(link).then(() => {
                  setCopySuccess(true);
                  setPortalLink(link);
                  setTimeout(() => setCopySuccess(false), 2000);
                });
              }}
            >
              {copySuccess ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {submitted ? (
        <div style={{ padding: '16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
          ✓ Submitted for approval. Redirecting to Approvals…
        </div>
      ) : quote.status === 'DRAFT' ? (
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleEvaluate} disabled={evaluating}>
            {evaluating ? 'Evaluating…' : 'Run Live Evaluation'}
          </button>
          <button className="btn btn-secondary" onClick={handleSave} disabled={saving || submitting}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || submitting}>
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
