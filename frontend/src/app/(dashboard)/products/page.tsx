'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
    fetchData();
  }, []);

  const activeProducts = products.filter(p => p.active).length;
  const archivedProducts = products.filter(p => !p.active).length;

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

      {/* KPI Cards using theme variables */}
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

      <h2 className="section-title">Products</h2>
      
      {/* Data Table using theme variables */}
      <div className="table-wrap bg-[var(--surface)] border-[var(--border)]">
        <table className="data-table">
          <thead>
            <tr>
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
            {loading ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>No products found.</td></tr>
            ) : (
              products.map(row => (
                <tr key={row.id} className="clickable" onClick={() => window.location.href = `/products/${row.id}`}>
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

      <div className="notice" style={{ marginTop: 12 }}>
        Click a product row to open general info, variants and tier/currency price lists.
      </div>
    </div>
  );
}
