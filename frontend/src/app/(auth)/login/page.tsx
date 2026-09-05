'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, DEMO_USERS } from '@/lib/types';

const ROLES_LIST: { role: UserRole; title: string; desc: string; badgeColor: string; destination: string }[] = [
  {
    role: 'ADMIN',
    title: 'Admin',
    desc: 'System admin with full access to discount rules, users, & governance',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-400',
    destination: '/dashboard',
  },
  {
    role: 'SALES_REP',
    title: 'Sales Rep',
    desc: 'Creates quotes, manages customer negotiations & upsell rules',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-400',
    destination: '/dashboard',
  },
  {
    role: 'SALES_MANAGER',
    title: 'Sales Manager',
    desc: 'Approves discounts, reviews team quotes & pipeline health',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-400',
    destination: '/approvals',
  },
  {
    role: 'FINANCE',
    title: 'Finance',
    desc: 'Manages hybrid billing, payment schedules, & margin approvals',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    destination: '/invoices',
  },
  {
    role: 'OPERATIONS',
    title: 'Operations',
    desc: 'Handles fulfillment, inventory allocation, & warehouse splits',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-400',
    destination: '/fulfillment',
  },
  {
    role: 'CUSTOMER',
    title: 'Customer',
    desc: 'Customer portal view to review quotes, negotiate, & sign deals',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-400',
    destination: '/portal/quotation',
  },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDemoBypass = async (role: UserRole) => {
    setError('');
    setLoadingRole(role);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.data.redirectUrl);
        router.refresh();
      } else {
        setError(data.error?.message || 'Failed to authenticate');
      }
    } catch {
      setError('Error communicating with authentication server.');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoadingForm(true);

    // Default email matching or default to SALES_REP
    let role: UserRole = 'SALES_REP';
    if (email.startsWith('admin')) role = 'ADMIN';
    else if (email.startsWith('manager') || email.startsWith('salesmgr')) role = 'SALES_MANAGER';
    else if (email.startsWith('finance')) role = 'FINANCE';
    else if (email.startsWith('ops') || email.startsWith('operations')) role = 'OPERATIONS';
    else if (email.startsWith('customer')) role = 'CUSTOMER';

    await handleDemoBypass(role);
    setLoadingForm(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--fg)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em' }}>
            DealFlow360
          </span>
          <span style={{
            background: 'var(--accent)',
            color: 'var(--fg)',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            Dev Mode
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '960px' }}>

          {/* Quick Demo Role Bypass Panel */}
          <div className="card card-shadow-lg" style={{ background: '#FFFFFF', borderColor: 'var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="card-label" style={{ color: 'var(--primary)', fontSize: '11px' }}>Development Authentication Bypass</span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>Instant Role Simulator</h2>
              </div>
              <span className="badge badge-info" style={{ fontSize: '11px' }}>⚡ 1-Click Login</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '16px' }}>
              Click any canonical role below to bypass Supabase Auth credentials and instantly simulate authorized access across authorized domains & route controllers.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px'
            }}>
              {ROLES_LIST.map((r) => {
                const user = DEMO_USERS[r.role];
                const isLoading = loadingRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleDemoBypass(r.role)}
                    disabled={!!loadingRole || loadingForm}
                    style={{
                      textAlign: 'left',
                      padding: '14px',
                      borderRadius: '6px',
                      border: '2px solid var(--border)',
                      background: 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      position: 'relative'
                    }}
                    className="role-bypass-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--fg)' }}>{r.title}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                        {r.role}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--fg-muted)', lineHeight: '1.4' }}>{r.desc}</p>
                    <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{user.email}</span>
                      <span>{isLoading ? 'Authenticating…' : `Go to ${r.destination} →`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Login Form */}
          <div className="card card-shadow" style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
            <h2 className="page-title" style={{ fontSize: '20px', marginBottom: 4 }}>Standard Login / Signup</h2>
            <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 20 }}>
              Authenticate using email and password credentials
            </p>

            <div className="toggle-group" style={{ marginBottom: 20, width: '100%', display: 'flex', gap: '4px' }}>
              <button
                className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setMode('login')}
                type="button"
              >Log In</button>
              <button
                className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setMode('signup')}
                type="button"
              >Sign Up</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <div className="field-group">
                  <label className="field-label">Full Name</label>
                  <input className="input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div className="field-group">
                <label className="field-label">Email</label>
                <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="field-label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              {error && (
                <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1.5px solid var(--danger-border)', borderRadius: 4, color: 'var(--danger-fg)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={loadingForm || !!loadingRole} style={{ flex: 1, padding: '11px' }}>
                  {loadingForm ? 'Authenticating…' : mode === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
