'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const FILTER_OPTS = ['All', 'DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];
const GROUP_OPTS = ['None', 'Customer', 'Status', 'Due Date'];

interface InvoiceItem {
  id: string;
  invoiceNumber?: string;
  type: string;
  amount: number;
  total?: number;
  status: string;
  dueDate?: string | null;
  createdAt: string;
  order?: {
    orderNumber?: string;
    quote?: {
      quoteNumber?: string;
      customer?: {
        id: string;
        companyName: string;
      };
    };
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
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

  const draftCount = invoices.filter(i => i.status === 'DRAFT').length;
  const issuedCount = invoices.filter(i => i.status === 'ISSUED').length;
  const paidCount = invoices.filter(i => i.status === 'PAID').length;

  const visible = useMemo(() => {
    return invoices.filter(i => {
      const matchFilter =
        filter === 'All' || i.status?.toLowerCase() === filter.toLowerCase();
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        i.id?.toLowerCase().includes(term) ||
        (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(term)) ||
        (i.order?.quote?.customer?.companyName && i.order.quote.customer.companyName.toLowerCase().includes(term));
      return matchFilter && matchSearch;
    });
  }, [invoices, filter, search]);

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
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'MARK_PAID' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success(data.message || 'Invoices marked as paid');

      setInvoices(prev =>
        prev.map(inv => (selectedIds.has(inv.id) ? { ...inv, status: 'PAID' } : inv))
      );
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      toast.error(msg);
    } finally {
      setBulkUpdating(false);
    }
  };

  const downloadCSV = (items: InvoiceItem[], filename: string) => {
    if (items.length === 0) {
      toast.error('No invoices to export.');
      return;
    }

    const headers = ['Invoice ID', 'Invoice Number', 'Customer', 'Amount', 'Status', 'Due Date', 'Created Date'];
    const rows = items.map(inv => [
      inv.id,
      inv.invoiceNumber || inv.id,
      `"${(inv.order?.quote?.customer?.companyName || 'Unknown').replace(/"/g, '""')}"`,
      inv.total || inv.amount || 0,
      inv.status,
      inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : 'N/A',
      new Date(inv.createdAt).toISOString().split('T')[0],
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${items.length} invoices to ${filename}`);
  };

  const handleExportSelected = () => {
    const selectedInvoices = invoices.filter(i => selectedIds.has(i.id));
    if (selectedInvoices.length === 0) return;
    downloadCSV(selectedInvoices, `invoices_selected_${selectedInvoices.length}.csv`);
    setSelectedIds(new Set());
  };

  const handleExportAll = () => {
    downloadCSV(visible, `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Grouping logic
  const groupedData = useMemo(() => {
    if (groupBy === 'None') {
      return { 'All Invoices': visible };
    }

    const groups: Record<string, InvoiceItem[]> = {};

    visible.forEach(inv => {
      let key = 'Other';
      if (groupBy === 'Customer') {
        key = inv.order?.quote?.customer?.companyName || 'Unknown Customer';
      } else if (groupBy === 'Status') {
        key = inv.status || 'UNKNOWN';
      } else if (groupBy === 'Due Date') {
        if (!inv.dueDate) key = 'No Due Date';
        else {
          const d = new Date(inv.dueDate);
          key = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
        }
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });

    return groups;
  }, [visible, groupBy]);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Invoices (List)</h1>
          <p className="support-text">Every invoice generated from one-time and recurring orders with reconciliation</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleExportAll}>
            📥 Export All CSV
          </button>
        </div>
      </div>

      <div className="chip-row">
        <span className="chip chip-neutral">{draftCount} Draft</span>
        <span className="chip chip-warning">{issuedCount} Issued</span>
        <span className="chip chip-success">{paidCount} Paid</span>
      </div>

      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 8,
        }}
      >
        <input
          className="input"
          placeholder="🔍  Search invoices…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180, flex: 1, maxWidth: 260, fontSize: 13, padding: '6px 10px' }}
        />

        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
          Filter:
        </label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_OPTS.map(opt => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 99,
                cursor: 'pointer',
                border: '1.5px solid',
                transition: 'all 0.1s',
                borderColor: filter === opt ? 'var(--primary)' : 'var(--border)',
                background: filter === opt ? 'var(--primary)' : 'transparent',
                color: filter === opt ? '#fff' : 'var(--fg-muted)',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        {/* Inline Group by dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'auto' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            Group by:
          </label>
          <select
            className="select select-inline"
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', width: 'auto', minWidth: 120, maxWidth: 180 }}
          >
            {GROUP_OPTS.map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
          {visible.length} of {invoices.length} invoices
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: '10px 14px',
            marginBottom: 14,
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 8,
            animation: 'fadein 0.2s ease-out',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedIds.size} selected</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                padding: '4px 12px',
                fontSize: 12,
              }}
              onClick={handleBulkMarkPaid}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Processing...' : 'Mark as Paid'}
            </button>
            <button
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                padding: '4px 12px',
                fontSize: 12,
              }}
              onClick={handleExportSelected}
            >
              📥 Export Selected CSV
            </button>
            <button
              className="btn"
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '4px 12px',
                fontSize: 12,
              }}
              onClick={() => setSelectedIds(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Render Tables */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--fg-muted)' }}>
          Loading invoices…
        </div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--fg-muted)' }}>
          No invoices found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(groupedData).map(([groupTitle, groupRows]) => (
            <div key={groupTitle} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {groupBy !== 'None' && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{groupTitle}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                      {groupRows.length} invoices
                    </span>
                  </div>
                </div>
              )}

              <div className="table-wrap" style={{ margin: 0, border: 'none' }}>
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
                    {groupRows.map(row => (
                      <tr
                        key={row.id}
                        className="clickable"
                        onClick={() => router.push(`/invoices/${row.id}`)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {row.invoiceNumber || row.id}
                        </td>
                        <td>{row.order?.quote?.customer?.companyName || 'Unknown Customer'}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          ${Number(row.total || row.amount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              row.status === 'PAID'
                                ? 'badge-success'
                                : row.status === 'ISSUED'
                                ? 'badge-warning'
                                : row.status === 'CANCELLED'
                                ? 'badge-danger'
                                : 'badge-neutral'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td
                          style={{
                            color:
                              row.status === 'ISSUED' || row.status === 'DRAFT'
                                ? 'var(--danger-fg)'
                                : 'var(--fg-muted)',
                            fontWeight: row.status === 'ISSUED' || row.status === 'DRAFT' ? 700 : 400,
                          }}
                        >
                          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="notice" style={{ marginTop: 14 }}>
        💡 Click an invoice row to open its full payment reconciliation, audit history, and credit note issuance.
      </div>
    </div>
  );
}
