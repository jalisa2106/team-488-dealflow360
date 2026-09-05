'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FulfillmentPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/fulfillment');
        if (res.ok) {
          const data = await res.json();
          setInventory(data.inventory || []);
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading fulfillment data...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fulfillment & Warehouse Stock</h1>
        <p className="support-text">Live stock per warehouse, plus every order awaiting fulfillment</p>
      </div>

      {/* Stock Table */}
      <div className="section">
        <h2 className="section-title">Warehouse Inventory</h2>
        {inventory.length === 0 ? (
          <div className="notice">No inventory records found. Ensure warehouses and products are seeded.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-right">In Stock</th>
                  <th className="text-right">Reserved</th>
                  <th className="text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row: any, i: number) => {
                  const safeNum = (val: any, fallback = 0) => {
                    if (val === undefined || val === null) return fallback;
                    const n = Number(val);
                    return Number.isNaN(n) ? fallback : n;
                  };

                  const available = safeNum(row.quantityAvailable ?? row.available);
                  const reserved = safeNum(row.quantityReserved ?? row.reserved, 0);
                  const inStock = safeNum(row.quantityOnHand ?? row.quantity, available + reserved);

                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.warehouse?.name || '—'}</td>
                      <td>{row.product?.name || '—'}</td>
                      <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{row.product?.sku || '—'}</td>
                      <td className="text-right">{inStock}</td>
                      <td className="text-right">{reserved}</td>
                      <td className="text-right">
                        <span className={`badge ${available <= 5 ? 'badge-danger' : available <= 15 ? 'badge-warning' : 'badge-success'}`}>
                          {available}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders Awaiting Fulfillment */}
      <div className="section">
        <h2 className="section-title">Orders Awaiting Fulfillment</h2>
        {orders.length === 0 ? (
          <div className="notice">No orders currently awaiting fulfillment. Orders appear here when a quote is approved and confirmed.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Warehouse Allocations</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const allocations = order.fulfillmentAllocations || [];
                  const warehouseNames = [...new Set(allocations.map((a: any) => a.warehouse?.name))].join(' + ');
                  const productNames = (order.quote?.quoteLines || []).map((l: any) => l.product?.name).join(', ');
                  const isSplit = allocations.length > 1;

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        <Link href={`/fulfillment/${order.id}`}>
                          {order.quote?.quoteNumber || order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{order.quote?.customer?.companyName || 'Unknown'}</td>
                      <td>
                        <span className={`badge ${order.status === 'FULFILLING' ? 'badge-warning' : order.status === 'CONFIRMED' ? 'badge-neutral' : 'badge-info'}`}>
                          {isSplit ? 'Split Required' : order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productNames || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {warehouseNames || <span style={{ color: 'var(--fg-muted)' }}>Not yet allocated</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="notice" style={{ marginTop: 12 }}>
          When a quote is approved and confirmed, the Fulfillment Engine automatically allocates inventory across warehouses using a greedy split algorithm.
        </div>
      </div>
    </div>
  );
}
