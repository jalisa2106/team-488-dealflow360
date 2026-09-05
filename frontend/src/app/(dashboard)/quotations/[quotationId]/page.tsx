'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type LineItem = {
  id: string;
  product: string;
  qty: number;
  price: number;
  discount: number;
  limit: number;
};

const DEFAULT_LINES: LineItem[] = [
  { id: '1', product: 'Laptop Pro 14', qty: 2, price: 1200, discount: 12, limit: 15 },
  { id: '2', product: 'Onsite Setup Service', qty: 1, price: 450, discount: 18, limit: 10 },
  { id: '3', product: 'Extended Warranty', qty: 1, price: 180, discount: 10, limit: 15 },
];

const UPSELLS = [
  { name: '+ Wireless Mouse', sub: 'Margin +$18' },
  { name: '+ Docking Station', sub: 'Promo: 12% off' },
  { name: '+ Care Plan 2yr', sub: 'Margin +$46' },
];

export default function QuotationDetailPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const [lines, setLines] = useState<LineItem[]>(DEFAULT_LINES);
  const [addedUpsells, setAddedUpsells] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const updateDiscount = useCallback((id: string, val: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, discount: Number(val) } : l));
  }, []);

  const addUpsell = (name: string) => {
    if (addedUpsells.has(name)) return;
    setAddedUpsells(prev => new Set([...prev, name]));
    setLines(prev => [...prev, {
      id: String(Date.now()),
      product: name.replace('+ ', ''),
      qty: 1, price: 50, discount: 0, limit: 15,
    }]);
  };

  const handleSubmit = async () => {
    const hasViolation = lines.some(l => l.discount > l.limit);
    if (hasViolation) {
      if (!confirm('Some discounts exceed their limits. Submit anyway for approval?')) return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSubmitted(true);
    setTimeout(() => router.push('/approvals'), 1200);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
  };

  const total = lines.reduce((sum, l) => sum + l.qty * l.price * (1 - l.discount / 100), 0);

  return (
    <div>
      <Link href="/quotations" className="back-link">← Back to Quotations</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Quotation Detail: Q-1042</h1>
          <p className="support-text">Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.</p>
        </div>
        <span className="badge badge-warning">Pending Approval</span>
      </div>

      {/* Customer / Price List */}
      <div className="card section">
        <div className="form-row form-row-2">
          <div className="field-group">
            <label className="field-label">Customer</label>
            <input className="input" defaultValue="Acme Corp" />
          </div>
          <div className="field-group">
            <label className="field-label">Price List</label>
            <select className="select">
              <option>Gold — USD</option>
              <option>Silver — USD</option>
              <option>Bronze — USD</option>
            </select>
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
                <th className="text-right">Price</th>
                <th className="text-right">Discount %</th>
                <th className="text-right">Limit</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const over = line.discount > line.limit;
                const overBy = line.discount - line.limit;
                return (
                  <tr key={line.id} style={over ? { background: '#fff5f5' } : {}}>
                    <td style={{ fontWeight: 600 }}>{line.product}</td>
                    <td className="text-right">{line.qty}</td>
                    <td className="text-right">${line.price.toLocaleString()}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={line.discount}
                        onChange={e => updateDiscount(line.id, e.target.value)}
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

        <div className="notice" style={{ marginTop: 12 }}>
          Discount is checked against each line&apos;s own limit live, as soon as it is entered, not only at submit time.
        </div>
      </div>

      {/* Upsells */}
      <div className="section">
        <h2 className="section-title">Upsell and Cross-Sell Suggestions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {UPSELLS.map(u => (
            <div key={u.name} className="card card-shadow" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{u.sub}</div>
              {addedUpsells.has(u.name) ? (
                <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Added ✓</span>
              ) : (
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 10px', alignSelf: 'flex-start' }} onClick={() => addUpsell(u.name)}>
                  Add to Quote
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {submitted ? (
        <div style={{ padding: '16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
          ✓ Submitted for approval. Redirecting to Approvals…
        </div>
      ) : (
        <div className="action-row">
          <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            Submit for Approval
          </button>
        </div>
      )}
    </div>
  );
}
