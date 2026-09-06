'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function NewSubscriptionPlanPage() {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [price, setPrice] = useState(0);
  const [prorationEnabled, setProrationEnabled] = useState(true);
  const [cancellationRefundEnabled, setCancellationRefundEnabled] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      toast.error('Name and a positive price are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          frequency,
          price,
          prorationEnabled,
          cancellationRefundEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create plan');
      
      toast.success('Subscription plan created');
      router.push('/subscriptions');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">New Subscription Plan</h1>
      </div>

      <div className="card section">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="field-group">
            <label className="field-label">Plan Name</label>
            <input 
              className="input" 
              placeholder="e.g. Enterprise Monthly" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          
          <div className="field-group">
            <label className="field-label">Billing Frequency</label>
            <select className="select" value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          
          <div className="field-group">
            <label className="field-label">Price</label>
            <input 
              className="input" 
              type="number" 
              step="0.01" 
              min="0" 
              value={price} 
              onChange={e => setPrice(parseFloat(e.target.value) || 0)} 
            />
          </div>

          <div className="field-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="checkbox" 
              checked={prorationEnabled} 
              onChange={e => setProrationEnabled(e.target.checked)} 
              id="proration"
            />
            <label htmlFor="proration" className="field-label" style={{ marginBottom: 0 }}>Enable Proration (adjust costs for mid-cycle changes)</label>
          </div>

          <div className="field-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="checkbox" 
              checked={cancellationRefundEnabled} 
              onChange={e => setCancellationRefundEnabled(e.target.checked)} 
              id="refunds"
            />
            <label htmlFor="refunds" className="field-label" style={{ marginBottom: 0 }}>Enable Cancellation Refunds (issue credit notes on cancel)</label>
          </div>

          <div className="action-row" style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
