'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

// ── Column theme ──────────────────────────────────────────────────────────────
const COL_THEME: Record<string, { colBg: string; pillBg: string; pillText: string }> = {
  DRAFT:             { colBg: '#f8fafc', pillBg: '#cbd5e1', pillText: '#1e293b' },
  PENDING_APPROVAL:  { colBg: '#fffbeb', pillBg: '#fcd34d', pillText: '#78350f' },
  APPROVED:          { colBg: '#f0fdf4', pillBg: '#6ee7b7', pillText: '#065f46' },
  UNDER_NEGOTIATION: { colBg: '#faf5ff', pillBg: '#c4b5fd', pillText: '#4c1d95' },
  CONFIRMED:         { colBg: '#eff6ff', pillBg: '#93c5fd', pillText: '#1e3a5f' },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-neutral',
  PENDING_APPROVAL: 'badge-warning',
  APPROVED: 'badge-success',
  UNDER_NEGOTIATION: 'badge-info',
  CONFIRMED: 'badge-success',
};

const KANBAN_COLS = [
  { id: 'DRAFT',             title: 'Draft' },
  { id: 'PENDING_APPROVAL',  title: 'Pending Approval' },
  { id: 'APPROVED',          title: 'Approved' },
  { id: 'UNDER_NEGOTIATION', title: 'Negotiation' },
  { id: 'CONFIRMED',         title: 'Confirmed' },
];

// Status options for the multi-select filter (table view)
// key = API value, label = display label
const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: 'DRAFT',             label: 'Draft' },
  { key: 'PENDING_APPROVAL',  label: 'Pending Approval' },
  { key: 'APPROVED',          label: 'Approved' },
  { key: 'UNDER_NEGOTIATION', label: 'Negotiation' },
  { key: 'CONFIRMED',         label: 'Confirmed' },
];

const GROUP_OPTIONS = ['None', 'Status', 'Sales Rep', 'Customer'];

