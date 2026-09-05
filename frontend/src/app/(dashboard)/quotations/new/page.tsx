'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewQuotationPage() {
  const router = useRouter();
  const [lines, setLines] = useState([
    { product: '', qty: 1, price: '', discount: 0, limit: 15 },
  ]);
  const [saving, setSaving] = useState(false);

  const addLine = () => setLines(prev => [...prev, { product: '', qty: 1, price: '', discount: 0, limit: 15 }]);

  const handleCreate = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    router.push('/quotations/Q-NEW');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Quotation</h1>
        <p className="support-text">Create a new quotation for a customer</p>
      </div>

      <div className="card section">
        <div className="form-row form-row-2" style={{ marginBottom: 20 }}>
          <div className="field-group">
            <label className="field-label">Customer</label>
            <input className="input" placeholder="Select customer…" />
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

        <h2 className="section-title" style={{ marginTop: 8 }}>Line Items</h2>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price ($)</th>
                <th className="text-right">Discount %</th>
                <th className="text-right">Limit %</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td><input className="input" placeholder="Product name" style={{ border: '1px solid var(--border-subtle)' }} /></td>
                  <td className="text-right"><input type="number" min={1} defaultValue={1} style={{ width: 60, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} /></td>
                  <td className="text-right"><input type="number" min={0} placeholder="0.00" style={{ width: 90, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} /></td>
                  <td className="text-right"><input type="number" min={0} max={100} defaultValue={0} style={{ width: 60, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} />%</td>
                  <td className="text-right" style={{ color: 'var(--fg-muted)' }}>15%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addLine}>+ Add Line</button>
      </div>

      <div className="action-row">
        <button className="btn btn-secondary" onClick={() => router.push('/quotations')}>Cancel</button>
        <button className="btn btn-secondary" onClick={handleCreate} disabled={saving}>Save Draft</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating…' : 'Create & Submit'}
        </button>
      </div>
    </div>
  );
}
