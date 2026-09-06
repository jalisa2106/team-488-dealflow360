'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface DealHealthRow {
  quoteId: string;
  healthLevel: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL';
  healthScore: number;
  reasons: Array<{ signal?: string; severity?: string; message: string; points?: number; code?: string }>;
  quote?: {
    id: string;
    quoteNumber: string;
    total: number;
    status: string;
    riskScore: number;
    riskLevel: string;
    customer?: { id: string; companyName: string };
    salesRep?: { id: string; name: string };
  };
}

const FILTER_OPTS = ['All', 'CRITICAL', 'AT_RISK', 'WATCH', 'HEALTHY', 'Anomalies Only', 'Stalled Only'];
const GROUP_OPTS = ['None', 'Health Level', 'Primary Signal', 'Sales Rep'];

export default function DealHealthPage() {
  const [deals, setDeals] = useState<DealHealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [groupBy, setGroupBy] = useState('None');
  const [search, setSearch] = useState('');

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

  const stalledCount = deals.filter(d =>
    d.reasons?.some(r => r.signal === 'STALL' || r.code === 'STALL' || r.message?.toLowerCase().includes('stall'))
  ).length;

  const anomaliesCount = deals.filter(d =>
    d.reasons?.some(r => r.signal === 'DISCOUNT_ANOMALY' || r.code === 'DISCOUNT_ANOMALY' || r.message?.toLowerCase().includes('discount'))
  ).length;

  const criticalCount = deals.filter(d => d.healthLevel === 'CRITICAL').length;
  const atRiskCount = deals.filter(d => d.healthLevel === 'AT_RISK').length;

  // Filtered rows
  const visible = useMemo(() => {
    return deals.filter(d => {
      // Filter tab logic
      let matchesFilter = true;
      if (filter === 'CRITICAL') matchesFilter = d.healthLevel === 'CRITICAL';
      else if (filter === 'AT_RISK') matchesFilter = d.healthLevel === 'AT_RISK';
      else if (filter === 'WATCH') matchesFilter = d.healthLevel === 'WATCH';
      else if (filter === 'HEALTHY') matchesFilter = d.healthLevel === 'HEALTHY';
      else if (filter === 'Anomalies Only') {
        matchesFilter = d.reasons?.some(r => r.signal === 'DISCOUNT_ANOMALY' || r.code === 'DISCOUNT_ANOMALY' || r.message?.toLowerCase().includes('discount'));
      } else if (filter === 'Stalled Only') {
        matchesFilter = d.reasons?.some(r => r.signal === 'STALL' || r.code === 'STALL' || r.message?.toLowerCase().includes('stall'));
      }

      // Search term logic
      const term = search.trim().toLowerCase();
      let matchesSearch = true;
      if (term) {
        const cust = d.quote?.customer?.companyName?.toLowerCase() || '';
        const qNum = d.quote?.quoteNumber?.toLowerCase() || '';
        const rep = d.quote?.salesRep?.name?.toLowerCase() || '';
        const reasonsStr = d.reasons?.map(r => r.message).join(' ').toLowerCase() || '';
        matchesSearch = cust.includes(term) || qNum.includes(term) || rep.includes(term) || reasonsStr.includes(term);
      }

      return matchesFilter && matchesSearch;
    });
  }, [deals, filter, search]);

  // Grouped records
  const groupedData = useMemo(() => {
    if (groupBy === 'None') {
      return { 'All Deals': visible };
    }

    const groups: Record<string, DealHealthRow[]> = {};

    visible.forEach(row => {
      let key = 'Other';
      if (groupBy === 'Health Level') {
        key = row.healthLevel || 'UNKNOWN';
      } else if (groupBy === 'Primary Signal') {
        const primary = row.reasons?.[0]?.signal || (row.reasons?.[0]?.message ? 'FLAGGED' : 'HEALTHY');
        key = primary.replace(/_/g, ' ');
      } else if (groupBy === 'Sales Rep') {
        key = row.quote?.salesRep?.name || 'Unassigned';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    return groups;
  }, [visible, groupBy]);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Deal Health & Anomaly Dashboard</h1>
          <p className="support-text">Real-time risk radar for stalled opportunities, margin erosion, and discount anomalies</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
          <div className="card-label">Critical Deals</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{criticalCount}</div>
          <div className="kpi-sub">requiring immediate executive review</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
          <div className="card-label">At-Risk Deals</div>
          <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>{atRiskCount}</div>
          <div className="kpi-sub">stalled or high-friction negotiations</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }}>
          <div className="card-label">Discount Anomalies</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{anomaliesCount}</div>
          <div className="kpi-sub">exceeding rep baseline / tier policy</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)' }}>
          <div className="card-label">Stalled Quotes</div>
          <div className="kpi-value" style={{ color: 'var(--warning-fg)' }}>{stalledCount}</div>
          <div className="kpi-sub">idle &gt; 48 hours without progress</div>
        </div>
      </div>

      {/* Toolbar / Filters & GroupBy */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 16, padding: '10px 14px',
        background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8,
      }}>
        <input
          className="input"
          placeholder="🔍  Search deals, customers, reps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 180, flex: 1, maxWidth: 260, fontSize: 13, padding: '6px 10px' }}
        />

        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        {/* Filter chips */}
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Filter:</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_OPTS.map(opt => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 99,
                cursor: 'pointer', border: '1.5px solid', transition: 'all 0.1s',
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
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Group by:</label>
          <select
            className="select select-inline"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', width: 'auto', minWidth: 130, maxWidth: 180 }}
          >
            {GROUP_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
          {visible.length} of {deals.length} deals
        </span>
      </div>

      {/* Render Tables (Grouped or Flat) */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--fg-muted)' }}>
          Loading deal health metrics…
        </div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--fg-muted)' }}>
          No deals matching the selected criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(groupedData).map(([groupTitle, groupRows]) => (
            <div key={groupTitle} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {groupBy !== 'None' && (
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{groupTitle}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{groupRows.length} deals</span>
                  </div>
                </div>
              )}

              <div className="table-wrap" style={{ margin: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deal &amp; Customer</th>
                      <th>Sales Rep</th>
                      <th>Health Level</th>
                      <th>Risk Factors &amp; Anomaly Signals</th>
                      <th className="text-right">Health Score</th>
                      <th className="text-right">Quote Value</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => {
                      const severity =
                        row.healthLevel === 'CRITICAL'
                          ? 'danger'
                          : row.healthLevel === 'AT_RISK'
                          ? 'danger'
                          : row.healthLevel === 'WATCH'
                          ? 'warning'
                          : 'success';

                      const reasonText =
                        row.reasons && row.reasons.length > 0
                          ? row.reasons.map(r => r.message).join('; ')
                          : 'Operating within healthy thresholds';

                      return (
                        <tr key={row.quoteId}>
                          <td>
                            <Link
                              href={`/quotations/${row.quoteId}`}
                              style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                            >
                              {row.quote?.customer?.companyName || 'Unknown Customer'}
                            </Link>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                              {row.quote?.quoteNumber || row.quoteId}
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{row.quote?.salesRep?.name || '—'}</td>
                          <td>
                            <span className={`badge badge-${severity}`}>
                              {row.healthLevel}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, maxWidth: 360 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {row.reasons && row.reasons.length > 0 ? (
                                row.reasons.map((r, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ color: r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'var(--danger-fg)' : 'var(--warning-fg)' }}>•</span>
                                    <span>{r.message}</span>
                                  </div>
                                ))
                              ) : (
                                <span style={{ color: 'var(--fg-muted)' }}>No flags</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right" style={{ fontWeight: 700, color: 'var(--fg)' }}>
                            {row.healthScore}/100
                          </td>
                          <td className="text-right" style={{ fontWeight: 600 }}>
                            ${Number(row.quote?.total || 0).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Link
                              href={`/quotations/${row.quoteId}`}
                              className="btn btn-secondary"
                              style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}
                            >
                              View Deal
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
