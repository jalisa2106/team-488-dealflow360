'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface InviteInfo {
  companyName: string;
  contactName: string | null;
  invitedByName: string;
  expiresAt: string;
}

type InviteState =
  | { status: 'loading' }
  | { status: 'valid'; info: InviteInfo }
  | { status: 'error'; code: string; message: string }
  | { status: 'success' };

export default function OnboardPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [inviteState, setInviteState] = useState<InviteState>({ status: 'loading' });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!params?.token) return;
    fetch(`/api/onboard/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setInviteState({ status: 'valid', info: data.data });
        } else {
          setInviteState({
            status: 'error',
            code: data.error?.code || 'UNKNOWN',
            message: data.error?.message || 'This invite link is not valid.',
          });
        }
      })
      .catch(() =>
        setInviteState({
          status: 'error',
          code: 'NETWORK_ERROR',
          message: 'Could not reach the server. Please check your connection.',
        })
      );
  }, [params?.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (name.trim().length < 1) { setFormError('Please enter your full name.'); return; }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboard/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setInviteState({ status: 'success' });
        setTimeout(() => router.push('/login?onboarded=1'), 2500);
      } else {
        setFormError(data.error?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setFormError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const errorIcon = (code: string) => {
    if (code === 'EXPIRED') return '⏰';
    if (code === 'ALREADY_USED') return '✅';
    if (code === 'REVOKED') return '🚫';
    return '❌';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Header — same visual language as login/page.tsx */}
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
            textTransform: 'uppercase',
          }}>
            Customer Portal
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '480px' }}>

          {/* Loading */}
          {inviteState.status === 'loading' && (
            <div className="card card-shadow-lg" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
              <p className="support-text" style={{ color: 'var(--fg-muted)' }}>Validating your invite link…</p>
            </div>
          )}

          {/* Error states — expired, revoked, used, etc. */}
          {inviteState.status === 'error' && (
            <div className="card card-shadow-lg" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{errorIcon(inviteState.code)}</div>
              <h1 className="page-title" style={{ fontSize: '22px', marginBottom: 8 }}>
                {inviteState.code === 'EXPIRED' && 'Invite Link Expired'}
                {inviteState.code === 'ALREADY_USED' && 'Already Activated'}
                {inviteState.code === 'REVOKED' && 'Invite Revoked'}
                {!['EXPIRED', 'ALREADY_USED', 'REVOKED'].includes(inviteState.code) && 'Invalid Link'}
              </h1>
              <p className="support-text" style={{ color: 'var(--fg-muted)', marginBottom: 24 }}>
                {inviteState.message}
              </p>
              {inviteState.code === 'ALREADY_USED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => router.push('/login')}
                  style={{ width: '100%' }}
                >
                  Go to Login
                </button>
              )}
            </div>
          )}

          {/* Success */}
          {inviteState.status === 'success' && (
            <div className="card card-shadow-lg" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h1 className="page-title" style={{ fontSize: '22px', marginBottom: 8 }}>
                Account Created!
              </h1>
              <p className="support-text" style={{ color: 'var(--fg-muted)' }}>
                Your portal account is ready. Redirecting you to login…
              </p>
            </div>
          )}

          {/* Onboarding form */}
          {inviteState.status === 'valid' && (
            <div className="card card-shadow-lg" style={{ width: '100%' }}>
              {/* Invite context */}
              <div style={{
                background: 'var(--primary-subtle, rgba(99,102,241,0.08))',
                border: '1.5px solid var(--primary-border, rgba(99,102,241,0.2))',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 24,
              }}>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                  You&apos;ve been invited by{' '}
                  <strong style={{ color: 'var(--fg)' }}>{inviteState.info.invitedByName}</strong>
                  {' '}to access the{' '}
                  <strong style={{ color: 'var(--fg)' }}>{inviteState.info.companyName}</strong>
                  {' '}customer portal.
                </p>
              </div>

              <h1 className="page-title" style={{ fontSize: '24px', marginBottom: 4 }}>
                Set Up Your Account
              </h1>
              <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
                Choose a password to activate your portal access.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Full Name</label>
                  <input
                    id="onboard-name"
                    className="input"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="onboard-password"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--fg-muted)', fontSize: 14,
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Confirm Password</label>
                  <input
                    id="onboard-confirm-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {formError && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'var(--danger-bg)',
                    border: '1.5px solid var(--danger-border)',
                    borderRadius: 4,
                    color: 'var(--danger-fg)',
                    fontSize: 13,
                  }}>
                    {formError}
                  </div>
                )}

                <button
                  id="onboard-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ padding: '11px', marginTop: 8 }}
                >
                  {submitting ? 'Creating account…' : 'Activate Portal Access'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
