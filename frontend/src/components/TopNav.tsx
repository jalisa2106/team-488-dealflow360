'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole, User } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const NAV_ENTRIES: NavEntry[] = [
  { href: '/dashboard', label: 'Dashboard' },
  {
    label: 'Sales',
    items: [
      { href: '/quotations', label: 'Quotations' },
      { href: '/subscriptions', label: 'Subscriptions', roles: ['ADMIN', 'FINANCE', 'SALES_REP', 'SALES_MANAGER'] },
      { href: '/deal-health', label: 'Deal Health', roles: ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'] },
    ]
  },
  {
    label: 'Operations',
    items: [
      { href: '/approvals', label: 'Approvals', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
      { href: '/fulfillment', label: 'Fulfillment', roles: ['ADMIN', 'OPERATIONS', 'SALES_MANAGER'] },
      { href: '/invoices', label: 'Invoices', roles: ['ADMIN', 'FINANCE', 'SALES_MANAGER'] },
    ]
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Products' },
      { href: '/customers', label: 'Customers' },
    ]
  },
  { href: '/reports', label: 'Reports' },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
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
    router.push('/login');
  };

  const handleReload = () => {
    router.refresh();
  };

  const handleCloseWorkspace = () => {
    router.push('/dashboard');
  };

  const currentRole = currentUser?.role || 'SALES_REP';

  const isItemVisible = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  };

  const visibleNavEntries = NAV_ENTRIES.map(entry => {
    if ('items' in entry) {
      const visibleItems = entry.items.filter(isItemVisible);
      return visibleItems.length > 0 ? { ...entry, items: visibleItems } : null;
    }
    return isItemVisible(entry) ? entry : null;
  }).filter(Boolean) as NavEntry[];

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

      <nav className="topbar-tabs">
        {visibleNavEntries.map((entry, idx) => {
          if ('items' in entry) {
            // It's a group
            const isActiveGroup = entry.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
            return (
              <div key={idx} className="topbar-dropdown">
                <div className={`topbar-tab${isActiveGroup ? ' active' : ''}`} style={{ cursor: 'pointer' }}>
                  {entry.label} ▾
                </div>
                <div className="topbar-dropdown-content">
                  {entry.items.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`topbar-dropdown-item${isActive ? ' active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          } else {
            // It's a single item
            const isActive = pathname === entry.href || pathname.startsWith(entry.href + '/');
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`topbar-tab${isActive ? ' active' : ''}`}
              >
                {entry.label}
              </Link>
            );
          }
        })}
      </nav>

      {/* User Session Info & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '12px' }}>
            <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
            <span className="badge badge-info" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              {currentUser.role}
            </span>
          </div>
        )}

        <button onClick={handleReload} className="btn btn-secondary" title="Reload Data" style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}>
          ↺ Reload
        </button>

        {currentUser?.role === 'ADMIN' && (
          <Link href="/admin" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }} title="Go to Admin Back-end">
            ⚙ Admin
          </Link>
        )}

        <button onClick={handleCloseWorkspace} className="btn btn-secondary" title="Close current workspace and return to Dashboard" style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}>
          ✕ Close
        </button>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}>
          Logout
        </button>

        <Link href="/quotations/new" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
          + New Quote
        </Link>
      </div>
    </header>
  );
}
