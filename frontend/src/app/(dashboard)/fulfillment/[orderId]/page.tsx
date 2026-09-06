'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function FulfillmentDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const toast = useToast();
  const [accepted, setAccepted] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [allocs, setAllocs] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Unwrap params using React.use() or await inside useEffect
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    params.then(p => setOrderId(p.orderId));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    async function fetchData() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          if (data.fulfillmentAllocations?.length) {
            setAllocs(data.fulfillmentAllocations.map((a: any) => ({
              warehouseId: a.warehouseId,
              warehouse: a.warehouse.name,
              qty: a.quantity,
              shipments: 1, // simplified
              cost: a.shippingCost
            })));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orderId]);

  const totalQty = allocs.reduce((s, a) => s + a.qty, 0);
  const totalCost = allocs.reduce((s, a) => s + a.cost, 0);

  const handleAccept = async () => {
    setAccepted(true);
    await new Promise(r => setTimeout(r, 800));
    router.push('/invoices');
  };

  const handleSaveOverride = async () => {
    if (!order || !order.quote?.quoteLines?.[0]) return;
    
    const productId = order.quote.quoteLines[0].productId;
    const requestedQuantity = order.quote.quoteLines[0].quantity;
    
    const manualOverride = allocs.map(a => ({
      warehouseId: a.warehouseId,
      allocated: a.qty
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/fulfillment/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          requestedQuantity,
          manualOverride,
          overrideReason: 'Manual adjustment by Operations'
        })
      });
      if (!res.ok) throw new Error('Override failed');
      setOverriding(false);
      toast.success('Override saved!');
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading order details...</div>;
  if (!order) return <div style={{ padding: 40 }}>Order not found.</div>;

  return (
    <div>
      <Link href="/fulfillment" className="back-link">← Back to Fulfillment</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Fulfillment Detail: {order.quote?.quoteNumber || orderId}</h1>
          <p className="support-text">Customer: {order.quote?.customer?.companyName}</p>
        </div>
        <span className="badge badge-warning">{order.status.replace('_', ' ')}</span>
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
              <button className="btn btn-primary" onClick={handleSaveOverride}>Save Override</button>
              <button className="btn btn-secondary" onClick={() => { setOverriding(false); }}>Cancel</button>
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
