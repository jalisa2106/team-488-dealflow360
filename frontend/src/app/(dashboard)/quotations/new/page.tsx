'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CustomerItem {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  tierName: string; // e.g. "GOLD", "SILVER", "BRONZE"
}

interface PriceListItem {
  productId: string;
  price: string; // Decimal serialised as string
}

interface PriceList {
  id: string;
  name: string;
  currency: string;
  items: PriceListItem[];
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  basePrice: string;
  type: string;
  categoryName: string;
}

interface LineItem {
  productId: string;
  qty: number;
  discountPercent: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Derive the "expected" price list name from a customer tier name.
 * Matching is case-insensitive substring: "GOLD" matches "Gold Price List".
 */
function tierToPriceList(tierName: string, lists: PriceList[]): PriceList | null {
  const normalised = tierName.trim().toLowerCase();
  return (
    lists.find((pl) => pl.name.toLowerCase().includes(normalised)) ?? null
  );
}

/**
 * Return the effective base price for a product from the active price list.
 * Falls back to the product's catalogue base price if no override exists.
 */
function effectivePrice(
  productId: string,
  activePriceList: PriceList | null,
  products: ProductItem[]
): number {
  if (activePriceList) {
    const override = activePriceList.items.find((i) => i.productId === productId);
    if (override) return Number(override.price);
  }
  const prod = products.find((p) => p.id === productId);
  return prod ? Number(prod.basePrice) : 0;
}

/**
 * Format a number as a currency string using the price list currency.
 */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NewQuotationPage() {
  const router = useRouter();

  // ── Data from DB ─────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPriceLists, setLoadingPriceLists] = useState(true);

  // ── Customer searchable dropdown ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Price list state ──────────────────────────────────────────────────────────
  const [activePriceListId, setActivePriceListId] = useState<string>('');
  const [tierSuggestedId, setTierSuggestedId] = useState<string>(''); // auto-suggested by tier
  const [discountCeiling, setDiscountCeiling] = useState<number>(100); // from DiscountRule

  // ── Line items ────────────────────────────────────────────────────────────────
  const [lines, setLines] = useState<LineItem[]>([
    { productId: '', qty: 1, discountPercent: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  // ── Fetch customers ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCustomers(
            data.data.map((c: Record<string, any>) => ({
              id: c.id,
              companyName: c.companyName,
              contactName: c.contactName ?? null,
              email: c.email ?? null,
              tierName: c.tier?.name ?? 'Standard',
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to load customers', err))
      .finally(() => setLoadingCustomers(false));
  }, []);

  // ── Fetch products ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(
            data.data.map((p: Record<string, any>) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              basePrice: p.basePrice,
              type: p.type,
              categoryName: p.category?.name ?? '',
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to load products', err))
      .finally(() => setLoadingProducts(false));
  }, []);

  // ── Fetch price lists ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/price-lists')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setPriceLists(data.data);
        }
      })
      .catch((err) => console.error('Failed to load price lists', err))
      .finally(() => setLoadingPriceLists(false));
  }, []);

  // ── Auto-select price list when customer changes ───────────────────────────────
  useEffect(() => {
    if (!selectedCustomer || priceLists.length === 0) {
      setTierSuggestedId('');
      setActivePriceListId('');
      setDiscountCeiling(100);
      return;
    }

    // 1. Match tier name → price list name
    const suggested = tierToPriceList(selectedCustomer.tierName, priceLists);
    const suggestedId = suggested?.id ?? '';
    setTierSuggestedId(suggestedId);
    setActivePriceListId(suggestedId); // auto-select; user can override

    // 2. Fetch the discount ceiling for this customer
    fetch(`/api/customers/${selectedCustomer.id}/discount-ceiling`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDiscountCeiling(data.data.maxDiscountPercent);
      })
      .catch(() => setDiscountCeiling(100));
  }, [selectedCustomer, priceLists]);

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────────
  const activePriceList = priceLists.find((pl) => pl.id === activePriceListId) ?? null;
  const activeCurrency = activePriceList?.currency ?? selectedCustomer ? 'INR' : 'INR';
  const isPriceListOverride = !!activePriceListId && activePriceListId !== tierSuggestedId;

  const filteredCustomers = customers.filter(
    (c) =>
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactName && c.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const validLines = lines.filter((l) => l.productId);
  const quoteTotal = validLines.reduce((sum, l) => {
    const base = effectivePrice(l.productId, activePriceList, products);
    return sum + base * l.qty * (1 - l.discountPercent / 100);
  }, 0);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectCustomer = (cust: CustomerItem) => {
    setSelectedCustomer(cust);
    setSearchQuery(cust.companyName);
    setIsOpen(false);
  };

  const addLine = () =>
    setLines((prev) => [...prev, { productId: '', qty: 1, discountPercent: 0 }]);

  const updateLine = (index: number, key: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!selectedCustomer) return alert('Please select a customer.');
    if (validLines.length === 0) return alert('Please select at least one product.');

    setSaving(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          priceListId: activePriceListId || undefined,
          lines: validLines.map((l) => ({
            productId: l.productId,
            quantity: l.qty,
            discountPercent: l.discountPercent,
          })),
        }),
      });

      const data = await res.json();
      console.log('Created quote data:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to create quote');
      router.push('/quotations');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  const isLoading = loadingCustomers || loadingProducts || loadingPriceLists;
  if (isLoading) {
    return (
      <div style={{ padding: 40 }}>
        <div className="page-header">
          <h1 className="page-title">New Quotation</h1>
        </div>
        <div className="notice">Loading customers, products, and price lists from database…</div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Quotation</h1>
        <p className="support-text">
          Select a customer to auto-load their price list. All prices and discount limits are
          sourced live from the database.
        </p>
      </div>

      <div className="card section" style={{ overflow: 'visible' }}>

        {/* ── Customer & Price List row ─── */}
        <div className="form-row form-row-2" style={{ marginBottom: 20 }}>

          {/* Searchable customer dropdown */}
          <div className="field-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="field-label">Customer ({customers.length} loaded)</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Type to search customers…"
                value={searchQuery}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCustomer(null);
                  setIsOpen(true);
                }}
                style={{ paddingRight: 32 }}
              />
              <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--fg-muted)',
                }}
              >▼</button>
            </div>

            {/* Customer list dropdown */}
            {isOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                maxHeight: 240, overflowY: 'auto',
                background: 'var(--surface)', border: '2px solid var(--border)',
                borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 200,
              }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
                    No matching customers
                  </div>
                ) : (
                  filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: selectedCustomer?.id === cust.id ? 'var(--surface-muted)' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedCustomer?.id === cust.id ? 'var(--surface-muted)' : 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{cust.companyName}</div>
                        {(cust.contactName || cust.email) && (
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                            {[cust.contactName, cust.email].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 8 }}>
                        {cust.tierName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Price list dropdown — editable, auto-populated from tier */}
          <div className="field-group">
            <label className="field-label">
              Price List
              {tierSuggestedId && (
                <span style={{ fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 6, fontSize: 11 }}>
                  (auto-matched to {selectedCustomer?.tierName} tier)
                </span>
              )}
            </label>
            <select
              className="select"
              value={activePriceListId}
              onChange={(e) => setActivePriceListId(e.target.value)}
            >
              <option value="">— Default catalogue prices —</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.currency})
                  {pl.id === tierSuggestedId ? ' ★' : ''}
                </option>
              ))}
            </select>

            {/* Override warning */}
            {isPriceListOverride && (
              <div style={{
                marginTop: 6, padding: '5px 10px', borderRadius: 4, fontSize: 12,
                background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                ⚠ Pricing override — selected list doesn&apos;t match the customer&apos;s{' '}
                <strong>{selectedCustomer?.tierName}</strong> tier.
              </div>
            )}

            {/* No match notice */}
            {selectedCustomer && !tierSuggestedId && priceLists.length > 0 && (
              <div style={{
                marginTop: 6, padding: '5px 10px', borderRadius: 4, fontSize: 12,
                background: 'var(--surface-muted)', border: '1px solid var(--border)',
                color: 'var(--fg-muted)',
              }}>
                No price list found for &ldquo;{selectedCustomer.tierName}&rdquo; tier — using catalogue prices.
              </div>
            )}
          </div>
        </div>

        {/* Selected customer info strip */}
        {selectedCustomer && (
          <div style={{
            padding: '10px 14px', background: 'var(--surface-muted)',
            borderRadius: 6, marginBottom: 20, fontSize: 13,
            display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
            border: '1px solid var(--border)',
          }}>
            <span>✓ <strong>{selectedCustomer.companyName}</strong></span>
            {selectedCustomer.contactName && (
              <span style={{ color: 'var(--fg-muted)' }}>Contact: {selectedCustomer.contactName}</span>
            )}
            {selectedCustomer.email && (
              <span style={{ color: 'var(--fg-muted)' }}>{selectedCustomer.email}</span>
            )}
            <span className="badge badge-neutral">{selectedCustomer.tierName}</span>
            {discountCeiling < 100 && (
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 'auto' }}>
                Max discount for this tier: <strong>{discountCeiling}%</strong>
              </span>
            )}
            {activePriceList && (
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                Price list: <strong>{activePriceList.name}</strong> · {activePriceList.currency}
              </span>
            )}
          </div>
        )}

        {/* ── Line Items ─── */}
        <h2 className="section-title" style={{ marginTop: 8 }}>Line Items</h2>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ({products.length} available)</th>
                <th className="text-right">Qty</th>
                <th className="text-right">
                  Base Price
                  {activePriceList && (
                    <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4, color: 'var(--fg-muted)' }}>
                      ({activePriceList.name})
                    </span>
                  )}
                </th>
                <th className="text-right">
                  Discount %
                  {discountCeiling < 100 && (
                    <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4, color: 'var(--fg-muted)' }}>
                      (max {discountCeiling}%)
                    </span>
                  )}
                </th>
                <th className="text-right">Line Total</th>
                <th className="text-center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const basePrice = line.productId
                  ? effectivePrice(line.productId, activePriceList, products)
                  : 0;
                const lineTotal = basePrice * line.qty * (1 - line.discountPercent / 100);

                // Violations: over ceiling OR over global 30% threshold
                const isOverCeiling = line.discountPercent > discountCeiling;
                const isOverThreshold = line.discountPercent > 30;
                const isOver = isOverCeiling || isOverThreshold;

                // Check if price list has an override for this product
                const hasPriceOverride =
                  !!activePriceList &&
                  !!line.productId &&
                  activePriceList.items.some((item) => item.productId === line.productId);

                return (
                  <tr key={i} style={isOver ? { background: '#fff5f5' } : {}}>
                    <td>
                      <select
                        className="select"
                        value={line.productId}
                        onChange={(e) => updateLine(i, 'productId', e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ''} {p.categoryName ? `— ${p.categoryName}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <input
                        type="number" min={1} step={1} value={line.qty}
                        onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value) || 1)}
                        style={{ width: 64, textAlign: 'right', padding: '5px 8px', border: '2px solid var(--border)', borderRadius: 4, fontFamily: 'inherit' }}
                      />
                    </td>
                    <td className="text-right" style={{ fontSize: 13 }}>
                      {line.productId ? (
                        <span style={{ fontWeight: 600, color: hasPriceOverride ? 'var(--primary)' : 'var(--fg-muted)' }}>
                          {formatCurrency(basePrice, activeCurrency)}
                          {hasPriceOverride && (
                            <span title="Price list override" style={{ marginLeft: 4, fontSize: 10, opacity: 0.75 }}>★</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-right">
                      <input
                        type="number" min={0} max={100} step={1} value={line.discountPercent}
                        onChange={(e) => updateLine(i, 'discountPercent', parseFloat(e.target.value) || 0)}
                        style={{
                          width: 64, textAlign: 'right', padding: '5px 8px', fontFamily: 'inherit',
                          border: `2px solid ${isOver ? 'var(--danger-border, #f87171)' : 'var(--border)'}`,
                          borderRadius: 4, fontSize: 13, fontWeight: isOver ? 700 : 400,
                          color: isOver ? 'var(--danger-fg, #dc2626)' : 'inherit',
                        }}
                      />%
                      {isOverCeiling && (
                        <div style={{ fontSize: 10, color: 'var(--danger-fg, #dc2626)', fontWeight: 600, marginTop: 2 }}>
                          Exceeds {discountCeiling}% tier ceiling
                        </div>
                      )}
                      {!isOverCeiling && isOverThreshold && (
                        <div style={{ fontSize: 10, color: 'var(--danger-fg, #dc2626)', fontWeight: 600, marginTop: 2 }}>
                          &gt;30% — needs approval
                        </div>
                      )}
                    </td>
                    <td className="text-right" style={{ fontWeight: 700 }}>
                      {line.productId ? formatCurrency(lineTotal, activeCurrency) : '—'}
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '3px 10px', fontSize: 12 }}
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                      >✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {validLines.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '12px 8px' }}>
                    Total (after discounts)
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, padding: '12px 8px', color: 'var(--primary)' }}>
                    {formatCurrency(quoteTotal, activeCurrency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addLine}>
          + Add Line
        </button>
      </div>

      {/* Notices */}
      {validLines.some((l) => l.discountPercent > discountCeiling) && (
        <div className="notice" style={{ marginBottom: 12, borderColor: '#fcd34d', background: '#fffbeb', color: '#92400e' }}>
          <strong>Ceiling Exceeded:</strong> One or more lines exceed the{' '}
          <strong>{discountCeiling}%</strong> discount ceiling for this customer&apos;s tier. Additional
          approval will be required.
        </div>
      )}
      {validLines.some((l) => l.discountPercent > 30) && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <strong>Approval Required:</strong> One or more lines have a discount &gt;30%. This quote
          will automatically enter the approval workflow on submission.
        </div>
      )}

      <div className="action-row">
        <button className="btn btn-secondary" onClick={() => router.push('/quotations')} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={saving || !selectedCustomer || validLines.length === 0}
        >
          {saving ? 'Creating…' : 'Create & Submit'}
        </button>
      </div>
    </div>
  );
}