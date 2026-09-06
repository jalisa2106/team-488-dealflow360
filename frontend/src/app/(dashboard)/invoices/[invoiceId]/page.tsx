'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setInvoice(data.data);
        } else if (data.data) {
          setInvoice(data.data);
        }
      } catch (err) {
        console.error('Failed to load invoice', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [invoiceId]);

  const handleRecordPayment = async () => {
    if (!invoice) return;
    const ok = await toast.confirm(`Record full payment of $${Number(invoice.amount || 0).toLocaleString()} for ${invoice.invoiceNumber || invoice.id}?`);
    if (!ok) return;

    setRecording(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_PAID', method: 'BANK_TRANSFER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      toast.success('Payment recorded successfully!');
      setInvoice((prev: any) => ({
        ...prev,
        status: 'PAID',
        payments: [
          {
            id: 'new-pay',
            amount: prev.amount,
            method: 'BANK_TRANSFER',
            recordedAt: new Date().toISOString(),
          },
          ...(prev.payments || []),
        ],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(msg);
    } finally {
      setRecording(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!invoice) return;

    const custName = invoice.order?.quote?.customer?.companyName || 'Valued Customer';
    const invNum = invoice.invoiceNumber || invoice.id;
    const dateStr = new Date(invoice.createdAt).toLocaleDateString();
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt';
    const amountStr = Number(invoice.amount || 0).toLocaleString();

    const summaryContent = `=====================================================
                 DEALFLOW360 INVOICE SUMMARY
=====================================================

Invoice Number:   ${invNum}
Invoice Status:   ${invoice.status}
Billing Type:     ${invoice.type}
Issue Date:       ${dateStr}
Due Date:         ${dueDateStr}

-----------------------------------------------------
CUSTOMER DETAILS
-----------------------------------------------------
Company:          ${custName}
Order Reference:  ${invoice.order?.orderNumber || 'Standard Order'}
Quotation Ref:    ${invoice.order?.quote?.quoteNumber || 'N/A'}
Sales Rep:        ${invoice.order?.quote?.salesRep?.name || 'Account Executive'}

-----------------------------------------------------
FINANCIAL BREAKDOWN
-----------------------------------------------------
Total Invoice Amount:     $${amountStr}
Amount Paid:              ${invoice.status === 'PAID' ? `$${amountStr}` : '$0.00'}
Balance Due:              ${invoice.status === 'PAID' ? '$0.00' : `$${amountStr}`}

-----------------------------------------------------
PAYMENT HISTORY
-----------------------------------------------------
${
  invoice.payments && invoice.payments.length > 0
    ? invoice.payments
        .map(
          (p: any) =>
            `- Paid $${Number(p.amount).toLocaleString()} via ${p.method} on ${new Date(p.recordedAt).toLocaleString()}`
        )
        .join('\n')
    : 'No payments recorded yet.'
}

=====================================================
      Thank you for your business with DealFlow360!
=====================================================
`;

    const blob = new Blob([summaryContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Invoice_Summary_${invNum}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Invoice summary downloaded for ${invNum}`);
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--fg-muted)' }}>Loading invoice details…</div>;
  }

  if (!invoice) {
    return (
      <div style={{ padding: 40 }}>
        <Link href="/invoices" className="back-link">← Back to Invoices</Link>
        <p style={{ color: 'var(--danger-fg)', fontWeight: 700, marginTop: 14 }}>Invoice not found.</p>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const trackerSteps = [
    { label: 'Order Confirmed', state: 'done' },
    { label: 'Shipped / Fulfilled', state: 'done' },
    { label: 'Invoiced', state: isPaid ? 'done' : 'current' },
    { label: 'Paid & Settled', state: isPaid ? 'done' : 'pending' },
  ];

  return (
    <div>
      <Link href="/invoices" className="back-link">← Back to Invoices</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Invoice Detail: {invoice.invoiceNumber || invoice.id}</h1>
          <p className="support-text">
            Customer: <strong style={{ color: 'var(--primary)' }}>{invoice.order?.quote?.customer?.companyName || 'Direct Account'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className={`badge ${isPaid ? 'badge-success' : invoice.status === 'ISSUED' ? 'badge-warning' : 'badge-danger'}`}>
            {invoice.status}
          </span>
          <span className="badge badge-info">{invoice.type}</span>
        </div>
      </div>

      {/* Lifecycle Tracker */}
      <div className="card section">
        <h2 className="section-title">Billing Lifecycle Tracker</h2>
        <div className="tracker">
          {trackerSteps.map((step, i) => (
            <div
              key={step.label}
              className={`tracker-step ${
                step.state === 'done' ? 'done' : step.state === 'current' ? 'current' : ''
              }`}
            >
              <div className="tracker-dot">{i + 1}</div>
              <div className="tracker-label">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Overview Card */}
      <div className="card section">
        <div className="form-row form-row-3">
          <div className="field-group">
            <label className="field-label">Customer Name</label>
            <input className="input" value={invoice.order?.quote?.customer?.companyName || '—'} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Linked Order #</label>
            <input className="input" value={invoice.order?.orderNumber || '—'} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Total Amount</label>
            <input
              className="input"
              value={`$${Number(invoice.amount || 0).toLocaleString()}`}
              style={{ fontWeight: 700, color: 'var(--primary)' }}
              disabled
            />
          </div>
        </div>
        <div className="form-row form-row-3" style={{ marginTop: 12 }}>
          <div className="field-group">
            <label className="field-label">Issue Date</label>
            <input className="input" value={new Date(invoice.createdAt).toLocaleDateString()} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Due Date</label>
            <input
              className="input"
              value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}
              disabled
            />
          </div>
          <div className="field-group">
            <label className="field-label">Sales Rep</label>
            <input className="input" value={invoice.order?.quote?.salesRep?.name || '—'} disabled />
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="card section">
        <h2 className="section-title">Payment &amp; Reconciliation History</h2>
        {invoice.payments && invoice.payments.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th className="text-right">Amount</th>
                  <th>Method</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.id.slice(0, 12)}…</td>
                    <td className="text-right" style={{ fontWeight: 700, color: 'var(--success-fg)' }}>
                      +${Number(p.amount).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-success">{p.method}</span>
                    </td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                      {new Date(p.recordedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '8px 0' }}>
            No payments recorded yet. Status is currently <strong>{invoice.status}</strong>.
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="notice" style={{ marginBottom: 20 }}>
        💡 Reconciled automatically with delivery milestones — billing reflects shipped goods.
      </div>

      {/* Action Row */}
      <div className="action-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!isPaid && (
          <button className="btn btn-success" onClick={handleRecordPayment} disabled={recording}>
            {recording ? 'Recording…' : '💳 Record Payment'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleDownloadSummary}>
          📥 Download Summary
        </button>
        <Link href="/invoices" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to List
        </Link>
      </div>
    </div>
  );
}
