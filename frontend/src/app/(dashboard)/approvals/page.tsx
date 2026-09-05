'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'badge-danger', HIGH: 'badge-danger', MEDIUM: 'badge-warning', LOW: 'badge-success',
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [filterPending, setFilterPending] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/approvals');
        const data = await res.json();
        if (data.success && data.data) {
          setApprovals(data.data.approvals || []);
        } else if (data.approvals) {
          setApprovals(data.approvals);
        }
      } catch (err) {
        console.error('Failed to fetch approvals', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const rows = filterPending ? approvals.filter(r => r.status === 'PENDING') : approvals;
  
  const pendingCount = approvals.filter(r => r.status === 'PENDING').length;
  const returnedCount = approvals.filter(r => r.status === 'REVISION_REQUESTED' || r.status === 'REJECTED').length;
  const approvedCount = approvals.filter(r => r.status === 'APPROVED').length;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Approvals (List)</h1>
          <p className="support-text">Every quotation that needed, needs, or is going through discount approval</p>
        </div>
        <button
          className={`btn ${filterPending ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterPending(p => !p)}
        >
          {filterPending ? '✓ Pending Only' : 'Filter: Pending Only'}
        </button>
      </div>

      <div className="chip-row">
        <span className="chip chip-warning">{pendingCount} Pending</span>
        <span className="chip chip-danger">{returnedCount} Returned</span>
        <span className="chip chip-success">{approvedCount} Approved</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quotation</th>
              <th>Customer</th>
              <th>Blended Risk</th>
              <th>Stage</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>No approvals found.</td></tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="clickable" onClick={() => router.push(`/approvals/${row.id}`)}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.quote?.quoteNumber || row.quoteId}</td>
                  <td>{row.quote?.customer?.companyName || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${RISK_BADGE[row.quote?.riskLevel] || 'badge-neutral'}`}>
                      {row.quote?.riskLevel || 'UNKNOWN'}
                    </span>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.reviewer?.name || 'Unassigned'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        Click any row to open its full approval detail, risk breakdown, and audit trail.
      </div>
    </div>
  );
}
