'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ── Shared toolbar component ───────────────────────────────────────────────
function Toolbar({
  searchValue, onSearch, searchPlaceholder,
  groupOptions, groupValue, onGroup,
  filterOptions, filterValue, onFilter,
  totalShown, totalAll,
}: {
  searchValue: string; onSearch: (v: string) => void; searchPlaceholder: string;
  groupOptions: string[]; groupValue: string; onGroup: (v: string) => void;
  filterOptions: string[]; filterValue: string; onFilter: (v: string) => void;
  totalShown: number; totalAll: number;
}) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      borderRadius: 8,
    }}>
      <input
        className="input"
        placeholder={`🔍  ${searchPlaceholder}`}
        value={searchValue}
        onChange={(e) => onSearch(e.target.value)}
        style={{ minWidth: 180, flex: 1, maxWidth: 260, fontSize: 13, padding: '6px 10px' }}
      />
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Filter:</label>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button key={opt} onClick={() => onFilter(opt)} style={{
            padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: 'pointer',
            border: '1.5px solid', transition: 'all 0.1s',
            borderColor: filterValue === opt ? 'var(--primary)' : 'var(--border)',
            background: filterValue === opt ? 'var(--primary)' : 'transparent',
            color: filterValue === opt ? '#fff' : 'var(--fg-muted)',
          }}>{opt}</button>
        ))}
      </div>
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Group by:</label>
      <select className="select" value={groupValue} onChange={(e) => onGroup(e.target.value)}
        style={{ fontSize: 12, padding: '5px 8px', minWidth: 120 }}>
        {groupOptions.map((o) => <option key={o}>{o}</option>)}
      </select>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
        {totalShown} of {totalAll}
      </span>
    </div>
  );
}

export default function FulfillmentPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group by states
  const [groupInventoryBy, setGroupInventoryBy] = useState<'none' | 'warehouse'>('none');
  const [groupOrdersBy, setGroupOrdersBy] = useState<'none' | 'status'>('none');

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

  // Grouping logic for inventory
  const groupedInventory = (() => {
    if (groupInventoryBy === 'none') return { 'All Inventory': inventory };
    const groups: Record<string, any[]> = {};
    inventory.forEach(row => {
      const w = row.warehouse?.name || 'Unassigned';
      if (!groups[w]) groups[w] = [];
      groups[w].push(row);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  })();

  // Grouping logic for orders
  const groupedOrders = (() => {
    if (groupOrdersBy === 'none') return { 'All Orders': orders };
    const groups: Record<string, any[]> = {};
    orders.forEach(row => {
      const s = row.status.replace('_', ' ') || 'UNKNOWN';
      if (!groups[s]) groups[s] = [];
      groups[s].push(row);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  })();

  const renderInventoryTable = (items: any[]) => (
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
          {items.length === 0 ? (
             <tr><td colSpan={6} style={{textAlign: 'center', padding: 20}}>No inventory records in this group.</td></tr>
          ) : (
            items.map((row: any, i: number) => {
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
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const renderOrdersTable = (items: any[]) => (
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
          {items.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No orders in this group.</td></tr>
          ) : (
            items.map((order: any) => {
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
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fulfillment & Warehouse Stock</h1>
        <p className="support-text">Live stock per warehouse, plus every order awaiting fulfillment</p>
      </div>

      {/* Stock Table */}
      <div className="section" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Warehouse Inventory</h2>
          <div className="toggle-group" style={{ display: 'inline-flex' }}>
            <button className={`toggle-btn ${groupInventoryBy === 'none' ? 'active' : ''}`} onClick={() => setGroupInventoryBy('none')}>List</button>
            <button className={`toggle-btn ${groupInventoryBy === 'warehouse' ? 'active' : ''}`} onClick={() => setGroupInventoryBy('warehouse')}>Group by Warehouse</button>
          </div>
        </div>
        
        {inventory.length === 0 ? (
          <div className="notice">No inventory records found. Ensure warehouses and products are seeded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedInventory).map(([groupName, items]) => (
              <div key={groupName}>
                {groupInventoryBy !== 'none' && <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{groupName} <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>({items.length})</span></h3>}
                {renderInventoryTable(items)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Awaiting Fulfillment */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Orders Awaiting Fulfillment</h2>
          <div className="toggle-group" style={{ display: 'inline-flex' }}>
            <button className={`toggle-btn ${groupOrdersBy === 'none' ? 'active' : ''}`} onClick={() => setGroupOrdersBy('none')}>List</button>
            <button className={`toggle-btn ${groupOrdersBy === 'status' ? 'active' : ''}`} onClick={() => setGroupOrdersBy('status')}>Group by Status</button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="notice">No orders currently awaiting fulfillment. Orders appear here when a quote is approved and confirmed.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedOrders).map(([groupName, items]) => (
              <div key={groupName}>
                {groupOrdersBy !== 'none' && <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{groupName} <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>({items.length})</span></h3>}
                {renderOrdersTable(items)}
              </div>
            ))}
          </div>
        )}
        <div className="notice" style={{ marginTop: 12 }}>
          When a quote is approved and confirmed, the Fulfillment Engine automatically allocates inventory across warehouses using a greedy split algorithm.
        </div>
      </div>
    </div>
  );
}
