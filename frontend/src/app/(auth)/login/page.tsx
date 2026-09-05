'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // Demo: route by email domain — customer@... goes to portal, else dashboard
    if (email.startsWith('customer')) {
      router.push('/portal/quotation');
    } else {
      router.push('/dashboard');
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
        justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em' }}>
          DealFlow360
        </span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div className="card card-shadow-lg" style={{ width: '100%', maxWidth: '480px' }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Login / Signup</h1>
          <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
            Entry point for internal users and customers
          </p>

          {/* Toggle */}
          <div className="toggle-group" style={{ marginBottom: 24, width: '100%' }}>
            <button
              className={`toggle-btn${mode === 'login' ? ' active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setMode('login')}
              type="button"
            >Log In</button>
            <button
              className={`toggle-btn${mode === 'signup' ? ' active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setMode('signup')}
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
            <div className="form-row form-row-2">
              <div className="field-group">
                <label className="field-label">Email</label>
                <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="field-label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1.5px solid var(--danger-border)', borderRadius: 4, color: 'var(--danger-fg)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, padding: '11px' }}>
                {loading ? 'Authenticating…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>Forgot Password?</button>
            </div>
          </form>

          <div className="notice" style={{ marginTop: 20 }}>
            After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.
          </div>

          <ul style={{ marginTop: 14, paddingLeft: 18, color: 'var(--fg-muted)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Company / team selector shown for multi-team setups</li>
            <li>Basic validation on email and password fields</li>
            <li>Sign Up link creates a new internal or customer account</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
