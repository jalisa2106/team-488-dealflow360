'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface Subscription {
  id: string;
  status: string;
  quantity: number;
  startedAt: string;
  endDate?: string;
  subscriptionPlan: { name: string; frequency: string; price: number };
  order?: {
    orderNumber: string;
    invoices: Array<{ id: string; invoiceNumber: string; amount: number; status: string }>;
  };
  billingSchedules: Array<{ billingDate: string; amount: number; status: string }>;
}

export default function BillingDetailPage() {
  const params = useParams();
  const subscriptionId = params.subscriptionId as string;
  const toast = useToast();

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/subscriptions/${subscriptionId}`);
        const data = await res.json();
        if (data.success) {
          setSub(data.data);
          setEndDate(data.data.endDate ? new Date(data.data.endDate).toISOString().split('T')[0] : '');
        }
        else toast.error('Failed to load subscription');
      } catch {
        toast.error('Network error loading subscription');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subscriptionId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');
      toast.success(
        data.data.creditNote
          ? `Subscription cancelled. Credit note of $${Number(data.data.proration.creditAmount).toFixed(2)} created.`
          : 'Subscription cancelled successfully.'
      );
      // Reload data
      setSub(prev => prev ? { ...prev, status: 'CANCELLED' } : prev);
      setConfirmCancel(false);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateDate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: endDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription');
      toast.success('Subscription end date updated');
      setSub(prev => prev ? { ...prev, endDate: data.data.endDate } : prev);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading subscription details...</div>;
  if (!sub) return <div className="notice">Subscription not found.</div>;

  const isCancelled = sub.status === 'CANCELLED';
  const nextSchedule = sub.billingSchedules?.find(s => s.status === 'PENDING');

  return (
    <div className="space-y-6">
      <Link href="/subscriptions" className="back-link">← Back to Subscriptions</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Subscription: {sub.subscriptionPlan?.name}</h1>
          <p className="support-text">Billing detail and lifecycle management</p>
        </div>
        <span className={`badge ${isCancelled ? 'badge-danger' : sub.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
          {sub.status}
        </span>
      </div>

      {/* Plan Details */}
      <div className="card section">
        <h2 className="section-title">Plan Details</h2>
        <div className="form-row form-row-3">
          <div className="field-group">
            <label className="field-label">Plan</label>
            <input className="input" value={sub.subscriptionPlan?.name || '-'} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">Frequency</label>
            <input className="input" value={sub.subscriptionPlan?.frequency || '-'} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">Price/Period</label>
            <input className="input" value={`$${Number(sub.subscriptionPlan?.price || 0).toLocaleString()}`} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">Quantity</label>
            <input className="input" value={sub.quantity} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">Started</label>
            <input className="input" value={new Date(sub.startedAt).toLocaleDateString()} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">Next Bill Date</label>
            <input className="input" value={nextSchedule ? new Date(nextSchedule.billingDate).toLocaleDateString() : 'N/A'} readOnly />
          </div>
          <div className="field-group">
            <label className="field-label">End Date</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="date" 
                className="input" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleUpdateDate} 
                disabled={updating || sub.endDate === (endDate || null)}
              >
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
            <span className="support-text" style={{ display: 'block', marginTop: 4 }}>Leave blank for auto-renew</span>
          </div>
        </div>
      </div>

      {/* Billing Schedules */}
      {sub.billingSchedules?.length > 0 && (
        <div className="card section">
          <h2 className="section-title">Upcoming Billing Schedules</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Billing Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sub.billingSchedules.slice(0, 5).map((s, i) => (
                  <tr key={i}>
                    <td>{new Date(s.billingDate).toLocaleDateString()}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>${Number(s.amount).toLocaleString()}</td>
                    <td><span className={`badge ${s.status === 'PAID' ? 'badge-success' : s.status === 'BILLED' ? 'badge-info' : s.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order / Invoice */}
      {sub.order && (
        <div className="card section">
          <h2 className="section-title">Linked Order: {sub.order.orderNumber}</h2>
          {sub.order.invoices?.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Invoice #</th><th className="text-right">Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {sub.order.invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.invoiceNumber}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>${Number(inv.amount).toLocaleString()}</td>
                      <td><span className="badge badge-neutral">{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isCancelled ? (
        <div style={{ padding: '14px 16px', background: 'var(--danger-bg)', border: '2px solid var(--danger-border)', borderRadius: 6, fontWeight: 700, color: 'var(--danger-fg)' }}>
          ✗ Subscription cancelled. Future billing stopped. History preserved.
        </div>
      ) : (
        <>
          {confirmCancel ? (
            <div className="card" style={{ border: '2px solid var(--danger-border)', background: 'var(--danger-bg)' }}>
              <p style={{ color: 'var(--danger-fg)', fontWeight: 600, marginBottom: 12 }}>
                Are you sure you want to cancel this subscription? Future billing will stop.
                A prorated credit note will be created for any unused period.
              </p>
              <div className="action-row">
                <button className="btn btn-secondary" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
                  Keep Subscription
                </button>
                <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <div className="action-row">
              <button className="btn btn-danger" onClick={() => setConfirmCancel(true)}>
                Cancel Subscription
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
