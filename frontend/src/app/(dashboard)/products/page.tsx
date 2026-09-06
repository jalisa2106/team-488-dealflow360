'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toolbar } from '@/components/Toolbar';

import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function ProductsPage() {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'category'>('none');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  }

  const activeProducts = products.filter(p => p.active).length;
  const archivedProducts = products.filter(p => !p.active).length;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (subset: { id: string }[]) => {
    const subsetIds = subset.map(p => p.id);
    const allSelected = subsetIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    
    if (allSelected) {
      subsetIds.forEach(id => next.delete(id));
    } else {
      subsetIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleBulkAction = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    const ok = await toast.confirm(`Are you sure you want to ${active ? 'activate' : 'archive'} ${selectedIds.size} products?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), active })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchData(); // Refresh
      } else {
        const data = await res.json();
        toast.error(data.error || 'Bulk action failed');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) || 
           p.sku?.toLowerCase().includes(search.toLowerCase());
  });

  const groupedProducts = (() => {
    if (groupBy === 'none') return { 'All Products': filteredProducts };
    
    const groups: Record<string, unknown[]> = {};
    filteredProducts.forEach((p: any) => {
      const cat = p.category?.name || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  })();

  const renderTable = (items: any[]) => {
    const allSelected = items.length > 0 && items.every(p => selectedIds.has(p.id));
    const someSelected = items.some(p => selectedIds.has(p.id)) && !allSelected;

    return (
      <div className="table-wrap bg-[var(--surface)] border-[var(--border)]">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={() => toggleSelectAll(items)} 
                />
              </th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th className="text-right">Base Price</th>
              <th>Unit</th>
              <th className="text-right">Tax %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign: 'center', padding: 20}}>No products found.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="clickable" style={{ backgroundColor: selectedIds.has(row.id) ? 'var(--bg-subtle)' : undefined }}>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelection(row.id)} />
                  </td>
                  <td style={{ fontWeight: 700 }}>{row.name}</td>
                  <td style={{ color: 'var(--fg-muted)' }}>{row.sku}</td>
                  <td><span className="badge badge-neutral">{row.category?.name || 'Uncategorized'}</span></td>
                  <td className="text-right" style={{ fontWeight: 600 }}>${Number(row.basePrice || 0).toLocaleString()}</td>
                  <td>{row.unit}</td>
                  <td className="text-right">{Number(row.taxPercent || 0)}%</td>
                  <td>
                    <span className={`badge ${row.active ? 'badge-success' : 'badge-neutral'}`}>
                      {row.active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="support-text">Every product, variant and price list in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/products/new" className="btn btn-primary">+ New Product</Link>
          <button className="btn btn-secondary">Manage Price Fields</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Total Products</div>
          <div className="kpi-value text-[var(--fg)]">{products.length}</div>
          <div className="kpi-sub">{activeProducts} active, {archivedProducts} archived</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Categories</div>
          <div className="kpi-value text-[var(--fg)]">{new Set(products.map(p => p.categoryId)).size}</div>
          <div className="kpi-sub">product categories</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Stocked</div>
          <div className="kpi-value text-[var(--fg)]">{products.filter(p => p.inventories?.length > 0).length}</div>
          <div className="kpi-sub">products in warehouses</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Products</h2>
      </div>

      <Toolbar 
        searchPlaceholder="Search products by name or SKU..."
        searchValue={search} onSearch={setSearch}
        groupOptions={['none', 'category']} groupValue={groupBy} onGroup={(v) => setGroupBy(v as 'none' | 'category')}
        totalShown={filteredProducts.length} totalAll={products.length}
      />

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 20px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.size} products selected</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" style={{ background: 'white', color: 'var(--primary)', padding: '6px 12px', fontSize: 13 }} onClick={() => handleBulkAction(true)} disabled={submitting}>Activate Selected</button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', fontSize: 13, border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => handleBulkAction(false)} disabled={submitting}>Archive Selected</button>
          </div>
        </div>
      )}
      
      {/* Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {Object.entries(groupedProducts).map(([groupName, items]) => (
          <div key={groupName}>
            {groupBy !== 'none' && <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{groupName} <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>({items.length})</span></h3>}
            {renderTable(items)}
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 12 }}>
        Click a product row to open general info, variants and tier/currency price lists.
      </div>
    </div>
  );
}
