'use client';
import Link from 'next/link';

const ADMIN_SECTIONS = [
  {
    href: '/admin/discount-config',
    title: 'Discount & Approval Rules',
    desc: 'Configure max discount ceilings per tier/category and approval routing by risk score.',
  },
  {
    href: '/admin/warehouses',
    title: 'Warehouse Management',
    desc: 'Manage warehouse locations, shipping costs, and inventory stock levels.',
  },
  {
    href: '/admin/upsell-rules',
    title: 'Upsell Rules',
    desc: 'Configure product pairing rules to drive upsell recommendations in quotes.',
  },
];

export default function AdminIndexPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Admin Configuration</h1>
        <p className="support-text">System-wide rules, catalog config, and warehouse management</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {ADMIN_SECTIONS.map(section => (
          <Link key={section.href} href={section.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div 
              className="card card-shadow" 
              style={{ 
                cursor: 'pointer', 
                transition: 'all 0.2s ease', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translate(-4px, -4px)';
                e.currentTarget.style.boxShadow = '7px 7px 0 var(--border)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = '3px 3px 0 var(--border)';
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--fg)' }}>{section.title}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.5, flex: 1 }}>{section.desc}</div>
              <div style={{ marginTop: 24, fontSize: 13, color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Configure →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
