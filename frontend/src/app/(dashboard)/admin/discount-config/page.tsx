'use client';
import { useState } from 'react';

const TIER_CEILINGS = [
  { tier: 'Bronze', max: '5%' },
  { tier: 'Silver', max: '10%' },
  { tier: 'Gold', max: '15%' },
];
const CAT_CEILINGS = [
  { category: 'Hardware', max: '15%' },
  { category: 'Services', max: '10%' },
];
const ROUTING = [
  { range: 'Within tier / category limit', approval: 'No approval needed' },
  { range: 'Over limit, blended risk MEDIUM', approval: 'Sales Manager' },
  { range: 'Over limit, blended risk HIGH', approval: 'Sales Manager → Finance' },
];

export default function DiscountConfigPage() {
  const [saved, setSaved] = useState(false);
  const [tiers, setTiers] = useState(TIER_CEILINGS);
  const [cats, setCats] = useState(CAT_CEILINGS);

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 400));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Discount Tiers and Approval Chains</h1>
        <p className="support-text">Admin configuration of maximum discount ceilings and approval routing</p>
      </div>

      {/* Tier Ceilings */}
      <div className="section">
        <h2 className="section-title">Tier Discount Ceilings</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th className="text-right">Max Discount</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.tier}</td>
                  <td className="text-right">
                    <input
                      type="text"
                      value={row.max}
                      onChange={e => setTiers(prev => prev.map((t, j) => j === i ? { ...t, max: e.target.value } : t))}
                      style={{ width: 80, textAlign: 'right', padding: '4px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontWeight: 700 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Ceilings */}
      <div className="section">
        <h2 className="section-title">Category Discount Ceilings</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Max Discount</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.category}</td>
                  <td className="text-right">
                    <input
                      type="text"
                      value={row.max}
                      onChange={e => setCats(prev => prev.map((c, j) => j === i ? { ...c, max: e.target.value } : c))}
                      style={{ width: 80, textAlign: 'right', padding: '4px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontWeight: 700 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Routing */}
      <div className="section">
        <h2 className="section-title">Approval Routing by Discount Range</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Discount Range / Risk</th>
                <th>Required Approval</th>
              </tr>
            </thead>
            <tbody>
              {ROUTING.map((row, i) => (
                <tr key={i}>
                  <td>{row.range}</td>
                  <td style={{ fontWeight: 600 }}>{row.approval}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 20 }}>
        When a quote mixes categories with different ceilings, the system must compute a blended risk score and route to the highest required level.
        All approvals, rejections, and edits must be logged with user, timestamp, and reason.
      </div>

      {saved && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--success-bg)', border: '2px solid var(--success-border)', borderRadius: 4, color: 'var(--success-fg)', fontWeight: 700 }}>
          ✓ Configuration saved.
        </div>
      )}
      <div className="action-row">
        <button className="btn btn-primary" onClick={handleSave}>Save Configuration</button>
      </div>
    </div>
  );
}
