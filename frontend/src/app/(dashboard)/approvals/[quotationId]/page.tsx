'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const INITIAL_AUDIT = [
  { user: 'J. Rao', action: 'Submitted', date: 'Aug 20', note: 'Initial 12% discount' },
  { user: 'M. Shah', action: 'Returned', date: 'Aug 21', note: 'Requested justification' },
  { user: 'J. Rao', action: 'Resubmitted', date: 'Aug 22', note: 'Added margin note' },
];

type AuditRow = { user: string; action: string; date: string; note: string };

export default function ApprovalDetailPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const [audit, setAudit] = useState<AuditRow[]>(INITIAL_AUDIT);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const router = useRouter();

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const doApprove = () => {
    setAudit(prev => [...prev, { user: 'M. Shah', action: 'Approved', date: today, note: 'Approved at Sales Manager stage' }]);
    setActionDone('approved');
    setTimeout(() => router.push('/fulfillment'), 1200);
  };

  const doReturn = () => {
    if (!returnReason.trim()) return;
    setAudit(prev => [...prev, { user: 'M. Shah', action: 'Returned for Revision', date: today, note: returnReason }]);
    setShowReturnModal(false);
    setActionDone('returned');
  };

  const doReject = () => {
    if (!rejectReason.trim()) return;
    setAudit(prev => [...prev, { user: 'M. Shah', action: 'Rejected', date: today, note: rejectReason }]);
    setShowRejectModal(false);
    setActionDone('rejected');
  };

  const trackerSteps = [
    { label: 'Submitted', state: 'done' },
    { label: 'Sales Manager', state: actionDone === 'approved' ? 'done' : 'current' },
    { label: 'Finance', state: actionDone === 'approved' ? 'current' : 'pending' },
    { label: 'Confirmed', state: 'pending' },
  ];

  return (
    <div>
      <Link href="/approvals" className="back-link">← Back to Approvals</Link>

      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Approval Detail: Q-1042</h1>
          <p className="support-text">Opened by clicking a row on the Approvals list</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-danger">Blended Risk: HIGH</span>
          <span className="badge badge-info">Customer Tier: Gold</span>
        </div>
      </div>

      {/* Why Flagged */}
      <div className="card section">
        <h2 className="section-title">Why This Quote Was Flagged</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line</th>
                <th className="text-right">Discount Given</th>
                <th className="text-right">Limit Allowed</th>
                <th>Over By</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Laptop (Hardware)</td>
                <td className="text-right">12%</td>
                <td className="text-right">15%</td>
                <td><span className="badge badge-success">0 pt — OK</span></td>
              </tr>
              <tr>
                <td>Setup Service (Services)</td>
                <td className="text-right">18%</td>
                <td className="text-right">10%</td>
                <td><span className="badge badge-danger">8 pt OVER</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="notice" style={{ marginTop: 12 }}>
          Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
        </div>
      </div>

      {/* Approval Chain Tracker */}
      <div className="card section">
        <h2 className="section-title">Approval Chain Tracker</h2>
        <div className="tracker">
          {trackerSteps.map((step, i) => (
            <div key={step.label} className={`tracker-step ${step.state === 'done' ? 'done' : step.state === 'current' ? 'current' : ''}`}>
              <div className="tracker-dot">{i + 1}</div>
              <div className="tracker-label">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="card section">
        <h2 className="section-title">Audit Trail</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Action</th><th>Date</th><th>Note</th></tr>
            </thead>
            <tbody>
              {audit.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.user}</td>
                  <td>
                    <span className={`badge ${row.action === 'Approved' ? 'badge-success' : row.action.includes('Return') ? 'badge-warning' : row.action === 'Rejected' ? 'badge-danger' : 'badge-neutral'}`}>
                      {row.action}
                    </span>
                  </td>
                  <td style={{ color: 'var(--fg-muted)' }}>{row.date}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {actionDone ? (
        <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 6, fontWeight: 700, color: 'var(--success-fg)' }}>
          {actionDone === 'approved' && '✓ Approved — routing to Fulfillment…'}
          {actionDone === 'returned' && '↩ Returned for revision — quote sent back to Sales Rep.'}
          {actionDone === 'rejected' && '✗ Quotation rejected.'}
        </div>
      ) : (
        <div className="action-row">
          <button className="btn btn-success" onClick={doApprove}>Approve</button>
          <button className="btn btn-warning" onClick={() => setShowReturnModal(true)}>Return for Revision</button>
          <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>Reject</button>
        </div>
      )}

      {/* Return modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card card-shadow-lg" style={{ width: 420, padding: 28 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Return for Revision</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>Provide a reason for returning this quotation.</p>
            <textarea className="input" rows={3} placeholder="Explain what needs to change…" value={returnReason} onChange={e => setReturnReason(e.target.value)} style={{ resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-warning" onClick={doReturn} disabled={!returnReason.trim()}>Confirm Return</button>
              <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card card-shadow-lg" style={{ width: 420, padding: 28 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Reject Quotation</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>This will permanently reject this quotation. Provide a reason.</p>
            <textarea className="input" rows={3} placeholder="Rejection reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" onClick={doReject} disabled={!rejectReason.trim()}>Confirm Reject</button>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
