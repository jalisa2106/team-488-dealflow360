'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole, User } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/quotations', label: 'Quotations' },
  { href: '/approvals', label: 'Approvals', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { href: '/fulfillment', label: 'Fulfillment', roles: ['ADMIN', 'OPERATIONS', 'SALES_MANAGER'] },
  { href: '/subscriptions', label: 'Subscriptions', roles: ['ADMIN', 'FINANCE', 'SALES_REP', 'SALES_MANAGER'] },
  { href: '/invoices', label: 'Invoices', roles: ['ADMIN', 'FINANCE', 'SALES_MANAGER'] },
  { href: '/deal-health', label: 'Deal Health', roles: ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'] },
  { href: '/reports', label: 'Reports' },
  { href: '/products', label: 'Products' },
  { href: '/customers', label: 'Customers' },
  { href: '/admin/discount-config', label: 'Admin Rules', roles: ['ADMIN'] },
];

export default function TopNav() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.user) {
          setCurrentUser(data.data.user);
        } else if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const currentRole = currentUser?.role || 'SALES_REP';

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });

  return (
    <header className="topbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      boxShadow: '0 2px 0 var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard" className="topbar-brand" style={{ textDecoration: 'none' }}>
          DealFlow360
        </Link>
      </div>

      <nav className="topbar-tabs" style={{ overflowX: 'auto' }}>
        {visibleNavItems.map((item) => {
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

      {/* User Session Info & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '12px' }}>
            <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
            <span className="badge badge-info" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              {currentUser.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
        >
          Logout
        </button>

        <Link href="/quotations/new" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
          + New Quote
        </Link>
      </div>
    </header>
  );
}
