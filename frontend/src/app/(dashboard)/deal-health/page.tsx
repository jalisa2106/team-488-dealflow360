'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DealHealthPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/deal-health');
        const data = await res.json();
        if (data.results) {
          setDeals(data.results);
        }
      } catch (err) {
        console.error('Failed to fetch deal health', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stalledCount = deals.filter(d => d.healthLevel === 'AT_RISK' || d.healthLevel === 'CRITICAL').length;
  const anomaliesCount = deals.filter(d => d.reasons?.some((r: any) => r.code === 'DISCOUNT_ANOMALY')).length;
  const criticalCount = deals.filter(d => d.healthLevel === 'CRITICAL').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Deal Health and Anomaly Dashboard</h1>
        <p className="support-text">Real-time flags for stalled deals and unusual discount patterns</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
          <div className="card-label">Stalled Deals</div>
          <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>{stalledCount}</div>
          <div className="kpi-sub">quotes idle 7+ days</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
          <div className="card-label">Discount Anomalies</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{anomaliesCount}</div>
          <div className="kpi-sub">above rep average</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
          <div className="card-label">Critical Deals</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{criticalCount}</div>
          <div className="kpi-sub">requiring immediate attention</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Health Level</th>
              <th>Primary Issue</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 20}}>All deals are healthy!</td></tr>
            ) : (
              deals.map((row, i) => {
                const severity = row.healthLevel === 'CRITICAL' ? 'danger' : row.healthLevel === 'AT_RISK' ? 'warning' : 'success';
                const mainReason = row.reasons?.[0]?.message || 'No issues';
                
                return (
                  <tr key={i}>
                    <td>
                      <Link href={`/quotations/${row.quoteId}`} style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                        {row.quote?.customer?.companyName || row.quote?.quoteNumber || row.quoteId}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge badge-${severity}`}>{row.healthLevel}</span>
                    </td>
                    <td>{mainReason}</td>
                    <td style={{ color: 'var(--fg-muted)' }}>{row.healthScore}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/quotations/${row.quoteId}`} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>
                          View Quote
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
