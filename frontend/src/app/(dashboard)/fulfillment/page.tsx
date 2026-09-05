'use client';
import Link from 'next/link';

const STOCK_ROWS = [
  { warehouse: 'Main Warehouse', product: 'Laptop Pro 14', inStock: 40, reserved: 18, available: 22 },
  { warehouse: 'East Depot', product: 'Laptop Pro 14', inStock: 10, reserved: 6, available: 4 },
  { warehouse: 'Main Warehouse', product: 'Docking Station', inStock: 65, reserved: 12, available: 53 },
];

const ORDER_ROWS = [
  { id: 'Q-1042', customer: 'Acme Corp', status: 'Split Pending', warehouses: 'Main + East Depot', statusType: 'warning' },
  { id: 'Q-1030', customer: 'Zenith Co', status: 'Backorder', warehouses: 'East Depot', statusType: 'danger' },
];

export default function FulfillmentPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fulfillment and Stock (List)</h1>
        <p className="support-text">Live stock per warehouse, plus every order that still needs fulfilling</p>
      </div>

      {/* Stock Table */}
      <div className="section">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Product</th>
                <th className="text-right">In Stock</th>
                <th className="text-right">Reserved</th>
                <th className="text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              {STOCK_ROWS.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.warehouse}</td>
                  <td>{row.product}</td>
                  <td className="text-right">{row.inStock}</td>
                  <td className="text-right">{row.reserved}</td>
                  <td className="text-right">
                    <span className={`badge ${row.available <= 5 ? 'badge-danger' : row.available <= 15 ? 'badge-warning' : 'badge-success'}`}>
                      {row.available}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders Awaiting Fulfillment */}
      <div className="section">
        <h2 className="section-title">Orders Awaiting Fulfillment</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Warehouses</th>
              </tr>
            </thead>
            <tbody>
              {ORDER_ROWS.map(row => (
                <tr key={row.id} className="clickable" onClick={() => window.location.href = `/fulfillment/${row.id}`}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                  <td>{row.customer}</td>
                  <td>
                    <span className={`badge badge-${row.statusType}`}>{row.status}</span>
                  </td>
                  <td>{row.warehouses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice" style={{ marginTop: 12 }}>
          Click an order row to open its warehouse split detail.
        </div>
      </div>
    </div>
  );
}
