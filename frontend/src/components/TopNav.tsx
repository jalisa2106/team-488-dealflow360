'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole, User, DEMO_USERS } from '@/lib/types';

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
  { href: '/admin/discount-config', label: 'Admin Rules', roles: ['ADMIN'] },
];

export default function TopNav() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.user) {
          setCurrentUser(data.data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleRoleSwitch = async (role: UserRole) => {
    setIsSwitching(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.data.redirectUrl;
      }
    } catch {
      setIsSwitching(false);
    }
  };

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

      {/* Role Indicator & Bypass Quick Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Role:</span>
          <select
            value={currentRole}
            onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
            disabled={isSwitching}
            style={{
              background: 'var(--fg)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {Object.keys(DEMO_USERS).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

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
