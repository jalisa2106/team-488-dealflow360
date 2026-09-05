'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const [isSubscription, setIsSubscription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const VARIANTS = [
    { attr: 'Color', values: 'Blue, Black', extra: '0' },
    { attr: 'RAM', values: '4GB, 8GB', extra: '+$30' },
    { attr: 'Manufacturer', values: 'Dell, HP', extra: '+$10 / +$30' },
  ];

  const PRICELISTS = [
    { tier: 'Bronze', currency: 'USD', rule: 'Price, no adjustment' },
    { tier: 'Gold', currency: 'USD / EUR', rule: 'Price minus 10% base' },
  ];

  return (
    <div>
      <Link href="/products" className="back-link">← Back to Product Catalog</Link>

      <div className="page-header">
        <h1 className="page-title">Product and Pricelist</h1>
      </div>

      {/* General Info */}
      <div className="card section">
        <h2 className="section-title">General Info</h2>
        <div className="form-row form-row-2" style={{ gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">Product Name</label>
              <input className="input" defaultValue="Laptop Pro 14" />
            </div>
            <div className="field-group">
              <label className="field-label">Category</label>
              <input className="input" defaultValue="Hardware" />
            </div>
            <div className="field-group">
              <label className="field-label">Price</label>
              <input className="input" type="number" defaultValue={1200} />
            </div>
            <div className="field-group">
              <label className="field-label">Unit</label>
              <input className="input" defaultValue="Each" />
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <input className="input" defaultValue="High-performance business laptop" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">Tax %</label>
              <input className="input" type="number" defaultValue={15} />
            </div>
            <div className="field-group">
              <label className="field-label">Subscription</label>
              <div className="toggle-group">
                <button className={`toggle-btn${isSubscription ? '' : ' active'}`} onClick={() => setIsSubscription(false)} type="button">No</button>
                <button className={`toggle-btn${isSubscription ? ' active' : ''}`} onClick={() => setIsSubscription(true)} type="button">Yes</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>If subscription yes then recurring will be visible</p>
            </div>
            {isSubscription && (
              <div className="field-group">
                <label className="field-label">Recurring</label>
                <select className="select">
                  <option>Monthly</option>
                  <option>Yearly</option>
                  <option>Weekly</option>
                </select>
              </div>
            )}
            <div className="field-group">
              <label className="field-label">Quantity on Hand <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>(Integer field)</span></label>
              <input className="input" type="number" defaultValue={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Product Variants */}
      <div className="section">
        <h2 className="section-title">Product Variants</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Values</th>
                <th className="text-right">Extra Price</th>
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((v, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{v.attr}</td>
                  <td>{v.values}</td>
                  <td className="text-right" style={{ fontWeight: 600, color: v.extra === '0' ? 'var(--fg-muted)' : 'var(--success-fg)' }}>{v.extra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 10, fontSize: 12 }}>+ Add Variant</button>
      </div>

      {/* Pricelists */}
      <div className="section">
        <h2 className="section-title">Pricelists</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Currency</th>
                <th>Price Rule</th>
              </tr>
            </thead>
            <tbody>
              {PRICELISTS.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{p.tier}</td>
                  <td>{p.currency}</td>
                  <td>{p.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 20 }}>
        Product details should be filled. Recurring order with this product will be invoiced at the beginning of the period.
      </div>

      {saved && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 4, color: 'var(--success-fg)', fontWeight: 700 }}>
          ✓ Product saved.
        </div>
      )}
      <div className="action-row">
        <button className="btn btn-secondary" onClick={() => window.history.back()}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Product'}
        </button>
      </div>
    </div>
  );
}
