'use client';
import { useState, useEffect } from 'react';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#94a3b8',
  PENDING_APPROVAL: '#f59e0b',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  UNDER_NEGOTIATION: '#8b5cf6',
  CONFIRMED: '#3b82f6',
  FULFILLING: '#06b6d4',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280',
};

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading analytics...</div>;
  if (!data) return <div className="notice" style={{ color: 'var(--danger-fg)' }}>Failed to load analytics. You may need ADMIN or SALES_MANAGER role.</div>;

  const approvedCount = data.quotesByStatus?.find((s: any) => s.status === 'APPROVED')?._count?.id || 0;
  const pendingCount = data.quotesByStatus?.find((s: any) => s.status === 'PENDING_APPROVAL')?._count?.id || 0;
  const winRate = data.totalQuotes > 0 ? Math.round((approvedCount / data.totalQuotes) * 100) : 0;

  const approvalApproved = data.approvalStats?.find((s: any) => s.status === 'APPROVED')?._count?.id || 0;
  const approvalPending = data.approvalStats?.find((s: any) => s.status === 'PENDING')?._count?.id || 0;
  const approvalRejected = data.approvalStats?.find((s: any) => s.status === 'REJECTED')?._count?.id || 0;
  const totalApprovals = approvalApproved + approvalPending + approvalRejected;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics & Insights</h1>
        <p className="support-text">Aggregate deal metrics, revenue breakdown, and approval performance</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Quotes', value: data.totalQuotes, color: '#3b82f6' },
          { label: 'Total Revenue', value: `$${Number(data.totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#22c55e' },
          { label: 'Avg Deal Size', value: `$${Number(data.avgDealSize).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#8b5cf6' },
          { label: 'Approval Rate', value: `${winRate}%`, color: '#f59e0b' },
          { label: 'Pending Approvals', value: pendingCount, color: '#ef4444' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Quotes by Status */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 16 }}>Quotes by Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.quotesByStatus?.map((row: any) => {
              const pct = data.totalQuotes > 0 ? Math.round((row._count.id / data.totalQuotes) * 100) : 0;
              return (
                <div key={row.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: STATUS_COLOR[row.status] || '#94a3b8' }}>{row.status.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--fg-muted)' }}>{row._count.id} ({pct}%)</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: STATUS_COLOR[row.status] || '#94a3b8', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approval Performance */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 16 }}>Approval Performance</h2>
          {totalApprovals === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No approval requests recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Approved', count: approvalApproved, color: '#22c55e' },
                { label: 'Pending', count: approvalPending, color: '#f59e0b' },
                { label: 'Rejected', count: approvalRejected, color: '#ef4444' },
              ].map(item => {
                const pct = totalApprovals > 0 ? Math.round((item.count / totalApprovals) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: item.color }}>{item.label}</span>
                      <span style={{ color: 'var(--fg-muted)' }}>{item.count} ({pct}%)</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Customers */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 12 }}>Top Customers by Revenue</h2>
          {data.topCustomers?.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No approved deals yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Customer</th><th className="text-right">Deals</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {data.topCustomers?.map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                      <td className="text-right">{c.quoteCount}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: '#22c55e' }}>
                        ${c.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue by Product */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 12 }}>Top Products by Revenue</h2>
          {data.revenueByProduct?.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No product revenue recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Category</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {data.revenueByProduct?.map((p: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.productName}</td>
                      <td style={{ fontSize: 12 }}><span className="badge badge-neutral">{p.category}</span></td>
                      <td className="text-right" style={{ fontWeight: 700, color: '#3b82f6' }}>
                        ${p.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
