'use client';
import { useState } from 'react';
import Link from 'next/link';

const KANBAN_COLS = [
  { id: 'draft', title: 'Draft', cards: [
    { id: 'Q-1045', name: 'Acme Corp', amount: '$12,400' },
    { id: 'Q-1046', name: 'Delta LLC', amount: '$3,200' },
  ]},
  { id: 'pending', title: 'Pending Approval', cards: [
    { id: 'Q-1042', name: 'Beta Industries', amount: '$28,900' },
  ]},
  { id: 'approved', title: 'Approved', cards: [
    { id: 'Q-1030', name: 'Nova Retail', amount: '$9,750' },
  ]},
  { id: 'negotiation', title: 'Negotiation', cards: [
    { id: 'Q-1025', name: 'Zenith Co', amount: '$15,300' },
  ]},
  { id: 'confirmed', title: 'Confirmed', cards: [
    { id: 'Q-1010', name: 'Orion Ltd', amount: '$41,000' },
  ]},
];

const TABLE_ROWS = [
  { id: 'Q-1042', customer: 'Beta Industries', amount: '$28,900', status: 'Pending Approval', created: 'Aug 28', updated: '2h ago', owner: 'J. Rao' },
  { id: 'Q-1045', customer: 'Acme Corp', amount: '$12,400', status: 'Draft', created: 'Sep 1', updated: '1d ago', owner: 'M. Shah' },
  { id: 'Q-1046', customer: 'Delta LLC', amount: '$3,200', status: 'Draft', created: 'Sep 2', updated: '3d ago', owner: 'R. Iyer' },
  { id: 'Q-1030', customer: 'Nova Retail', amount: '$9,750', status: 'Approved', created: 'Aug 20', updated: '5d ago', owner: 'J. Rao' },
  { id: 'Q-1025', customer: 'Zenith Co', amount: '$15,300', status: 'Negotiation', created: 'Aug 15', updated: '1w ago', owner: 'M. Shah' },
  { id: 'Q-1010', customer: 'Orion Ltd', amount: '$41,000', status: 'Confirmed', created: 'Aug 10', updated: '2w ago', owner: 'R. Iyer' },
];

const STATUS_BADGE: Record<string, string> = {
  'Draft': 'badge-neutral',
  'Pending Approval': 'badge-warning',
  'Approved': 'badge-success',
  'Negotiation': 'badge-info',
  'Confirmed': 'badge-success',
};

export default function QuotationsPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

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
          {KANBAN_COLS.map(col => (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                {col.title}
                <span style={{ marginLeft: 8, background: 'var(--border-subtle)', borderRadius: 9999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                  {col.cards.length}
                </span>
              </div>
              <div className="kanban-col-body">
                {col.cards.map(card => (
                  <Link key={card.id} href={`/quotations/${card.id}`} className="kanban-card">
                    <div className="kc-id">{card.id}</div>
                    <div className="kc-name">{card.name}</div>
                    <div className="kc-amount">{card.amount}</div>
                  </Link>
                ))}
                {col.cards.length === 0 && (
                  <div style={{ color: 'var(--fg-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    No quotations
                  </div>
                )}
              </div>
            </div>
          ))}
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
              {TABLE_ROWS.map(row => (
                <tr key={row.id} className="clickable" onClick={() => window.location.href = `/quotations/${row.id}`}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                  <td>{row.customer}</td>
                  <td className="text-right" style={{ fontWeight: 600 }}>{row.amount}</td>
                  <td><span className={`badge ${STATUS_BADGE[row.status] || 'badge-neutral'}`}>{row.status}</span></td>
                  <td style={{ color: 'var(--fg-muted)' }}>{row.created}</td>
                  <td style={{ color: 'var(--fg-muted)' }}>{row.updated}</td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
