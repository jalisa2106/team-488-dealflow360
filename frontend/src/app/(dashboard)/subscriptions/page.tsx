'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toolbar } from '@/components/Toolbar';

// ── Toolbar ────────────────────────────────────────────────────────────
const FILTER_OPTS = ['All', 'Active', 'Paused', 'Cancelled'];
const GROUP_OPTS  = ['None', 'Plan', 'Customer', 'Billing Cycle'];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-success', PAUSED: 'badge-warning', CANCELLED: 'badge-danger', INACTIVE: 'badge-neutral',
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
          const now = new Date();
          const mapped = data.data.map((s: any) => {
            const isPastEnd = s.endDate && new Date(s.endDate) < now;
            return {
              ...s,
              displayStatus: isPastEnd && s.status === 'ACTIVE' ? 'INACTIVE' : s.status,
            };
          });
          setSubscriptions(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeCount    = subscriptions.filter(s => s.displayStatus === 'ACTIVE').length;
  const pausedCount    = subscriptions.filter(s => s.displayStatus === 'PAUSED').length;
  const cancelledCount = subscriptions.filter(s => s.displayStatus === 'CANCELLED').length;

  const visible = subscriptions.filter(s => {
    const matchFilter =
      filter === 'All' || s.displayStatus?.toLowerCase() === filter.toLowerCase();
    const matchSearch =
      !search ||
      s.order?.quote?.customer?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan?.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

    const grouped: Record<string, any[]> = {};
    if (groupBy === 'None') {
      grouped['All'] = visible;
    } else {
      visible.forEach(s => {
        let key = 'Other';
        if (groupBy === 'Plan') key = s.plan?.name || 'Unknown Plan';
        if (groupBy === 'Customer') key = s.order?.quote?.customer?.companyName || 'Unknown Customer';
        if (groupBy === 'Billing Cycle') key = s.plan?.frequency || 'Monthly';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
    }

    const renderRows = (items: any[]) => items.map(row => (
      <tr key={row.id} className="clickable" onClick={() => window.location.href = `/subscriptions/${row.id}`}>
        <td style={{ fontWeight: 600 }}>{row.order?.quote?.customer?.companyName || 'Unknown'}</td>
        <td>{row.plan?.name || 'Unknown'}</td>
        <td>{row.plan?.frequency || 'Monthly'}</td>
        <td style={{ color: row.endDate ? 'inherit' : 'var(--fg-muted)' }}>
          {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'Auto-renew'}
        </td>
        <td><span className={`badge ${STATUS_BADGE[row.displayStatus] || 'badge-neutral'}`}>{row.displayStatus}</span></td>
      </tr>
    ));

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

      <Toolbar
        searchValue={search} onSearch={setSearch} searchPlaceholder="Search subscriptions…"
        filterOptions={FILTER_OPTS} filterValue={filter} onFilter={setFilter}
        groupOptions={GROUP_OPTS} groupValue={groupBy} onGroup={setGroupBy}
        totalShown={visible.length} totalAll={subscriptions.length}
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>End Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No subscriptions found.</td></tr>
            ) : (
              groupBy === 'None' ? (
                renderRows(visible)
              ) : (
                Object.entries(grouped).map(([groupKey, items]) => (
                  <React.Fragment key={groupKey}>
                    <tr className="group-header" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                      <td colSpan={5} style={{ fontWeight: 700, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        {groupKey} <span style={{ color: 'var(--fg-muted)', fontSize: 12, fontWeight: 500, marginLeft: 8 }}>({items.length})</span>
                      </td>
                    </tr>
                    {renderRows(items)}
                  </React.Fragment>
                ))
              )
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
