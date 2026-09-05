'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/quotations', label: 'Quotations' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/fulfillment', label: 'Fulfillment' },
  { href: '/subscriptions', label: 'Subscriptions' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/deal-health', label: 'Deal Health' },
  { href: '/reports', label: 'Reports' },
  { href: '/products', label: 'Product' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <span className="topbar-brand">DealFlow360</span>
      <nav className="topbar-tabs">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-tab${isActive ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/quotations/new" className="btn btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>
        + New Quote
      </Link>
    </header>
  );
}
