'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface DiscountRule {
  id: string;
  customerTierId: string | null;
  categoryId: string | null;
  maxDiscountPercent: number;
  priority: number;
  active: boolean;
  customerTier?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
}

interface ApprovalRule {
  id: string;
  minRiskScore: number;
  maxRiskScore: number | null;
  requiredRoles: string;
  active: boolean;
}

interface Tier { id: string; name: string; }
interface Category { id: string; name: string; }

export default function DiscountConfigPage() {
  const toast = useToast();
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New discount rule form
  const [newDR, setNewDR] = useState({ customerTierId: '', categoryId: '', maxDiscountPercent: 10, priority: 0 });
  // New approval rule form
  const [newAR, setNewAR] = useState({ minRiskScore: 50, maxRiskScore: '', requiredRoles: 'SALES_MANAGER' });

  useEffect(() => {
    async function load() {
      try {
        const [drRes, arRes, tiersRes, catsRes] = await Promise.all([
          fetch('/api/admin/discount-rules'),
          fetch('/api/admin/approval-rules'),
          fetch('/api/customer-tiers').catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/product-categories').catch(() => ({ json: () => ({ data: [] }) })),
        ]);
        const [dr, ar, tiersData, catsData] = await Promise.all([
          drRes.json(), arRes.json(), (tiersRes as Response).json(), (catsRes as Response).json()
        ]);
        if (dr.success) setDiscountRules(dr.data);
        if (ar.success) setApprovalRules(ar.data);
        if (tiersData.success || tiersData.data) setTiers(tiersData.data || []);
        if (catsData.success || catsData.data) setCategories(catsData.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUpdateDiscountRule = async (id: string, maxDiscountPercent: number, active: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/discount-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDiscountPercent, active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Discount rule updated');
      setDiscountRules(prev => prev.map(r => r.id === id ? { ...r, maxDiscountPercent, active } : r));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiscountRule = async (id: string) => {
    if (!window.confirm) return; // In case confirm isn't available
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/discount-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Rule deleted');
      setDiscountRules(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDiscountRule = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/discount-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDR,
          customerTierId: newDR.customerTierId || undefined,
          categoryId: newDR.categoryId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success('Discount rule created');
      setDiscountRules(prev => [...prev, data.data]);
      setNewDR({ customerTierId: '', categoryId: '', maxDiscountPercent: 10, priority: 0 });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateApprovalRule = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/approval-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minRiskScore: Number(newAR.minRiskScore),
          maxRiskScore: newAR.maxRiskScore ? Number(newAR.maxRiskScore) : null,
          requiredRoles: newAR.requiredRoles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success('Approval rule created');
      setApprovalRules(prev => [...prev, data.data]);
      setNewAR({ minRiskScore: 50, maxRiskScore: '', requiredRoles: 'SALES_MANAGER' });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApprovalRule = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/approval-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Approval rule deleted');
      setApprovalRules(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading configuration...</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Discount Tiers and Approval Chains</h1>
        <p className="support-text">Admin configuration of maximum discount ceilings and approval routing</p>
      </div>

      {/* Discount Rules */}
      <div className="card section">
        <h2 className="section-title">Discount Rules</h2>
        <p className="support-text" style={{ marginBottom: 12 }}>
          Controls max discount % per customer tier / product category. Leave tier/category blank for a global rule.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Category</th>
                <th className="text-right">Max Discount %</th>
                <th className="text-right">Priority</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discountRules.map(rule => (
                <tr key={rule.id}>
                  <td>{rule.customerTier?.name || <span style={{ color: 'var(--fg-muted)' }}>Any</span>}</td>
                  <td>{rule.category?.name || <span style={{ color: 'var(--fg-muted)' }}>Any</span>}</td>
                  <td className="text-right">
                    <input
                      type="number" min={0} max={100} step={0.5}
                      defaultValue={rule.maxDiscountPercent}
                      onBlur={e => handleUpdateDiscountRule(rule.id, parseFloat(e.target.value), rule.active)}
                      style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                    />%
                  </td>
                  <td className="text-right">{rule.priority}</td>
                  <td>
                    <input type="checkbox" checked={rule.active}
                      onChange={e => handleUpdateDiscountRule(rule.id, rule.maxDiscountPercent, e.target.checked)} />
                  </td>
                  <td className="text-right">
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => handleDeleteDiscountRule(rule.id)} disabled={saving}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {discountRules.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>No rules configured</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add new discount rule */}
        <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add New Discount Rule</h3>
          <div className="form-row form-row-4" style={{ gap: 10 }}>
            <div className="field-group">
              <label className="field-label">Customer Tier</label>
              <select className="select" value={newDR.customerTierId} onChange={e => setNewDR(p => ({ ...p, customerTierId: e.target.value }))}>
                <option value="">Any Tier</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Category</label>
              <select className="select" value={newDR.categoryId} onChange={e => setNewDR(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">Any Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Max Discount %</label>
              <input className="input" type="number" min={0} max={100}
                value={newDR.maxDiscountPercent}
                onChange={e => setNewDR(p => ({ ...p, maxDiscountPercent: parseFloat(e.target.value) }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Priority</label>
              <input className="input" type="number"
                value={newDR.priority}
                onChange={e => setNewDR(p => ({ ...p, priority: parseInt(e.target.value) }))} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleCreateDiscountRule} disabled={saving}>
            Add Rule
          </button>
        </div>
      </div>

      {/* Approval Rules */}
      <div className="card section">
        <h2 className="section-title">Approval Routing Rules</h2>
        <p className="support-text" style={{ marginBottom: 12 }}>
          When a quote's risk score falls in range, the specified roles must approve before proceeding.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Min Risk Score</th>
                <th>Max Risk Score</th>
                <th>Required Roles</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvalRules.map(rule => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: 600 }}>{rule.minRiskScore}</td>
                  <td>{rule.maxRiskScore ?? <span style={{ color: 'var(--fg-muted)' }}>∞</span>}</td>
                  <td>
                    {rule.requiredRoles.split(',').map(r => (
                      <span key={r} className="badge badge-info" style={{ marginRight: 4 }}>{r.trim()}</span>
                    ))}
                  </td>
                  <td><span className={`badge ${rule.active ? 'badge-success' : 'badge-neutral'}`}>{rule.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-right">
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => handleDeleteApprovalRule(rule.id)} disabled={saving}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {approvalRules.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>No approval rules configured</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add new approval rule */}
        <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add New Approval Rule</h3>
          <div className="form-row form-row-3" style={{ gap: 10 }}>
            <div className="field-group">
              <label className="field-label">Min Risk Score (0-100)</label>
              <input className="input" type="number" min={0} max={100}
                value={newAR.minRiskScore}
                onChange={e => setNewAR(p => ({ ...p, minRiskScore: parseInt(e.target.value) }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Max Risk Score (blank = unlimited)</label>
              <input className="input" type="number" min={0} max={100}
                value={newAR.maxRiskScore}
                onChange={e => setNewAR(p => ({ ...p, maxRiskScore: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Required Roles (comma-separated)</label>
              <input className="input" type="text"
                placeholder="SALES_MANAGER,FINANCE"
                value={newAR.requiredRoles}
                onChange={e => setNewAR(p => ({ ...p, requiredRoles: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleCreateApprovalRule} disabled={saving}>
            Add Rule
          </button>
        </div>
      </div>

      <div className="notice">
        When a quote mixes categories with different ceilings, the system computes a blended risk score and routes to the highest required level.
        All approvals, rejections, and edits are logged with user, timestamp, and reason.
      </div>
    </div>
  );
}
