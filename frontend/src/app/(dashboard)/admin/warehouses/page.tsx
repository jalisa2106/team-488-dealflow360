'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { Toolbar } from '@/components/Toolbar';

interface Product { id: string; name: string; sku: string; }
interface InventoryRow { product: Product; quantityAvailable: number; }
interface Warehouse {
  id: string;
  name: string;
  code: string;
  shippingBaseCost: number;
  active: boolean;
  inventories: InventoryRow[];
}

export default function WarehousesPage() {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New warehouse form
  const [showNew, setShowNew] = useState(false);
  const [newW, setNewW] = useState({ name: '', code: '', shippingBaseCost: 0 });

  // Stock adjustment state
  const [stockEdit, setStockEdit] = useState<{ warehouseId: string; productId: string; qty: string }>({ warehouseId: '', productId: '', qty: '' });
  const [addProduct, setAddProduct] = useState<{ warehouseId: string; productId: string; qty: string }>({ warehouseId: '', productId: '', qty: '0' });

  // Toolbar state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          fetch('/api/warehouses'),
          fetch('/api/products'),
        ]);
        const [wData, pData] = await Promise.all([wRes.json(), pRes.json()]);
        if (wData.success) setWarehouses(wData.data);
        if (pData.success) setProducts(pData.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateWarehouse = async () => {
    if (!newW.name || !newW.code) { toast.error('Name and Code are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newW),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success('Warehouse created');
      setWarehouses(prev => [...prev, { ...data.data, inventories: [] }]);
      setNewW({ name: '', code: '', shippingBaseCost: 0 });
      setShowNew(false);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Warehouse ${active ? 'activated' : 'deactivated'}`);
      setWarehouses(prev => prev.map(w => w.id === id ? { ...w, active } : w));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async (warehouseId: string, productId: string, qty: number, reason?: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust');
      toast.success(`Stock updated to ${qty}`);
      // Update local state
      setWarehouses(prev => prev.map(w => {
        if (w.id !== warehouseId) return w;
        const existing = w.inventories.find(inv => inv.product.id === productId);
        if (existing) {
          return { ...w, inventories: w.inventories.map(inv => inv.product.id === productId ? { ...inv, quantityAvailable: qty } : inv) };
        } else {
          const p = products.find(p => p.id === productId);
          if (!p) return w;
          return { ...w, inventories: [...w.inventories, { product: p, quantityAvailable: qty }] };
        }
      }));
      setStockEdit({ warehouseId: '', productId: '', qty: '' });
      setAddProduct({ warehouseId: '', productId: '', qty: '0' });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading warehouses...</div>;

  return (
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Warehouse Management</h1>
          <p className="support-text">Manage warehouse locations and inventory stock levels</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Cancel' : '+ New Warehouse'}
        </button>
      </div>

      {/* New warehouse form */}
      {showNew && (
        <div className="card section">
          <h2 className="section-title">New Warehouse</h2>
          <div className="form-row form-row-3" style={{ gap: 10 }}>
            <div className="field-group">
              <label className="field-label">Name</label>
              <input className="input" value={newW.name} onChange={e => setNewW(p => ({ ...p, name: e.target.value }))} placeholder="Main Distribution Center" />
            </div>
            <div className="field-group">
              <label className="field-label">Code (unique)</label>
              <input className="input" value={newW.code} onChange={e => setNewW(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MDC-01" />
            </div>
            <div className="field-group">
              <label className="field-label">Shipping Base Cost ($)</label>
              <input className="input" type="number" min={0}
                value={newW.shippingBaseCost}
                onChange={e => setNewW(p => ({ ...p, shippingBaseCost: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleCreateWarehouse} disabled={saving}>Create</button>
          </div>
        </div>
      )}


      <Toolbar
        searchValue={search} onSearch={setSearch} searchPlaceholder="Search warehouses..."
        filterOptions={['All', 'Active', 'Inactive']} filterValue={filter} onFilter={setFilter}
        totalShown={warehouses.filter(w => (filter === 'All' || (filter === 'Active' && w.active) || (filter === 'Inactive' && !w.active)) && (w.name.toLowerCase().includes(search.toLowerCase()) || w.code.toLowerCase().includes(search.toLowerCase()))).length}
        totalAll={warehouses.length}
      />

      {/* Warehouse list */}
      {warehouses.length === 0 ? (
        <div className="notice">No warehouses configured yet. Create one above.</div>
      ) : (
        warehouses
          .filter(w => {
            if (filter === 'Active' && !w.active) return false;
            if (filter === 'Inactive' && w.active) return false;
            if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.code.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
          })
          .map(w => (
          <div key={w.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{w.name}</span>
                <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{w.code}</span>
                <span className={`badge ${w.active ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 6 }}>
                  {w.active ? 'Active' : 'Inactive'}
                </span>
                <span style={{ marginLeft: 12, color: 'var(--fg-muted)', fontSize: 13 }}>
                  Shipping base: ${Number(w.shippingBaseCost).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                  {expandedId === w.id ? 'Collapse' : 'Manage Stock'}
                </button>
                <button className={`btn ${w.active ? 'btn-danger' : 'btn-secondary'}`} style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => handleToggleActive(w.id, !w.active)} disabled={saving}>
                  {w.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            {expandedId === w.id && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Stock Levels</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th className="text-right">Qty Available</th>
                        <th className="text-right">Adjust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.inventories.map(inv => (
                        <tr key={inv.product.id}>
                          <td style={{ fontWeight: 600 }}>{inv.product.name}</td>
                          <td style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{inv.product.sku}</td>
                          <td className="text-right" style={{ fontWeight: 700 }}>{inv.quantityAvailable}</td>
                          <td className="text-right">
                            {stockEdit.warehouseId === w.id && stockEdit.productId === inv.product.id ? (
                              <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <input type="number" min={0} style={{ width: 80, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                                  value={stockEdit.qty}
                                  onChange={e => setStockEdit(s => ({ ...s, qty: e.target.value }))} />
                                <button className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 12 }}
                                  onClick={() => handleAdjustStock(w.id, inv.product.id, Number(stockEdit.qty))} disabled={saving}>
                                  Set
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }}
                                  onClick={() => setStockEdit({ warehouseId: '', productId: '', qty: '' })}>
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button className="btn btn-secondary" style={{ padding: '2px 10px', fontSize: 12 }}
                                onClick={() => setStockEdit({ warehouseId: w.id, productId: inv.product.id, qty: String(inv.quantityAvailable) })}>
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {w.inventories.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>No inventory records. Add a product below.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add product to this warehouse */}
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div className="field-group" style={{ flex: 2 }}>
                    <label className="field-label">Add Product</label>
                    <select className="select" value={addProduct.warehouseId === w.id ? addProduct.productId : ''}
                      onChange={e => setAddProduct({ warehouseId: w.id, productId: e.target.value, qty: '0' })}>
                      <option value="">Select product…</option>
                      {products.filter(p => !w.inventories.some(inv => inv.product.id === p.id))
                        .map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label">Initial Qty</label>
                    <input className="input" type="number" min={0}
                      value={addProduct.warehouseId === w.id ? addProduct.qty : '0'}
                      onChange={e => setAddProduct(a => ({ ...a, qty: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" style={{ marginBottom: 2 }}
                    onClick={() => {
                      if (!addProduct.productId || addProduct.warehouseId !== w.id) return;
                      handleAdjustStock(w.id, addProduct.productId, Number(addProduct.qty), 'Initial stock entry');
                    }}
                    disabled={saving || !addProduct.productId || addProduct.warehouseId !== w.id}>
                    Add Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
