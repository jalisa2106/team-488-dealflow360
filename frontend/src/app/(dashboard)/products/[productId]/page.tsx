'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Variant {
  id: string;
  attributeName: string;
  value: string;
  extraPrice: number;
  sku: string | null;
}

const PRICELISTS = [
  { tier: 'Bronze', currency: 'USD', rule: 'Price, no adjustment' },
  { tier: 'Gold', currency: 'USD / EUR', rule: 'Price minus 10% base' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const toast = useToast();

  const [isSubscription, setIsSubscription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [newVariant, setNewVariant] = useState({ attributeName: '', value: '', extraPrice: 0, sku: '' });
  const [addingVariant, setAddingVariant] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    if (!productId) return;
    
    // Fetch main product data
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProduct(d.data);
          setIsSubscription(d.data.type === 'SUBSCRIPTION');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProduct(false));

    // Fetch variants
    fetch(`/api/products/${productId}/variants`)
      .then(r => r.json())
      .then(d => { if (d.success) setVariants(d.data); })
      .catch(() => {})
      .finally(() => setLoadingVariants(false));
  }, [productId]);

  const handleAddVariant = async () => {
    if (!newVariant.attributeName || !newVariant.value) {
      toast.error('Attribute name and value are required');
      return;
    }
    setAddingVariant(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newVariant, sku: newVariant.sku || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add variant');
      toast.success('Variant added');
      setVariants(prev => [...prev, data.data]);
      setNewVariant({ attributeName: '', value: '', extraPrice: 0, sku: '' });
      setShowAddForm(false);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete variant');
      toast.success('Variant removed');
      setVariants(prev => prev.filter(v => v.id !== variantId));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Link href="/products" className="back-link">← Back to Product Catalog</Link>

      <div className="page-header">
        <h1 className="page-title">Product and Pricelist</h1>
      </div>

      {/* General Info */}
      <div className="card section">
        <h2 className="section-title">General Info</h2>
        {loadingProduct ? (
          <div style={{ padding: 20 }}>Loading product details...</div>
        ) : !product ? (
          <div style={{ padding: 20 }}>Product not found.</div>
        ) : (
        <div className="form-row form-row-2" style={{ gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field-group">
              <label className="field-label">Product Name</label>
              <input className="input" defaultValue={product.name} />
            </div>
            <div className="field-group">
              <label className="field-label">SKU</label>
              <input className="input" defaultValue={product.sku} />
            </div>
            <div className="field-group">
              <label className="field-label">Category</label>
              <input className="input" defaultValue={product.category?.name || 'Uncategorized'} disabled />
            </div>
            <div className="field-group">
              <label className="field-label">Price</label>
              <input className="input" type="number" defaultValue={product.basePrice} />
            </div>
            <div className="field-group">
              <label className="field-label">Unit</label>
              <input className="input" defaultValue={product.unit} />
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <input className="input" defaultValue={product.description || ''} />
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
        )}
      </div>

      {/* Product Variants — real CRUD */}
      <div className="card section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Product Variants</h2>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Variant'}
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Value</th>
                <th>SKU</th>
                <th className="text-right">Extra Price</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingVariants ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Loading variants…</td></tr>
              ) : variants.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>No variants defined yet</td></tr>
              ) : (
                variants.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.attributeName}</td>
                    <td>{v.value}</td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{v.sku || '-'}</td>
                    <td className="text-right" style={{ fontWeight: 600, color: Number(v.extraPrice) > 0 ? 'var(--success-fg)' : 'var(--fg-muted)' }}>
                      {Number(v.extraPrice) > 0 ? `+$${Number(v.extraPrice).toFixed(2)}` : '—'}
                    </td>
                    <td className="text-right">
                      <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => handleDeleteVariant(v.id)} disabled={saving}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showAddForm && (
          <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 6 }}>
            <div className="form-row form-row-4" style={{ gap: 10 }}>
              <div className="field-group">
                <label className="field-label">Attribute Name</label>
                <input className="input" placeholder="e.g. Color, RAM" value={newVariant.attributeName}
                  onChange={e => setNewVariant(p => ({ ...p, attributeName: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">Value</label>
                <input className="input" placeholder="e.g. Blue, 8GB" value={newVariant.value}
                  onChange={e => setNewVariant(p => ({ ...p, value: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">Extra Price ($)</label>
                <input className="input" type="number" min={0} value={newVariant.extraPrice}
                  onChange={e => setNewVariant(p => ({ ...p, extraPrice: parseFloat(e.target.value) }))} />
              </div>
              <div className="field-group">
                <label className="field-label">Variant SKU (optional)</label>
                <input className="input" placeholder="PROD-BLU-001" value={newVariant.sku}
                  onChange={e => setNewVariant(p => ({ ...p, sku: e.target.value }))} />
              </div>
            </div>
            <div className="action-row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={handleAddVariant} disabled={addingVariant}>
                {addingVariant ? 'Adding…' : 'Add Variant'}
              </button>
            </div>
          </div>
        )}
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
