'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'badge-danger', HIGH: 'badge-danger', MEDIUM: 'badge-warning', LOW: 'badge-success',
};

export default function ApprovalDetailPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const { quotationId } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/approvals/${quotationId}`);
        if (res.ok) {
          const data = await res.json();
          setApproval(data);
          // Fetch audit logs for the quote
          const quoteId = data.quoteId;
          const auditRes = await fetch(`/api/quotes/${quoteId}/audit`);
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            setAuditLogs(auditData.logs || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [quotationId]);

  const doAction = async (action: string, reason?: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/approvals/${quotationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      const actionLabel = action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 'returned';
      setActionDone(actionLabel);

      if (action === 'APPROVE') {
        setTimeout(() => router.push('/fulfillment'), 1400);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setActing(false);
      setShowReturnModal(false);
      setShowRejectModal(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading approval...</div>;
  if (!approval) return <div style={{ padding: 40, color: 'var(--danger-fg)' }}>Approval not found.</div>;

  const quote = approval.quote;
  const lines = quote?.quoteLines || [];
  const allApprovals = quote?.approvalRequests || [];

  // Compute discount line violations
  const lineViolations = lines.map((l: any) => ({
    name: l.product?.name || 'Unknown',
    discount: Number(l.discountPercent),
    limit: 30, // static display limit
    over: Math.max(0, Number(l.discountPercent) - 30),
  }));

  // Build approval chain steps
  const steps = [
    { label: 'Submitted', state: 'done' },
    ...allApprovals.map((a: any) => ({
      label: a.role === 'SALES_MANAGER' ? 'Sales Manager' : 'Finance',
      state: a.status === 'APPROVED' ? 'done' : a.status === 'PENDING' ? 'current' : 'pending',
    })),
    { label: 'Confirmed', state: allApprovals.every((a: any) => a.status === 'APPROVED') ? 'current' : 'pending' },
  ];

  return (
    <div>
      <Link href="/approvals" className="back-link">← Back to Approvals</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Approval Detail: {quote?.quoteNumber || quotationId}</h1>
          <p className="support-text">Review risk breakdown, audit trail, and take action</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className={`badge ${RISK_BADGE[quote?.riskLevel] || 'badge-neutral'}`}>
            Risk: {quote?.riskLevel || 'UNKNOWN'}
          </span>
          <span className="badge badge-info">
            Tier: {quote?.customer?.tier?.name || 'Standard'}
          </span>
        </div>
      </div>

      {/* Quote summary */}
      <div className="card section">
        <div className="form-row form-row-3">
          <div className="field-group">
            <label className="field-label">Customer</label>
            <input className="input" value={quote?.customer?.companyName || 'Unknown'} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Sales Rep</label>
            <input className="input" value={quote?.salesRep?.name || 'Unknown'} disabled />
          </div>
          <div className="field-group">
            <label className="field-label">Quote Total</label>
            <input className="input" value={`$${Number(quote?.total || 0).toLocaleString()}`} disabled />
          </div>
        </div>
      </div>

      {/* Why Flagged */}
      <div className="card section">
        <h2 className="section-title">Why This Quote Was Flagged</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line Item</th>
                <th className="text-right">Discount Given</th>
                <th className="text-right">Hard Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lineViolations.map((l: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td className="text-right">{l.discount}%</td>
                  <td className="text-right">{l.limit}%</td>
                  <td>
                    {l.over > 0
                      ? <span className="badge badge-danger">{l.over}pt OVER</span>
                      : <span className="badge badge-success">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Chain Tracker */}
      <div className="card section">
        <h2 className="section-title">Approval Chain</h2>
        <div className="tracker">
          {steps.map((step, i) => (
            <div key={i} className={`tracker-step ${step.state === 'done' ? 'done' : step.state === 'current' ? 'current' : ''}`}>
              <div className="tracker-dot">{i + 1}</div>
              <div className="tracker-label">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="card section">
        <h2 className="section-title">Audit Trail</h2>
        {auditLogs.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Actor</th><th>Action</th><th>Date</th><th>Details</th></tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{log.actor?.name || log.actorId?.slice(0, 8) + '…'}</td>
                    <td>
                      <span className={`badge ${log.action?.includes('APPROV') ? 'badge-success' : log.action?.includes('REJECT') ? 'badge-danger' : log.action?.includes('CREAT') ? 'badge-neutral' : 'badge-warning'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{log.details || log.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No audit events recorded yet.</p>
        )}
      </div>

      {/* Actions */}
      {actionDone ? (
        <div style={{
          padding: '14px 16px',
          background: actionDone === 'approved' ? 'var(--success-bg)' : actionDone === 'rejected' ? '#fff5f5' : 'var(--info-bg)',
          border: `2px solid ${actionDone === 'approved' ? 'var(--success-border)' : actionDone === 'rejected' ? 'var(--danger-border)' : 'var(--info-border)'}`,
          borderRadius: 6, fontWeight: 700,
          color: actionDone === 'approved' ? 'var(--success-fg)' : actionDone === 'rejected' ? 'var(--danger-fg)' : 'var(--info-fg)'
        }}>
          {actionDone === 'approved' && '✓ Approved — routing to Fulfillment…'}
          {actionDone === 'returned' && '↩ Returned for revision — Sales Rep has been notified.'}
          {actionDone === 'rejected' && '✗ Quotation rejected.'}
        </div>
      ) : approval.status !== 'PENDING' ? (
        <div className="notice">This approval request has already been acted upon: <strong>{approval.status}</strong></div>
      ) : (
        <div className="action-row">
          <button className="btn btn-success" onClick={() => doAction('APPROVE')} disabled={acting}>Approve</button>
          <button className="btn btn-warning" onClick={() => setShowReturnModal(true)} disabled={acting}>Return for Revision</button>
          <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={acting}>Reject</button>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card card-shadow-lg" style={{ width: 420, padding: 28 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Return for Revision</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>Provide a reason for returning this quotation.</p>
            <textarea className="input" rows={3} placeholder="Explain what needs to change…" value={returnReason} onChange={e => setReturnReason(e.target.value)} style={{ resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-warning" onClick={() => doAction('REQUEST_REVISION', returnReason)} disabled={!returnReason.trim() || acting}>Confirm Return</button>
              <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card card-shadow-lg" style={{ width: 420, padding: 28 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Reject Quotation</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>This will permanently reject this quotation. Provide a reason.</p>
            <textarea className="input" rows={3} placeholder="Rejection reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" onClick={() => doAction('REJECT', rejectReason)} disabled={!rejectReason.trim() || acting}>Confirm Reject</button>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
