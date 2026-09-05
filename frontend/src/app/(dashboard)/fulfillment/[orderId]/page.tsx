'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ALLOCATIONS = [
  { warehouse: 'Main Warehouse', qty: 18, shipments: 1, cost: 42 },
  { warehouse: 'East Depot', qty: 6, shipments: 1, cost: 29 },
];

export default function FulfillmentDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [accepted, setAccepted] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [allocs, setAllocs] = useState(ALLOCATIONS);
  const router = useRouter();

  const totalQty = allocs.reduce((s, a) => s + a.qty, 0);
  const totalCost = allocs.reduce((s, a) => s + a.cost, 0);

  const handleAccept = async () => {
    setAccepted(true);
    await new Promise(r => setTimeout(r, 800));
    router.push('/invoices');
  };

  return (
    <div>
      <Link href="/fulfillment" className="back-link">← Back to Fulfillment</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Fulfillment Detail: Q-1042</h1>
          <p className="support-text">Opened by clicking an order row on the Fulfillment list</p>
        </div>
        <span className="badge badge-warning">Split Pending</span>
      </div>

      {/* Warehouse Split Table */}
      <div className="card section">
        <h2 className="section-title">Warehouse Split</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th className="text-right">Qty Fulfilled</th>
                <th className="text-right">Est. Shipments</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.warehouse}</td>
                  <td className="text-right">
                    {overriding ? (
                      <input
                        type="number"
                        min={0}
                        value={row.qty}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setAllocs(prev => prev.map((a, j) => j === i ? { ...a, qty: v } : a));
                        }}
                        style={{ width: 70, textAlign: 'right', padding: '4px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }}
                      />
                    ) : `${row.qty} units`}
                  </td>
                  <td className="text-right">{row.shipments}</td>
                  <td className="text-right">${row.cost}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: 'var(--surface-muted)' }}>
                <td>Total</td>
                <td className="text-right">{totalQty} units</td>
                <td className="text-right">{allocs.reduce((s, a) => s + a.shipments, 0)}</td>
                <td className="text-right">${totalCost}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          &quot;Consolidate Remaining Backorder&quot; prompt appears automatically once East Depot restocks.
        </div>
      </div>

      {/* Actions */}
      {accepted ? (
        <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
          ✓ Split accepted — updating invoice lifecycle…
        </div>
      ) : (
        <div className="action-row">
          {overriding ? (
            <>
              <button className="btn btn-primary" onClick={() => { setOverriding(false); }}>Save Override</button>
              <button className="btn btn-secondary" onClick={() => { setAllocs(ALLOCATIONS); setOverriding(false); }}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={handleAccept}>Accept Suggested Split</button>
              <button className="btn btn-secondary" onClick={() => setOverriding(true)}>Manual Override</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
