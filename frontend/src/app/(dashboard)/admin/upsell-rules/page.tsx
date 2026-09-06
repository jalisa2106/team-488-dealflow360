'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Product { id: string; name: string; sku: string; }
interface UpsellRule {
  id: string;
  product: Product;
  suggestedProduct: Product;
  promotion: boolean;
  minMarginPercent: number;
  active: boolean;
}

export default function UpsellRulesPage() {
  const toast = useToast();
  const [rules, setRules] = useState<UpsellRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newRule, setNewRule] = useState({
    productId: '',
    suggestedProductId: '',
    promotion: false,
    minMarginPercent: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [rRes, pRes] = await Promise.all([
          fetch('/api/admin/upsell-rules'),
          fetch('/api/products'),
        ]);
        const [rData, pData] = await Promise.all([rRes.json(), pRes.json()]);
        if (rData.success) setRules(rData.data);
        if (pData.success) setProducts(pData.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreate = async () => {
    if (!newRule.productId || !newRule.suggestedProductId) {
      toast.error('Both product and suggested product are required');
      return;
    }
    if (newRule.productId === newRule.suggestedProductId) {
      toast.error('Product and suggested product must differ');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/upsell-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success('Upsell rule created');
      // Re-fetch to get includes
      const refreshed = await fetch('/api/admin/upsell-rules').then(r => r.json());
      if (refreshed.success) setRules(refreshed.data);
      setNewRule({ productId: '', suggestedProductId: '', promotion: false, minMarginPercent: 0 });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, field: 'promotion' | 'active', value: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/upsell-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Rule updated');
      setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/upsell-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Rule deleted');
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading upsell rules...</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Upsell Rules</h1>
        <p className="support-text">Configure product pairing rules to drive upsell recommendations in quotes</p>
      </div>

      {/* Rules table */}
      <div className="card section">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Primary Product</th>
                <th>Suggest</th>
                <th className="text-right">Min Margin %</th>
                <th>Promoted</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: 600 }}>{rule.product?.name}</td>
                  <td>
                    {rule.suggestedProduct?.name}
                    <span style={{ color: 'var(--fg-muted)', fontSize: 12, marginLeft: 6 }}>({rule.suggestedProduct?.sku})</span>
                  </td>
                  <td className="text-right">{Number(rule.minMarginPercent).toFixed(1)}%</td>
                  <td>
                    <input type="checkbox" checked={rule.promotion}
                      onChange={e => handleToggle(rule.id, 'promotion', e.target.checked)} disabled={saving} />
                  </td>
                  <td>
                    <input type="checkbox" checked={rule.active}
                      onChange={e => handleToggle(rule.id, 'active', e.target.checked)} disabled={saving} />
                  </td>
                  <td className="text-right">
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => handleDelete(rule.id)} disabled={saving}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>No upsell rules configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New rule form */}
      <div className="card section">
        <h2 className="section-title">Add New Upsell Rule</h2>
        <div className="form-row form-row-4" style={{ gap: 10 }}>
          <div className="field-group">
            <label className="field-label">Primary Product (when this is in a quote…)</label>
            <select className="select" value={newRule.productId}
              onChange={e => setNewRule(p => ({ ...p, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Suggest This Product</label>
            <select className="select" value={newRule.suggestedProductId}
              onChange={e => setNewRule(p => ({ ...p, suggestedProductId: e.target.value }))}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Min Margin % (0 = always suggest)</label>
            <input className="input" type="number" min={0} max={100}
              value={newRule.minMarginPercent}
              onChange={e => setNewRule(p => ({ ...p, minMarginPercent: parseFloat(e.target.value) }))} />
          </div>
          <div className="field-group">
            <label className="field-label">Promoted (highlight in UI)</label>
            <div style={{ paddingTop: 10 }}>
              <input type="checkbox" checked={newRule.promotion}
                onChange={e => setNewRule(p => ({ ...p, promotion: e.target.checked }))} />
              <span style={{ marginLeft: 8, fontSize: 14 }}>Yes, promote this pairing</span>
            </div>
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}
