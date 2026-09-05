'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const FILTER_OPTS = ['All', 'Unpaid', 'Paid', 'Overdue'];
const GROUP_OPTS  = ['None', 'Customer', 'Status', 'Due Date'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');
  const [groupBy, setGroupBy] = useState('None');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/invoices');
        const data = await res.json();
        if (data.success && data.data) {
          setInvoices(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch invoices', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const unpaidCount = invoices.filter(i => i.status === 'UNPAID').length;
  const paidCount   = invoices.filter(i => i.status === 'PAID').length;

  const visible = invoices.filter(i => {
    const matchFilter =
      filter === 'All' || i.status?.toLowerCase() === filter.toLowerCase();
    const matchSearch =
      !search ||
      i.id?.toLowerCase().includes(search.toLowerCase()) ||
      i.order?.quote?.customer?.companyName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices (List)</h1>
        <p className="support-text">Every invoice generated from one-time and recurring orders</p>
      </div>

      <div className="chip-row">
        <span className="chip chip-danger">{unpaidCount} Unpaid</span>
        <span className="chip chip-success">{paidCount} Paid</span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 14, padding: '10px 14px',
        background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8,
      }}>
        <input className="input" placeholder="🔍  Search invoices…" value={search}
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
          style={{ fontSize: 12, padding: '5px 8px', minWidth: 120 }}>
          {GROUP_OPTS.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
          {visible.length} of {invoices.length} invoices
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No invoices found.</td></tr>
            ) : (
              visible.map(row => (
                <tr key={row.id} className="clickable" onClick={() => window.location.href = `/invoices/${row.id}`}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                  <td>{row.order?.quote?.customer?.companyName || 'Unknown'}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>${Number(row.total || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${row.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ color: row.status === 'UNPAID' ? 'var(--danger-fg)' : 'var(--fg-muted)', fontWeight: row.status === 'UNPAID' ? 700 : 400 }}>
                    {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '–'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click an invoice row to open its full payment and delivery reconciliation detail.
      </div>
    </div>
  );
}
