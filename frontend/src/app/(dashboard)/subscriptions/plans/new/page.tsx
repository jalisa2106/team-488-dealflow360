'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSubscriptionPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    frequency: 'MONTHLY',
    price: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create plan');
      }

      alert('Plan created successfully');
      router.push('/subscriptions');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create Subscription Plan</h1>
        <p className="support-text">Define a new recurring billing plan for your products</p>
      </div>

      <div className="card section" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Plan Name</label>
            <input 
              type="text" 
              className="input" 
              required 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              placeholder="e.g. Enterprise Support - Monthly" 
            />
          </div>

          <div className="field-group">
            <label className="field-label">Billing Frequency</label>
            <select 
              className="input" 
              value={form.frequency} 
              onChange={e => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Price</label>
            <input 
              type="number" 
              className="input" 
              required 
              min="0" 
              step="0.01"
              value={form.price} 
              onChange={e => setForm({ ...form, price: e.target.value })} 
              placeholder="0.00" 
            />
          </div>

          <div className="action-row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
            <Link href="/subscriptions" className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
