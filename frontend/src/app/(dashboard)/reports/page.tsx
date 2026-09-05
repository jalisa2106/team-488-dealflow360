'use client';
import { useState } from 'react';

export default function ReportsPage() {
  const [period, setPeriod] = useState('This Month');
  const [team, setTeam] = useState('All Teams');

  const handleExport = (type: 'pdf' | 'xls') => {
    // We can just trigger a download by navigating to the API route in a new tab or iframe.
    window.open(`/api/reports/export/${type}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Admin / Reporting Dashboard</h1>
          <p className="support-text">Sales trends, approval bottlenecks and platform usage</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>Export PDF</button>
          <button className="btn btn-secondary" onClick={() => handleExport('xls')}>Export XLS</button>
        </div>
      </div>

      {/* Filters Card using theme variables */}
      <div className="card section bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
        <div className="form-row form-row-3" style={{ gap: 12 }}>
          <div className="field-group">
            <label className="field-label">Period</label>
            <select className="select bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]" value={period} onChange={e => setPeriod(e.target.value)}>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Sales Team</label>
            <select className="select bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]" value={team} onChange={e => setTeam(e.target.value)}>
              <option>All Teams</option>
              <option>Team A</option>
              <option>Team B</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Approval Status</label>
            <select className="select bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]">
              <option>All</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Product</label>
            <select className="select bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]">
              <option>All Products</option>
              <option>Laptop Pro 14</option>
              <option>Care Plan 2yr</option>
              <option>Docking Station</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards using theme variables */}
      <div className="kpi-grid">
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Quotes Created</div>
          <div className="kpi-value text-[var(--fg)]">148</div>
          <div className="kpi-sub">this month</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Avg Approval Time</div>
          <div className="kpi-value text-[var(--fg)]">6.4h</div>
          <div className="kpi-sub">from submission to decision</div>
        </div>
        <div className="kpi-card card-shadow bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
          <div className="card-label">Top Upsold Product</div>
          <div className="kpi-value text-[var(--fg)]" style={{ fontSize: 22 }}>Care Plan 2yr</div>
          <div className="kpi-sub">most frequently added</div>
        </div>
      </div>

      {/* Approval Bottlenecks Table using theme variables */}
      <div className="card bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]">
        <h2 className="section-title">Approval Bottlenecks</h2>
        <div className="table-wrap bg-[var(--surface)] border-[var(--border)]" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th className="text-right">Avg Wait (hrs)</th>
                <th className="text-right">Pending Now</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Sales Manager</td>
                <td className="text-right">3.2</td>
                <td className="text-right"><span className="badge badge-warning">2</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Finance</td>
                <td className="text-right">9.6</td>
                <td className="text-right"><span className="badge badge-danger">1</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
