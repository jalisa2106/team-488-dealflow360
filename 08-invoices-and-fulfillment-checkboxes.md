# 08 — Invoices Multi-Select/Filters + Fulfillment & Warehouses Checkboxes
**Two small, independent parts — split by existing ownership so they can land in parallel.**

---

## Part A — Invoices page (billing owner, continues files `02`/`06`)
**Branch:** `feature/invoices-checkbox-filters`
**Scope:** `src/app/(dashboard)/invoices/**`, `src/app/api/invoices/**`.

### 1. Checkbox multi-select
Same pattern established on Quotations (file `02`/Branch 2) and Products (file `03`/`05`) — don't invent a fourth variant of this UI:
- Checkbox column + header "select all on page" checkbox.
- Selection state in local component state, action bar appears once ≥1 row is selected.
- Wire at least one real bulk action end-to-end. The obvious one here is **bulk "Mark as Paid" / "Record Payment"** for selected invoices, or **bulk export** (PDF/XLS for just the selected rows) — check with the team which one actually matters for the demo rather than building both. A new endpoint `PATCH /api/invoices/bulk/route.ts` accepting `{ ids: string[], action: string }` is consistent with `products/bulk` and keeps the pattern uniform.

### 2. Fix the status filter to match real data
Before touching the filter dropdown, check `Invoice.status`'s actual values — either the enum/comment in `prisma/schema.prisma` or by querying `SELECT DISTINCT status FROM invoices` against your seeded data. Reports-page and other filters in this app have a history of hardcoding option lists that don't match what's actually in the schema (see file `02`'s Reports findings and file `00`'s `Order.status` mismatch) — don't repeat that here. Whatever the invoices page's status filter currently shows, make sure every option corresponds to a real, reachable status, and that no real status is missing from the dropdown. Wire the selected filter into `GET /api/invoices` as an actual query param (support multi-select the same way `listQuotes`'s `status` param does per file `02`'s work, so a user can filter by more than one status at once).

### 3. GroupBy placement — establish the one canonical layout and use it everywhere
This is as much a design-consistency fix as a feature: if Products, Fulfillment, Orders, Subscriptions, and now Invoices each put their "Group by" toggle in a different spot (some above the table, some inline with search, some floated right), it reads as five different people built five different apps. Pick one placement and apply it retroactively:

- **Canonical layout:** a single toolbar row directly above the table/list, left-to-right: search input → status/category filter(s) → group-by toggle → (view toggle, if the page has one, e.g. Quotations' Kanban/Table switch) — with any bulk action bar appearing as a second row that only renders once rows are selected, so it doesn't shift the toolbar around when nothing's selected.
- Audit every page that currently has a group-by toggle (Products by category, Fulfillment by warehouse/status, Orders by warehouse/status, per files `03`/`05`) and move each to match this layout if it doesn't already. This is a CSS/JSX rearrangement, not new logic — low risk, but touch each file once and be done, don't let it drift again.
- Add the invoices group-by (by status, and/or by customer — check which is more useful for a finance user reviewing invoices) to the same toolbar position from day one so it never needs retrofitting.

---

## Part B — Fulfillment & Warehouses checkboxes (catalog/fulfillment owner, continues files `03`/`05`)
**Branch:** `feature/fulfillment-warehouse-checkboxes`
**Scope:** `src/app/(dashboard)/fulfillment/**`, `src/app/api/fulfillment/**`, `src/app/(dashboard)/admin/warehouses/**` (from file `03`), `src/app/api/warehouses/**`.

The fulfillment page actually renders two distinct tables (inventory-per-warehouse, and orders-awaiting-fulfillment) — decide whether "checkbox functionality" applies to one or both; most likely it's the **orders table**, since that's the one with meaningful bulk actions (inventory rows aren't really something you'd bulk-act on the same way). Confirm with whoever asked before building both.

### 1. Orders-awaiting-fulfillment table
- Checkbox column + select-all, same pattern as Part A.
- Real bulk action: **"Accept Suggested Split for selected"** — batch-calls the auto-allocation from file `00` for every selected order that doesn't have one yet, or **bulk status transition** (e.g., mark selected as `FULFILLING`) — pick whichever matches how your Operations role actually works through this screen day-to-day.
- New endpoint: `POST /api/fulfillment/bulk-allocate/route.ts` (or extend the existing per-order allocate endpoint to accept an array) — `ADMIN`/`OPERATIONS` only, same as the existing single-order override route.

### 2. Warehouses admin page (`admin/warehouses`, from file `03`)
- If that page lists per-warehouse stock in a table (per file `03`'s spec), add the same checkbox pattern there for bulk stock adjustments (e.g., selecting several products at one warehouse and applying a percentage/flat restock) — only build this if there's a real bulk stock-adjustment need; if warehouses are typically edited one product at a time in practice, a plain per-row edit is more honest than a decorative bulk-select that nobody uses. Check with the team before adding it just to check a box.
- Apply the same groupby-placement fix from Part A §3 here if this page has (or gets) a group-by toggle.

### 3. Consistency check with Part A
Both parts land the same shared UI pattern (checkbox column + action bar + toolbar layout) independently — before merging either, quickly confirm the two implementations look and behave the same way (same checkbox styling, same action-bar placement/animation) so the app doesn't end up with two subtly different "multi-select" experiences depending on which page you're on. If file `01`'s shared `Toast` component is merged by now, both parts should already be using it for action feedback — if either of you built a local toast/notification before it landed, swap over.

---

## Out of scope for this file
- Everything already covered in files `00`–`07` — this file only adds invoices checkboxes/filters/groupby-placement and fulfillment/warehouses checkboxes; don't re-touch subscriptions, products catalog bugs, onboarding, or reports here.

## Definition of done
- [ ] Invoices page has working checkbox multi-select with at least one real bulk action
- [ ] Invoices status filter options exactly match real `Invoice.status` values seen in the data, and support selecting multiple
- [ ] Group-by toggle sits in the same toolbar position on every page that has one (Products, Fulfillment, Orders, Subscriptions, Invoices)
- [ ] Fulfillment's orders-awaiting-fulfillment table has working checkbox multi-select with a real bulk action
- [ ] Warehouses page checkbox functionality added only if a genuine bulk-action need was confirmed with the team
