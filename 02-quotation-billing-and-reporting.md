# 02 — Quotation-to-Cash Completion: Subscriptions, Negotiation, Reporting
**Branch:** `feature/billing-negotiation-reports`
**Depends on:** file `00` merged first — this branch builds directly on the order/billing auto-trigger fix.
**Scope:** `src/app/(dashboard)/subscriptions/**`, `src/app/api/subscriptions/**`, `src/app/api/billing/**`, `src/lib/services/billing.service.ts`, `src/lib/services/negotiation.service.ts`, `src/app/(dashboard)/reports/**`, `src/app/api/reports/**`, `src/app/(dashboard)/analytics/**`, `src/app/api/analytics/**`, `src/app/(dashboard)/quotations/**` (only the `alert()`→toast swap, nothing else — Branch 2 already finished the search/filter/audit work last round). Don't touch `products`, `fulfillment`, `orders`, `admin/**`, `customers`, `onboard` — those are files `01`/`03`.

## Why this file exists
You already did the quotation-pipeline audit and search/filter work last round — that landed cleanly (`4c78479`). This round covers the parts of the spec's "quotation to cash" flow that are still fake or unverified: the subscription/billing screen (spec B7) and the reporting dashboard (spec A7), plus confirming negotiation re-approval actually works now that file `00` makes orders real.

## Part A — Subscription screen: make Cancel real (spec B7)

`src/app/(dashboard)/subscriptions/[subscriptionId]/page.tsx` currently has:
```tsx
const [cancelled, setCancelled] = useState(false);
...
onClick={() => {
  if (confirm('Cancel this subscription? ...')) {
    setCancelled(true);
  }
}}
```
This never touches the database — refresh the page and the subscription is "active" again. The spec explicitly wants: *"Cancel or modify subscription controls, with an automatic partial refund or credit note trigger when applicable."* The `CreditNote` model already exists in `prisma/schema.prisma` and is never created anywhere in the codebase — confirm that with a repo-wide search before you start, it should come back empty.

1. New route: `POST /api/subscriptions/[id]/cancel/route.ts` — role-gated to `ADMIN`/`FINANCE`/`SALES_MANAGER`. Sets `Subscription.status` to cancelled (check the actual field/enum in `schema.prisma` — `model Subscription` — and use what's there rather than inventing a new status string).
2. Compute proration for the unused remainder of the current billing period using the existing `calculateProration` in `src/lib/engines/billing.engine.ts` (it's already used for plan changes per the git history — reuse it, don't write a second proration formula).
3. If the prorated amount is non-zero, create a `CreditNote` record for it and write an audit log entry (reuse `audit.service.ts`).
4. Wire the button to actually call this route, show a real loading/error state, and reflect the true DB status on reload — not local component state.
5. Same treatment for "modify subscription" (quantity/plan change) if that control exists on the page — check whether the git history's "auto-save" / "Live Deal Guardian" work already covers this before building a second path.

## Part B — Reports & Analytics: replace fabricated data with real queries (spec A7)

This is the one I'd fix first in this file — it's currently not a partially-done feature, it's a fully fake screen. `src/app/(dashboard)/reports/page.tsx`:
- KPI cards show hardcoded `148`, `6.4h`, `"Care Plan 2yr"` — never fetched from anywhere.
- The "Sales Team" filter offers `Team A`/`Team B` — there is no team concept anywhere in `prisma/schema.prisma`. Either drop this filter or repurpose it as a Sales Rep filter (`User` where `role='SALES_REP'`), which the spec's A7 section actually asks for ("Sales Team / Rep: Filter reports by responsible rep or team").
- The "Product" filter hardcodes three product names instead of listing real products.
- None of the four filters (`period`, `team`, `status`, `product`) are actually passed to the export endpoints — `handleExport` just opens `/api/reports/export/pdf` with no query params at all.

Fix:
1. New route `GET /api/reports/summary/route.ts` returning real aggregates: quotes created in the selected period, average time from `PENDING_APPROVAL` to `APPROVED`/`REJECTED` (compute from `ApprovalRequest`/`ApprovalAction` timestamps — they're already logged), and top-upsold product (aggregate from wherever accepted upsell suggestions are recorded — check `quote.service.ts`/`UpsellRule` usage for the right table).
2. Populate the "Sales Rep" and "Product" filter dropdowns from real `GET /api/customers`-style list calls (`/api/products`, a rep list) instead of hardcoded `<option>`s.
3. Pass `period`/`repId`/`status`/`productId` as query params both to the new summary endpoint and to `handleExport('pdf'|'xls', filters)` — update `src/app/api/reports/export/pdf/route.ts` and `.../xls/route.ts` to actually apply them to the underlying query instead of exporting everything regardless of the filters shown on screen.
4. `src/app/(dashboard)/analytics/dashboard/page.tsx` — check whether it has the same problem (hardcoded numbers) or is genuinely wired to `/api/analytics`; if it's real, leave it, don't rebuild something that already works.

## Part C — Negotiation re-approval: verify against the now-real order flow

`negotiation.service.ts` already re-runs the discount/risk pipeline on a counter-offer and (per spec) should push the quote back into `PENDING_APPROVAL` if the new terms exceed thresholds. Once file `00` lands (orders get created on confirm), specifically re-test the case where a customer negotiates a quote that had *already* been confirmed/ordered — decide and enforce what should happen (most B2B systems either block renegotiation post-confirmation or explicitly void/reissue the order; right now nothing stops a negotiation on a `CONFIRMED` quote, which could silently desync the `Order`/`Invoice` already created for it). Add a guard in `negotiation.service.ts` if needed: reject renegotiation attempts once `Quote.status` is `CONFIRMED` or later, with a clear error message.

## Part D — Replace `alert()`/`confirm()` in this branch's files
`quotations/[quotationId]/page.tsx`, `quotations/new/page.tsx`, and `approvals/[quotationId]/page.tsx` all use `alert()`. Swap these to the shared `useToast()` hook from file `01` once it's merged (branch from it or cherry-pick just that one component if you're working ahead of it).

## Out of scope for this branch
- Order/status pipeline fix → file `00`
- Onboarding, Customers page, auth hardening → file `01`
- Discount/approval/warehouse admin CRUD, upsell setup, product variants, TopNav → file `03`

## Definition of done
- [ ] Cancelling a subscription actually updates the DB, computes real proration, and creates a `CreditNote` when applicable
- [ ] Reports page shows real numbers for the selected filters, and export actually respects those filters
- [ ] Negotiating an already-confirmed quote is explicitly blocked or explicitly handled, not silently allowed
- [ ] No `alert()`/`confirm()` remains in this branch's files
