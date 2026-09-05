'use client';
import Link from 'next/link';

const PRODUCTS = [
  { id: 'P-001', name: 'Laptop Pro 14', category: 'Hardware', variants: '3 (size)', price: '$1,200', unit: 'Each', tax: '15%', status: 'Active' },
  { id: 'P-002', name: 'Onsite Setup Service', category: 'Services', variants: '–', price: '$450', unit: 'Each', tax: '10%', status: 'Active' },
  { id: 'P-003', name: 'Docking Station', category: 'Hardware', variants: '3 (color)', price: '$180', unit: 'Each', tax: '15%', status: 'Active' },
  { id: 'P-004', name: 'Care Plan 3 years', category: 'Subscription', variants: '–', price: '$40/mo', unit: 'Recurring', tax: '0%', status: 'Active' },
];

export default function ProductsPage() {
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
          <div className="kpi-value text-[var(--fg)]">128</div>
          <div className="kpi-sub">active, 6 archived</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Pricelists</div>
          <div className="kpi-value text-[var(--fg)]">3</div>
          <div className="kpi-sub">tiers, 2 currencies</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Variants</div>
          <div className="kpi-value text-[var(--fg)]">340</div>
          <div className="kpi-sub">SKUs across all products</div>
        </div>
      </div>

      <h2 className="section-title">Products</h2>
      
      {/* Data Table using theme variables */}
      <div className="table-wrap bg-[var(--surface)] border-[var(--border)]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Variants</th>
              <th className="text-right">Price</th>
              <th>Unit</th>
              <th className="text-right">Tax</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map(row => (
              <tr key={row.id} className="clickable" onClick={() => window.location.href = `/products/${row.id}`}>
                <td style={{ fontWeight: 700 }}>{row.name}</td>
                <td><span className="badge badge-neutral">{row.category}</span></td>
                <td style={{ color: 'var(--fg-muted)' }}>{row.variants}</td>
                <td className="text-right" style={{ fontWeight: 600 }}>{row.price}</td>
                <td>{row.unit}</td>
                <td className="text-right">{row.tax}</td>
                <td><span className="badge badge-success">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notice" style={{ marginTop: 12 }}>
        Click a product row to open general info, variants and tier/currency price lists.
      </div>
    </div>
  );
}
