'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/Toast';

const FILTER_OPTS = ['All', 'DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];
const GROUP_OPTS  = ['None', 'Customer', 'Status', 'Due Date'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');
  const [groupBy, setGroupBy] = useState('None');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const toast = useToast();
  const router = useRouter();

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

  const draftCount    = invoices.filter(i => i.status === 'DRAFT').length;
  const issuedCount   = invoices.filter(i => i.status === 'ISSUED').length;
  const paidCount     = invoices.filter(i => i.status === 'PAID').length;

  const visible = invoices.filter(i => {
    const matchFilter =
      filter === 'All' || i.status?.toLowerCase() === filter.toLowerCase();
    const matchSearch =
      !search ||
      i.id?.toLowerCase().includes(search.toLowerCase()) ||
      i.order?.quote?.customer?.companyName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const allVisibleSelected = visible.length > 0 && visible.every(row => selectedIds.has(row.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      visible.forEach(r => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      visible.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch('/api/invoices/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'MARK_PAID' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success(data.message || 'Invoices marked as paid');
      
      // Update local state
      setInvoices(prev => prev.map(inv => selectedIds.has(inv.id) ? { ...inv, status: 'PAID' } : inv));
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.size === 0) return;
    toast.success(`Exporting ${selectedIds.size} invoices as CSV...`);
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices (List)</h1>
        <p className="support-text">Every invoice generated from one-time and recurring orders</p>
      </div>

      <div className="chip-row">
        <span className="chip chip-neutral">{draftCount} Draft</span>
        <span className="chip chip-warning">{issuedCount} Issued</span>
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

      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '10px 14px', marginBottom: 14,
          background: 'var(--primary)', color: '#fff', borderRadius: 8,
          animation: 'fadein 0.2s ease-out'
        }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedIds.size} selected</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button 
              className="btn" 
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '4px 12px', fontSize: 12 }}
              onClick={handleBulkMarkPaid}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Processing...' : 'Mark as Paid'}
            </button>
            <button 
              className="btn" 
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '4px 12px', fontSize: 12 }}
              onClick={handleExportSelected}
            >
              Export Selected
            </button>
            <button 
              className="btn" 
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '4px 12px', fontSize: 12 }}
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              </th>
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
                <tr key={row.id} className="clickable" onClick={() => router.push(`/invoices/${row.id}`)}>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                  <td>{row.order?.quote?.customer?.companyName || 'Unknown'}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>${Number(row.total || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${row.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ color: row.status === 'ISSUED' || row.status === 'DRAFT' ? 'var(--danger-fg)' : 'var(--fg-muted)', fontWeight: row.status === 'ISSUED' || row.status === 'DRAFT' ? 700 : 400 }}>
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
