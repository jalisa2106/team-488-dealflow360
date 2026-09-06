'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function OnboardPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customerInfo, setCustomerInfo] = useState<{ email: string; companyName: string; contactName: string | null } | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/onboard/${token}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setCustomerInfo(data.data);
          if (data.data.contactName) {
            setName(data.data.contactName);
          }
        } else {
          setError(data.error || 'Invalid invite link');
        }
      } catch {
        setError('Error connecting to the server.');
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) { 
      setError('Password must be at least 6 characters.'); 
      return; 
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboard/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Auto-login succeeds, redirect straight to portal
        router.push('/portal/quotation');
        router.refresh();
      } else {
        setError(data.error?.message || data.error || 'Onboarding failed.');
      }
    } catch {
      setError('An error occurred while connecting to the server.');
    } finally {
      setSubmitting(false);
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
            Customer Portal
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '480px' }}>

          <div className="card card-shadow-lg" style={{ width: '100%' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-muted)' }}>Loading invite...</div>
            ) : error && !customerInfo ? (
              <div style={{ textAlign: 'center' }}>
                <h1 className="page-title" style={{ fontSize: '24px', marginBottom: 12, color: 'var(--danger-fg)' }}>
                  Invite Unavailable
                </h1>
                <p style={{ color: 'var(--fg-muted)', marginBottom: 24 }}>{error}</p>
              </div>
            ) : (
              <>
                <h1 className="page-title" style={{ fontSize: '24px', marginBottom: 4 }}>
                  Welcome to DealFlow360
                </h1>
                <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
                  Complete your registration to access the customer portal for <strong>{customerInfo?.companyName}</strong>.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="field-group">
                    <label className="field-label">Email Address</label>
                    <input className="input" type="email" value={customerInfo?.email || ''} disabled style={{ background: 'var(--bg)', cursor: 'not-allowed' }} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Full Name</label>
                    <input className="input" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Set Password</label>
                    <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>

                  {error && (
                    <div style={{ padding: '10px 12px', background: 'var(--danger-bg)', border: '1.5px solid var(--danger-border)', borderRadius: 4, color: 'var(--danger-fg)', fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1, padding: '11px' }}>
                      {submitting ? 'Completing...' : 'Complete Registration'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
