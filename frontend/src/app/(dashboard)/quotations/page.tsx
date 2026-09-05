'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_BADGE: Record<string, string> = {
  'DRAFT': 'badge-neutral',
  'PENDING_APPROVAL': 'badge-warning',
  'APPROVED': 'badge-success',
  'UNDER_NEGOTIATION': 'badge-info',
  'CONFIRMED': 'badge-success',
};

export default function QuotationsPage() {
  const router = useRouter();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        // Assuming API returns an array or an object with array
        setQuotes(Array.isArray(data) ? data : data.data || data.quotes || []);
      } catch (err) {
        console.error('Failed to fetch quotes', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const kanbanCols = [
    { id: 'DRAFT', title: 'Draft' },
    { id: 'PENDING_APPROVAL', title: 'Pending Approval' },
    { id: 'APPROVED', title: 'Approved' },
    { id: 'UNDER_NEGOTIATION', title: 'Negotiation' },
    { id: 'CONFIRMED', title: 'Confirmed' },
  ];

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Quotations (List)</h1>
          <p className="support-text">Every quotation in the system, one row per quotation, click a row to open it</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/quotations/new" className="btn btn-primary">+ New Quotation</Link>
          <div className="toggle-group">
            <button className={`toggle-btn${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
            <button className={`toggle-btn${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>Table View</button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="kanban-board">
          {kanbanCols.map(col => {
            const colQuotes = quotes.filter(q => q.status === col.id);
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  {col.title}
                  <span style={{ marginLeft: 8, background: 'var(--border-subtle)', borderRadius: 9999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                    {colQuotes.length}
                  </span>
                </div>
                <div className="kanban-col-body">
                  {colQuotes.map(card => (
                    <Link key={card.id} href={`/quotations/${card.id}`} className="kanban-card">
                      <div className="kc-id">{card.quoteNumber}</div>
                      <div className="kc-name">{card.customer?.companyName || 'Unknown'}</div>
                      <div className="kc-amount">${Number(card.total || 0).toLocaleString()}</div>
                    </Link>
                  ))}
                  {colQuotes.length === 0 && (
                    <div style={{ color: 'var(--fg-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      No quotations
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
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
                <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
              ) : quotes.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign: 'center', padding: 20}}>No quotations found.</td></tr>
              ) : (
                quotes.map(row => (
                  <tr key={row.id} className="clickable" onClick={() => router.push(`/quotations/${row.id}`)}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.quoteNumber}</td>
                    <td>{row.customer?.companyName || 'Unknown'}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>${Number(row.total || 0).toLocaleString()}</td>
                    <td><span className={`badge ${STATUS_BADGE[row.status] || 'badge-neutral'}`}>{row.status}</span></td>
                    <td style={{ color: 'var(--fg-muted)' }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--fg-muted)' }}>{new Date(row.updatedAt).toLocaleDateString()}</td>
                    <td>{row.salesRep?.name || 'Unknown'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
