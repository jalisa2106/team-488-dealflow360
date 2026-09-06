'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { useToast } from '@/components/Toast';

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success && data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (customerId: string) => {
    setSubmitting(true);
    setInviteLink(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInviteLink(data.inviteUrl);
      } else {
        toast.error(data.error || 'Failed to generate invite');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied to clipboard!');
      setInviteLink(null); // Close modal
    }
  };

  const renderTable = () => {
    return (
      <div className="table-wrap bg-[var(--surface)] border-[var(--border)]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact Name</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Portal Access</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && customers.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: 20}}>No customers found.</td></tr>
            ) : (
              customers.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700 }}>{row.companyName}</td>
                  <td style={{ color: 'var(--fg-muted)' }}>{row.contactName || '-'}</td>
                  <td>
                    <span className="badge badge-neutral">{row.tier?.name || 'Standard'}</span>
                  </td>
                  <td>
                    <span className={`badge ${row.active ? 'badge-success' : 'badge-neutral'}`}>
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {row.portalUserId ? (
                      <span className="badge badge-success">Linked</span>
                    ) : (
                      <span className="badge badge-warning">Not Linked</span>
                    )}
                  </td>
                  <td className="text-right">
                    {!row.portalUserId && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: 12 }} 
                        onClick={() => handleSendInvite(row.id)}
                        disabled={submitting || !row.email}
                      >
                        {row.email ? 'Send Invite' : 'No Email'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="support-text">Manage customer accounts and portal access.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {renderTable()}
      </div>

      {inviteLink && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card card-shadow-lg" style={{ width: 400, maxWidth: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Invite Generated</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 20 }}>
              Share this link with the customer to allow them to set up their portal account. The link expires in 7 days.
            </p>
            <input 
              className="input" 
              type="text" 
              value={inviteLink} 
              readOnly 
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setInviteLink(null)}>Close</button>
              <button className="btn btn-primary" onClick={copyToClipboard}>Copy Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
