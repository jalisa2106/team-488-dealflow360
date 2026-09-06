'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface SummaryData {
  quotesCreated: number;
  avgApprovalHours: number;
  topUpsoldProduct: string;
  bottlenecks: Array<{ role: string; pendingNow: number; avgWaitHours: number }>;
}

interface Product { id: string; name: string; }
interface Rep { id: string; name: string; role: string; }

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
];
const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DRAFT', label: 'Draft' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState('this_month');
  const [repId, setRepId] = useState('');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [exporting, setExporting] = useState<'pdf' | 'xls' | null>(null);

  // Load products and reps for dropdowns once
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => { if (d.success) setProducts(d.data || []); });
    fetch('/api/users').then(r => r.json()).then(d => { if (d.success) setReps(d.data || []); });
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams({ period });
      if (repId) params.set('repId', repId);
      if (status) params.set('status', status);
      if (productId) params.set('productId', productId);
      const res = await fetch(`/api/reports/summary?${params}`);
      const data = await res.json();
      if (data.success) setSummary(data.data);
      else toast.error('Failed to load report data');
    } catch {
      toast.error('Network error loading reports');
    } finally {
      setLoadingSummary(false);
    }
  }, [period, repId, status, productId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleExport = async (type: 'pdf' | 'xls') => {
    setExporting(type);
    try {
      const params = new URLSearchParams({ period });
      if (repId) params.set('repId', repId);
      if (status) params.set('status', status);
      if (productId) params.set('productId', productId);
      window.open(`/api/reports/export/${type}?${params}`, '_blank');
      toast.success(`${type.toUpperCase()} export started`);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Admin / Reporting Dashboard</h1>
          <p className="support-text">Sales trends, approval bottlenecks and platform usage</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')} disabled={!!exporting}>
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('xls')} disabled={!!exporting}>
            {exporting === 'xls' ? 'Exporting…' : 'Export XLS'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card section">
        <div className="form-row form-row-4" style={{ gap: 12 }}>
          <div className="field-group">
            <label className="field-label">Period</label>
            <select className="select" value={period} onChange={e => setPeriod(e.target.value)}>
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Sales Rep</label>
            <select className="select" value={repId} onChange={e => setRepId(e.target.value)}>
              <option value="">All Reps</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name} ({r.role})</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Quote Status</label>
            <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Product</label>
            <select className="select" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card card-shadow">
          <div className="card-label">Quotes Created</div>
          <div className="kpi-value">{loadingSummary ? '…' : summary?.quotesCreated ?? 0}</div>
          <div className="kpi-sub">{PERIODS.find(p => p.value === period)?.label}</div>
        </div>
        <div className="kpi-card card-shadow">
          <div className="card-label">Avg Approval Time</div>
          <div className="kpi-value">{loadingSummary ? '…' : `${summary?.avgApprovalHours ?? 0}h`}</div>
          <div className="kpi-sub">from submission to decision</div>
        </div>
        <div className="kpi-card card-shadow">
          <div className="card-label">Top Upsold Product</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>
            {loadingSummary ? '…' : summary?.topUpsoldProduct ?? 'N/A'}
          </div>
          <div className="kpi-sub">most frequently added (recurring)</div>
        </div>
      </div>

      {/* Approval Bottlenecks Table */}
      <div className="card">
        <h2 className="section-title">Approval Bottlenecks</h2>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Approver Role</th>
                <th className="text-right">Avg Wait (hrs)</th>
                <th className="text-right">Pending Now</th>
              </tr>
            </thead>
            <tbody>
              {loadingSummary ? (
                <tr><td colSpan={3} style={{ textAlign: 'center' }}>Loading…</td></tr>
              ) : summary?.bottlenecks.map(b => (
                <tr key={b.role}>
                  <td style={{ fontWeight: 600 }}>{b.role.replace('_', ' ')}</td>
                  <td className="text-right">{b.avgWaitHours}</td>
                  <td className="text-right">
                    <span className={`badge ${b.pendingNow > 3 ? 'badge-danger' : b.pendingNow > 0 ? 'badge-warning' : 'badge-success'}`}>
                      {b.pendingNow}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
