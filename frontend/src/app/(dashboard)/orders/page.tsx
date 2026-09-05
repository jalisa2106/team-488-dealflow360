'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Toggles for API filtering
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'warehouse'>('none');
  
  // Explicit filters to send to API
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter, warehouseFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        if (data.warehouses) {
          setWarehouses(data.warehouses);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle group by toggles - these are mutually exclusive
  const toggleGroupBy = (type: 'none' | 'status' | 'warehouse') => {
    setGroupBy(type);
    if (type === 'none') {
      setStatusFilter('');
      setWarehouseFilter('');
    }
  };

  // The actual grouped rendering data
  const groupedOrders = (() => {
    if (groupBy === 'none') return { 'All Orders': orders };
    
    const groups: Record<string, any[]> = {};
    orders.forEach(order => {
      if (groupBy === 'status') {
        const s = order.status.replace('_', ' ') || 'UNKNOWN';
        if (!groups[s]) groups[s] = [];
        groups[s].push(order);
      } else if (groupBy === 'warehouse') {
        const allocations = order.fulfillmentAllocations || [];
        if (allocations.length === 0) {
          if (!groups['Unassigned']) groups['Unassigned'] = [];
          groups['Unassigned'].push(order);
        } else {
          allocations.forEach((a: any) => {
            const w = a.warehouse?.name || 'Unknown';
            if (!groups[w]) groups[w] = [];
            if (!groups[w].find((o: any) => o.id === order.id)) {
              groups[w].push(order);
            }
          });
        }
      }
    });
    return Object.fromEntries(Object.entries(groups).sort());
  })();

  const renderTable = (items: any[]) => (
    <div className="table-wrap bg-[var(--surface)] border-[var(--border)]">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order Number</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Products</th>
            <th>Warehouse Allocations</th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No orders found.</td></tr>
          ) : (
            items.map(order => {
              const allocations = order.fulfillmentAllocations || [];
              const warehouseNames = [...new Set(allocations.map((a: any) => a.warehouse?.name))].join(' + ');
              const productNames = (order.quote?.quoteLines || []).map((l: any) => l.product?.name).join(', ');
              const isSplit = allocations.length > 1;

              return (
                <tr key={order.id} className="clickable" onClick={() => window.location.href = `/fulfillment/${order.id}`}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {order.orderNumber || order.quote?.quoteNumber || order.id.slice(0, 8)}
                  </td>
                  <td>{order.quote?.customer?.companyName || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${order.status === 'FULFILLING' ? 'badge-warning' : order.status === 'CONFIRMED' ? 'badge-neutral' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-info'}`}>
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
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="support-text">Browse and filter all orders across the system.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Action buttons if needed */}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 200 }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="FULFILLING">Fulfilling</option>
            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="BACKORDERED">Backordered</option>
          </select>
          
          <select 
            value={warehouseFilter} 
            onChange={e => setWarehouseFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 200 }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="toggle-group" style={{ display: 'inline-flex' }}>
          <button className={`toggle-btn ${groupBy === 'none' ? 'active' : ''}`} onClick={() => toggleGroupBy('none')}>List</button>
          <button className={`toggle-btn ${groupBy === 'status' ? 'active' : ''}`} onClick={() => toggleGroupBy('status')}>Group by Status</button>
          <button className={`toggle-btn ${groupBy === 'warehouse' ? 'active' : ''}`} onClick={() => toggleGroupBy('warehouse')}>Group by Warehouse</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {Object.entries(groupedOrders).map(([groupName, items]) => (
          <div key={groupName}>
            {groupBy !== 'none' && <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{groupName} <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>({items.length})</span></h3>}
            {renderTable(items)}
          </div>
        ))}
      </div>
    </div>
  );
}
