'use client';
import Link from 'next/link';

const ADMIN_SECTIONS = [
  {
    href: '/admin/discount-config',
    title: 'Discount & Approval Rules',
    desc: 'Configure max discount ceilings per tier/category and approval routing by risk score.',
    icon: '📊',
  },
  {
    href: '/admin/warehouses',
    title: 'Warehouse Management',
    desc: 'Manage warehouse locations, shipping costs, and inventory stock levels.',
    icon: '🏭',
  },
  {
    href: '/admin/upsell-rules',
    title: 'Upsell Rules',
    desc: 'Configure product pairing rules to drive upsell recommendations in quotes.',
    icon: '🔗',
  },
];

export default function AdminIndexPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Admin Configuration</h1>
        <p className="support-text">System-wide rules, catalog config, and warehouse management</p>
      </div>

      <div className="kpi-grid">
        {ADMIN_SECTIONS.map(section => (
          <Link key={section.href} href={section.href}>
            <div className="kpi-card card-shadow" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{section.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{section.title}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{section.desc}</div>
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                Configure →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
