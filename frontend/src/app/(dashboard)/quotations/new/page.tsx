'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CustomerItem {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  tierName?: string;
}

const DEFAULT_CUSTOMERS: CustomerItem[] = [
  { id: 'cust_01', companyName: 'Acme Corp', contactName: 'John Acme', email: 'john@acme.com', tierName: 'Gold' },
  { id: 'cust_02', companyName: 'Apex Global Dynamics', contactName: 'Sarah Apex', email: 'sarah@apex.com', tierName: 'Gold' },
  { id: 'cust_03', companyName: 'CyberDyne Systems', contactName: 'Miles Dyson', email: 'dyson@cyberdyne.com', tierName: 'Silver' },
  { id: 'cust_04', companyName: 'Horizon Logistics & Supply', contactName: 'Elena Rostova', email: 'elena@horizon.com', tierName: 'Silver' },
  { id: 'cust_05', companyName: 'Nexus AI Solutions', contactName: 'David Zhang', email: 'david@nexus.ai', tierName: 'Bronze' },
  { id: 'cust_06', companyName: 'Stark Energy & Tech', contactName: 'Tony Stark', email: 'tony@stark.com', tierName: 'Gold' },
  { id: 'cust_07', companyName: 'Umbrella Enterprises', contactName: 'Albert Wesker', email: 'albert@umbrella.com', tierName: 'Bronze' },
  { id: 'cust_08', companyName: 'Wayne Industries', contactName: 'Bruce Wayne', email: 'bruce@wayne.com', tierName: 'Gold' },
];

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>(DEFAULT_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState([
    { product: '', qty: 1, price: '', discount: 0, limit: 15 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: CustomerItem[] = data.data.map((c: any) => ({
            id: c.id,
            companyName: c.companyName || c.name || 'Unnamed Customer',
            contactName: c.contactName || c.name,
            email: c.email,
            tierName: c.tier?.name || c.tierName || 'Standard',
          }));
          setCustomers(mapped);
        }
      })
      .catch(() => {
        // Fall back to DEFAULT_CUSTOMERS on error
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contactName && c.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectCustomer = (cust: CustomerItem) => {
    setSelectedCustomer(cust);
    setSearchQuery(cust.companyName);
    setIsOpen(false);
  };

  const addLine = () => setLines(prev => [...prev, { product: '', qty: 1, price: '', discount: 0, limit: 15 }]);

  const handleCreate = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    router.push('/quotations/Q-NEW');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Quotation</h1>
        <p className="support-text">Create a new quotation for a customer</p>
      </div>

      <div className="card section" style={{ overflow: 'visible' }}>
        <div className="form-row form-row-2" style={{ marginBottom: 20 }}>
          {/* Customer Searchable Dropdown Field */}
          <div className="field-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="field-label">Customer</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Select customer…"
                value={searchQuery}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCustomer(null);
                  setIsOpen(true);
                }}
                style={{ paddingRight: '32px' }}
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--fg-muted)',
                }}
              >
                ▼
              </button>
            </div>

            {/* Scrollable Dropdown Menu displaying 5-6 customer names */}
            {isOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                maxHeight: '220px',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
              }}>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: selectedCustomer?.id === cust.id ? 'var(--surface-muted)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedCustomer?.id === cust.id ? 'var(--surface-muted)' : 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fg)' }}>
                          {cust.companyName}
                        </div>
                        {cust.contactName && (
                          <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                            {cust.contactName} {cust.email ? `• ${cust.email}` : ''}
                          </div>
                        )}
                      </div>
                      {cust.tierName && (
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          {cust.tierName}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', fontSize: '13px', color: 'var(--fg-muted)', textAlign: 'center' }}>
                    No matching customers found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Price List</label>
            <select className="select">
              <option>Gold — USD</option>
              <option>Silver — USD</option>
              <option>Bronze — USD</option>
            </select>
          </div>
        </div>

        <h2 className="section-title" style={{ marginTop: 8 }}>Line Items</h2>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price ($)</th>
                <th className="text-right">Discount %</th>
                <th className="text-right">Limit %</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td><input className="input" placeholder="Product name" style={{ border: '1px solid var(--border-subtle)' }} /></td>
                  <td className="text-right"><input type="number" min={1} defaultValue={1} style={{ width: 60, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} /></td>
                  <td className="text-right"><input type="number" min={0} placeholder="0.00" style={{ width: 90, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} /></td>
                  <td className="text-right"><input type="number" min={0} max={100} defaultValue={0} style={{ width: 60, textAlign: 'right', padding: '6px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }} />%</td>
                  <td className="text-right" style={{ color: 'var(--fg-muted)' }}>15%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addLine}>+ Add Line</button>
      </div>

      <div className="action-row">
        <button className="btn btn-secondary" onClick={() => router.push('/quotations')}>Cancel</button>
        <button className="btn btn-secondary" onClick={handleCreate} disabled={saving}>Save Draft</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating…' : 'Create & Submit'}
        </button>
      </div>
    </div>
  );
}
