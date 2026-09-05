'use client';

import { useState, useEffect, useCallback } from 'react';

interface Customer {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  portalUserId: string | null;
  active: boolean;
  tier: { name: string } | null;
}

interface InviteModal {
  customerId: string;
  customerName: string;
  inviteUrl: string;
  expiresAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [inviteModal, setInviteModal] = useState<InviteModal | null>(null);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null); // customerId
  const [inviteError, setInviteError] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(data.data);
      } else {
        setError(data.error?.message || 'Failed to load customers.');
      }
    } catch {
      setError('Network error while loading customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const sendInvite = async (customer: Customer) => {
    setInviteLoading(customer.id);
    setInviteError((prev) => ({ ...prev, [customer.id]: '' }));
    try {
      const res = await fetch(`/api/customers/${customer.id}/invite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setInviteModal({
          customerId: customer.id,
          customerName: customer.companyName,
          inviteUrl: data.data.inviteUrl,
          expiresAt: new Date(data.data.expiresAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          }),
        });
      } else {
        setInviteError((prev) => ({
          ...prev,
          [customer.id]: data.error?.message || 'Failed to generate invite.',
        }));
      }
    } catch {
      setInviteError((prev) => ({ ...prev, [customer.id]: 'Network error.' }));
    } finally {
      setInviteLoading(null);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteModal) return;
    try {
      await navigator.clipboard.writeText(inviteModal.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (c.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const tierColors: Record<string, string> = {
    GOLD: 'var(--warning-fg, #b45309)',
    SILVER: 'var(--fg-muted)',
    BRONZE: '#92400e',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Customers</h1>
          <p className="support-text" style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
            Manage customer accounts and send portal onboarding invites.
          </p>
        </div>
        <button
          id="customers-refresh"
          className="btn btn-secondary"
          onClick={fetchCustomers}
          disabled={loading}
          style={{ fontSize: 13 }}
        >
          {loading ? 'Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          id="customers-search"
          className="input"
          type="text"
          placeholder="Search by company, contact, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          border: '1.5px solid var(--danger-border)',
          borderRadius: 6,
          color: 'var(--danger-fg)',
          marginBottom: 20,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card card-shadow-lg" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>
            Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>
            {search ? 'No customers match your search.' : 'No customers found.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Company', 'Contact', 'Email', 'Tier', 'Portal Status', 'Action'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 12,
                    fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                    {c.companyName}
                    {!c.active && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--danger-fg)', fontWeight: 400 }}>
                        (inactive)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--fg-muted)' }}>
                    {c.contactName || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--fg-muted)' }}>
                    {c.email || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.tier ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: tierColors[c.tier.name] || 'var(--fg-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {c.tier.name}
                      </span>
                    ) : <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.portalUserId ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--success-bg, rgba(16,185,129,0.1))',
                        color: 'var(--success-fg, #065f46)',
                        border: '1px solid var(--success-border, rgba(16,185,129,0.2))',
                        borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                      }}>
                        ✓ Linked
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--warning-bg, rgba(251,191,36,0.1))',
                        color: 'var(--warning-fg, #92400e)',
                        border: '1px solid var(--warning-border, rgba(251,191,36,0.2))',
                        borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                      }}>
                        Not invited
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.portalUserId ? (
                      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>—</span>
                    ) : (
                      <div>
                        <button
                          id={`invite-btn-${c.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          disabled={inviteLoading === c.id}
                          onClick={() => sendInvite(c)}
                        >
                          {inviteLoading === c.id ? 'Generating…' : '📨 Send Onboarding Link'}
                        </button>
                        {inviteError[c.id] && (
                          <p style={{ fontSize: 11, color: 'var(--danger-fg)', marginTop: 4 }}>
                            {inviteError[c.id]}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite link modal */}
      {inviteModal && (
        <div
          id="invite-modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setInviteModal(null); }}
        >
          <div
            id="invite-modal"
            className="card card-shadow-lg"
            style={{ width: '100%', maxWidth: 520 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 id="modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Invite Link Generated
              </h2>
              <button
                id="close-invite-modal"
                onClick={() => setInviteModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--fg-muted)', lineHeight: 1 }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
              Share this link with{' '}
              <strong style={{ color: 'var(--fg)' }}>{inviteModal.customerName}</strong>
              {'. '}It expires on <strong style={{ color: 'var(--fg)' }}>{inviteModal.expiresAt}</strong>.
            </p>

            <div style={{
              background: 'var(--bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 6,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: 12,
              wordBreak: 'break-all',
              color: 'var(--fg)',
              marginBottom: 16,
              userSelect: 'all',
            }}>
              {inviteModal.inviteUrl}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                id="copy-invite-link"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={copyToClipboard}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button
                id="close-invite-modal-btn"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setInviteModal(null)}
              >
                Done
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 14, textAlign: 'center' }}>
              Paste this link into your email, WhatsApp, or Slack message.
              Generating a new invite will revoke this one.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
