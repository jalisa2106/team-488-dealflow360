import Link from 'next/link';

export default function QuotationsList() {
  const columns = [
    { title: 'Draft', items: [{ id: 'Q-1045', name: 'Acme Corp', amount: '$12,400' }, { id: 'Q-1046', name: 'Delta LLC', amount: '$3,200' }] },
    { title: 'Pending Approval', items: [{ id: 'Q-1042', name: 'Beta Industries', amount: '$28,900' }] },
    { title: 'Approved', items: [{ id: 'Q-1030', name: 'Nova Retail', amount: '$9,750' }] },
    { title: 'Negotiation', items: [{ id: 'Q-1025', name: 'Zenith Co', amount: '$15,300' }] },
    { title: 'Confirmed', items: [{ id: 'Q-1010', name: 'Orion Ltd', amount: '$41,000' }] }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Quotations</h1>
          <p style={{ color: 'var(--foreground-muted)' }}>Manage all quotations and track their progress through the sales pipeline.</p>
        </div>
        <Link href="/quotations/new" className="btn btn-primary">
          + New Quotation
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
        {columns.map(col => (
          <div key={col.title} style={{ minWidth: '280px', flex: 1, backgroundColor: 'var(--surface-muted)', border: '2px solid var(--border)', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '2px solid var(--border)', fontWeight: 'bold' }}>
              {col.title}
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {col.items.map(item => (
                <Link key={item.id} href={`/quotations/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card shadow" style={{ padding: '16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{item.id}</strong>
                    </div>
                    <div style={{ marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.amount}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
