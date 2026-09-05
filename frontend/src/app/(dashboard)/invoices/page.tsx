'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  const paidCount = invoices.filter(i => i.status === 'PAID').length;

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
            ) : invoices.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No invoices found.</td></tr>
            ) : (
              invoices.map(row => (
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
