'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoadingForm(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && (data.user || data.message)) {
        const userRole = data.user?.role;
        const target = userRole === 'CUSTOMER' ? '/portal/quotation' : '/dashboard';
        router.push(target);
        router.refresh();
      } else {
        setError(data.error?.message || data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setError('An error occurred while connecting to the authentication server.');
    } finally {
      setLoadingForm(false);
    }
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
            background: 'var(--primary)',
            color: '#fff',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            Secure Auth
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '480px' }}>

          <div className="card card-shadow-lg" style={{ width: '100%' }}>
            <h1 className="page-title" style={{ fontSize: '24px', marginBottom: 4 }}>
              {mode === 'login' ? 'Sign In to DealFlow360' : 'Create an Account'}
            </h1>
            <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
              Enter your credentials to access authorized features and workspaces
            </p>

            <div className="toggle-group" style={{ marginBottom: 24, width: '100%', display: 'flex', gap: '4px' }}>
              <button
                className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('login'); setError(''); }}
                type="button"
              >Log In</button>
              <button
                className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('signup'); setError(''); }}
                type="button"
              >Sign Up</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'signup' && (
                <div className="field-group">
                  <label className="field-label">Full Name</label>
                  <input className="input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div className="field-group">
                <label className="field-label">Email Address</label>
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

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={loadingForm} style={{ flex: 1, padding: '11px' }}>
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
