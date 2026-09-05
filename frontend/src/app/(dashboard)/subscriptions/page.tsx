'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Toolbar ────────────────────────────────────────────────────────────
const FILTER_OPTS = ['All', 'Active', 'Paused', 'Cancelled'];
const GROUP_OPTS  = ['None', 'Plan', 'Customer', 'Billing Cycle'];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-success', PAUSED: 'badge-warning', CANCELLED: 'badge-danger',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All');
  const [groupBy, setGroupBy] = useState('None');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/subscriptions');
        const data = await res.json();
        if (data.success && data.data) {
          setSubscriptions(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeCount    = subscriptions.filter(s => s.status === 'ACTIVE').length;
  const pausedCount    = subscriptions.filter(s => s.status === 'PAUSED').length;
  const cancelledCount = subscriptions.filter(s => s.status === 'CANCELLED').length;

  const visible = subscriptions.filter(s => {
    const matchFilter =
      filter === 'All' || s.status?.toLowerCase() === filter.toLowerCase();
    const matchSearch =
      !search ||
      s.order?.quote?.customer?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan?.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Subscriptions (List)</h1>
          <p className="support-text">Every recurring plan across every customer, regardless of which order it came from</p>
        </div>
        <Link href="/subscriptions/plans/new" className="btn btn-secondary">+ New Plan (Admin)</Link>
      </div>

      <div className="chip-row">
        <span className="chip chip-success">{activeCount} Active</span>
        <span className="chip chip-warning">{pausedCount} Paused</span>
        <span className="chip chip-danger">{cancelledCount} Cancelled</span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 14, padding: '10px 14px',
        background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8,
      }}>
        <input className="input" placeholder="🔍  Search subscriptions…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 180, flex: 1, maxWidth: 260, fontSize: 13, padding: '6px 10px' }}
        />
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Filter:</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_OPTS.map(opt => (
            <button key={opt} onClick={() => setFilter(opt)} style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 99,
              cursor: 'pointer', border: '1.5px solid', transition: 'all 0.1s',
              borderColor: filter === opt ? 'var(--primary)' : 'var(--border)',
              background: filter === opt ? 'var(--primary)' : 'transparent',
              color: filter === opt ? '#fff' : 'var(--fg-muted)',
            }}>{opt}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Group by:</label>
        <select className="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
          style={{ fontSize: 12, padding: '5px 8px', minWidth: 130 }}>
          {GROUP_OPTS.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
          {visible.length} of {subscriptions.length} subscriptions
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Next Bill</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No subscriptions found.</td></tr>
            ) : (
              visible.map(row => (
                <tr key={row.id} className="clickable" onClick={() => window.location.href = `/subscriptions/${row.id}`}>
                  <td style={{ fontWeight: 600 }}>{row.order?.quote?.customer?.companyName || 'Unknown'}</td>
                  <td>{row.plan?.name || 'Unknown'}</td>
                  <td>{row.plan?.frequency || 'Monthly'}</td>
                  <td style={{ color: row.currentPeriodEnd ? 'inherit' : 'var(--fg-muted)' }}>
                    {row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : '–'}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[row.status] || 'badge-neutral'}`}>{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click a subscription row to open its billing detail and proration history.
      </div>
    </div>
  );
}