// ── Toolbar divider ───────────────────────────────────────────────────────────
function ToolbarDivider() {
  return <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />;
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
  const router = useRouter();

  // View toggle
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  // Data
  const [quotes,      setQuotes]      = useState<any[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const toast = useToast();

  // Search (shared between views, debounced for API calls in table view)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Table-only: multi-select status filter
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  // Table-only: group by
  const [groupBy, setGroupBy] = useState('None');

  // Table row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchQuotes = useCallback(async (opts: {
    search?: string;
    statuses?: string[];
  } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts.search)            params.set('search', opts.search);
      if (opts.statuses?.length)  params.set('status', opts.statuses.join(','));
      params.set('limit', '100'); // fetch enough for both views

      const res  = await fetch(`/api/quotes?${params.toString()}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.quotes || data.data || [];
      setQuotes(rows);
      setTotalCount(data.total ?? rows.length);
    } catch (err) {
      console.error('Failed to fetch quotes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + refetch when server-side filters change (table view)
  useEffect(() => {
    if (view === 'table') {
      fetchQuotes({
        search: debouncedSearch,
        statuses: activeStatuses.size > 0 ? [...activeStatuses] : undefined,
      });
    } else {
      // Kanban: fetch all, filter client-side by search
      fetchQuotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, debouncedSearch, activeStatuses]);

  // Reset selection when view/data changes
  useEffect(() => { setSelectedIds(new Set()); }, [view, quotes]);

  // ── Derived: filtered rows ────────────────────────────────────────────────
  // In table view, filtering is server-side; in kanban, search is client-side only.
  const visibleQuotes = view === 'kanban'
    ? quotes.filter((q) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          q.quoteNumber?.toLowerCase().includes(s) ||
          q.customer?.companyName?.toLowerCase().includes(s) ||
          q.salesRep?.name?.toLowerCase().includes(s)
        );
      })
    : quotes; // already server-filtered

  // ── Status multi-select toggle ────────────────────────────────────────────
  const toggleStatus = useCallback((key: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setSearch('');
    setActiveStatuses(new Set());
  };

  const hasActiveFilters = search.trim() !== '' || activeStatuses.size > 0;

  // ── Row selection helpers ─────────────────────────────────────────────────
  const isAllSelected   = visibleQuotes.length > 0 && visibleQuotes.every((q) => selectedIds.has(q.id));
  const isIndeterminate = !isAllSelected && visibleQuotes.some((q) => selectedIds.has(q.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      isAllSelected ? new Set() : new Set(visibleQuotes.map((q) => q.id))
    );
  }, [isAllSelected, visibleQuotes]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleGenerateInvoice = async () => {
    if (selectedIds.size === 0) return;
    const ok = await toast.confirm(`Generate invoices for ${selectedIds.size} selected quotations?`);
    if (!ok) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds: Array.from(selectedIds) })
      });
      if (res.ok) {
        toast.success('Invoices generated successfully.');
        setSelectedIds(new Set());
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to generate invoices.');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="support-text">
            Every quotation in the system — click a card or row to open it
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Bulk-action bar — visible when rows are selected in table view */}
          {selectedIds.size > 0 && view === 'table' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 600, color: 'var(--primary)',
              padding: '5px 12px', border: '1.5px solid var(--primary)',
              borderRadius: 6, background: 'var(--surface)',
            }}>
              <span>{selectedIds.size} selected</span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setSelectedIds(new Set())}
              >Clear</button>
              <button
                className="btn btn-primary"
                style={{ marginLeft: 8, fontSize: 12, padding: '4px 10px' }}
                onClick={handleGenerateInvoice}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          )}
          <Link href="/quotations/new" className="btn btn-primary">+ New Quotation</Link>
          <div className="toggle-group">
            <button
              className={`toggle-btn${view === 'kanban' ? ' active' : ''}`}
              onClick={() => setView('kanban')}
            >Kanban</button>
            <button
              className={`toggle-btn${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
            >Table View</button>
          </div>
        </div>
      </div>

      {/* ── KANBAN toolbar: search bar only ──────────────────────────────────── */}
      {view === 'kanban' && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          marginBottom: 18, padding: '10px 14px',
          background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8,
        }}>
          <input
            className="input"
            placeholder="🔍  Search quotations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 200, flex: 1, maxWidth: 320, fontSize: 13, padding: '6px 10px' }}
          />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {visibleQuotes.length} of {quotes.length} quotations
          </span>
        </div>
      )}

      {/* ── TABLE toolbar: Search + multi-select status chips + Group by ─────── */}
      {view === 'table' && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          marginBottom: 18, padding: '10px 14px',
          background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8,
        }}>
          {/* Search */}
          <input
            className="input"
            placeholder="🔍  Search by Quote ID or Customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220, flex: 1, maxWidth: 320, fontSize: 13, padding: '6px 10px' }}
          />

          <ToolbarDivider />

          {/* Multi-select status chips */}
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            Status:
          </label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(({ key, label }) => {
              const active = activeStatuses.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  title={active ? `Remove ${label} filter` : `Filter by ${label}`}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 99,
                    cursor: 'pointer', transition: 'all 0.12s', border: '1.5px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    background:  active ? 'var(--primary)' : 'transparent',
                    color:       active ? '#fff'           : 'var(--fg-muted)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Clear filters — only shown when something is active */}
          {hasActiveFilters && (
            <>
              <ToolbarDivider />
              <button
                onClick={clearFilters}
                style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                  whiteSpace: 'nowrap', textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            </>
          )}

          <ToolbarDivider />

          {/* Group by */}
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            Group by:
          </label>
          <select
            className="select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', minWidth: 130 }}
          >
            {GROUP_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {visibleQuotes.length}{totalCount > visibleQuotes.length ? ` of ${totalCount}` : ''} quotations
          </span>
        </div>
      )}

      {/* ══════════════════ KANBAN VIEW ══════════════════ */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {KANBAN_COLS.map((col) => {
            const colQuotes = visibleQuotes.filter((q) => q.status === col.id);
            const theme     = COL_THEME[col.id];
            return (
              <div
                key={col.id}
                className="kanban-col"
                style={{ background: theme.colBg, borderColor: 'var(--border)' }}
              >
                {/* Coloured header pill */}
                <div className="kanban-col-header" style={{ borderBottomColor: 'var(--border)' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: theme.pillBg, color: theme.pillText,
                    borderRadius: 9999, padding: '3px 10px 3px 8px',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {col.title}
                    <span style={{
                      background: 'rgba(0,0,0,0.12)', color: theme.pillText,
                      borderRadius: 9999, padding: '0 6px', fontSize: 11, fontWeight: 800,
                    }}>
                      {colQuotes.length}
                    </span>
                  </span>
                </div>

                {/* Cards — always white */}
                <div className="kanban-col-body">
                  {colQuotes.map((card) => (
                    <Link
                      key={card.id}
                      href={`/quotations/${card.id}`}
                      className="kanban-card"
                      style={{ background: '#ffffff' }}
                    >
                      <div className="kc-id">{card.quoteNumber}</div>
                      <div className="kc-name">{card.customer?.companyName || 'Unknown'}</div>
                      <div className="kc-amount">${Number(card.total || 0).toLocaleString()}</div>
                    </Link>
                  ))}
                  {colQuotes.length === 0 && (
                    <div style={{
                      color: 'var(--fg-muted)', fontSize: 12,
                      textAlign: 'center', padding: '20px 0',
                    }}>
                      {search ? 'No matches' : 'No quotations'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ TABLE VIEW ══════════════════ */}
      {view === 'table' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {/* Select-all checkbox */}
                <th style={{ width: 36, textAlign: 'center', padding: '10px 8px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={toggleAll}
                    title={isAllSelected ? 'Deselect all' : 'Select all'}
                    style={{ cursor: 'pointer', width: 15, height: 15 }}
                  />
                </th>
                <th>Quote ID</th>
                <th>Customer</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 20 }}>Loading…</td>
                </tr>
              ) : visibleQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--fg-muted)' }}>
                    {hasActiveFilters
                      ? '🔍 No quotations match your search or filter — try adjusting or clearing the filters.'
                      : 'No quotations found. Create your first one!'}
                  </td>
                </tr>
              ) : (
                visibleQuotes.map((row) => {
                  const isSelected = selectedIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className="clickable"
                      style={isSelected ? { background: 'color-mix(in srgb, var(--primary) 8%, transparent)' } : {}}
                    >
                      {/* Row checkbox cell */}
                      <td
                        style={{ width: 36, textAlign: 'center', padding: '8px' }}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).tagName !== 'INPUT') {
                            e.stopPropagation();
                            toggleRow(row.id);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                      </td>
                      <td
                        style={{ fontWeight: 700, color: 'var(--primary)' }}
                        onClick={() => router.push(`/quotations/${row.id}`)}
                      >
                        {row.quoteNumber}
                      </td>
                      <td onClick={() => router.push(`/quotations/${row.id}`)}>
                        {row.customer?.companyName || 'Unknown'}
                      </td>
                      <td
                        className="text-right"
                        style={{ fontWeight: 600 }}
                        onClick={() => router.push(`/quotations/${row.id}`)}
                      >
                        ${Number(row.total || 0).toLocaleString()}
                      </td>
                      <td onClick={() => router.push(`/quotations/${row.id}`)}>
                        <span className={`badge ${STATUS_BADGE[row.status] || 'badge-neutral'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td
                        style={{ color: 'var(--fg-muted)' }}
                        onClick={() => router.push(`/quotations/${row.id}`)}
                      >
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td
                        style={{ color: 'var(--fg-muted)' }}
                        onClick={() => router.push(`/quotations/${row.id}`)}
                      >
                        {new Date(row.updatedAt).toLocaleDateString()}
                      </td>
                      <td onClick={() => router.push(`/quotations/${row.id}`)}>
                        {row.salesRep?.name || 'Unknown'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
