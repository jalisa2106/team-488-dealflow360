# Branch 3 — Product Multi-Select + GroupBy Filtering (Products / Fulfillment / Warehouses / Orders)
**Suggested branch name:** `feature/product-fulfillment-groupby`
**Owner:** Teammate 3
**Scope:** `src/app/(dashboard)/products/**`, `src/app/api/products/**`, `src/app/(dashboard)/fulfillment/**`, `src/app/api/fulfillment/**`, `src/app/api/orders/**`. Don't touch `quotations`, `quotes` API, `middleware.ts`, `onboard/`, or `customers` — those belong to the other two branches.

## Why this exists
Reviewer feedback covers two of your five points:
1. *"list view for being able to select multiple products in the product module"*
2. *"for fulfillment and warehouses and products/orders etc, require groupby filtering for better display of results"*

---

## Part A — Product list: multi-select

Target: `src/app/(dashboard)/products/page.tsx`. Right now it's a plain read-only table (name, SKU, category, price, unit, tax %, status) with no selection at all, and the "Manage Price Fields" button is a dead button with no handler.

- Add a checkbox column + "select all" header checkbox, same interaction pattern as the quotation list gets in Branch 2 (sync with Teammate 2 on the exact checkbox/action-bar styling so both list views feel like one app, not two).
- On selection, show an action bar above the table: bulk actions that make sense for this data model — e.g. "Archive selected" (toggle `active: false`), "Assign category" (bulk `categoryId` update), "Export selected". You don't need every action wired to a real backend call for the jury demo, but at minimum wire **one real one** end-to-end (archive/activate toggle is the simplest — `PATCH /api/products` accepting `{ ids: string[], active: boolean }`) so it's not purely decorative.
- Add a new bulk endpoint rather than looping single-product PATCH calls from the client: `src/app/api/products/bulk/route.ts`, `PATCH`, role-gated same as the existing `GET /api/products` (`ADMIN`, `SALES_REP`, `SALES_MANAGER`, `FINANCE`, `OPERATIONS` — narrow this to `ADMIN`/`OPERATIONS` only for the actual mutation, read access can stay broad).

## Part B — GroupBy filtering: Products, Fulfillment/Warehouses, Orders

Current state, confirmed by reading the code:
- `GET /api/products` returns a flat list with `category` and `inventories.warehouse` included but no grouping — the page just renders one big table.
- `GET /api/fulfillment` returns `inventory` (warehouse × product stock rows) and `orders` (orders awaiting fulfillment) as two flat arrays — no grouping by warehouse or by order status.
- Orders don't have a dedicated list page yet (`src/app/api/orders/[id]/route.ts` exists for single-order lookup, but there's no `/api/orders` list route or `(dashboard)/orders` page) — you'll need to add both.

### Products page — group by Category
- Add a "Group by: Category" toggle (matches the existing `toggle-group`/`toggle-btn` pattern already used on the quotations page's Kanban/Table switch — reuse those CSS classes for visual consistency).
- When grouped: render a collapsible section per `category.name` (including an "Uncategorized" bucket for `categoryId: null`), each with its own product table.
- No API change strictly required (the data's already there via `category` include) — this can be a client-side `groupBy` over the existing `products` array. Keep it that way rather than adding server-side grouping logic; it's simpler and this dataset is small.

### Fulfillment page — group by Warehouse (inventory) and by Status (orders)
- Inventory table: add "Group by Warehouse" toggle — when on, render one sub-table per `warehouse.name` instead of one flat table with a warehouse column repeated on every row.
- Orders table: add a status filter/group (`CONFIRMED` / `FULFILLING` / `PARTIALLY_FULFILLED`) — since `GET /api/fulfillment` already filters orders server-side to only these three statuses, this can also be client-side grouping into tabs/sections, no API change needed here either.

### Orders — new list view (currently missing entirely)
This is a genuine gap, not just missing polish — there is no way to browse all orders today, only fetch one by ID or see the fulfillment-scoped subset.
- New route: `src/app/api/orders/route.ts`, `GET`, paginated, with `?warehouseId=` and `?status=` query params for server-side filtering (this one *does* need server-side filtering since the full order set — not just the fulfillment-relevant 3 statuses — could be large: `PENDING`, `CONFIRMED`, `FULFILLING`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED` — check `Order.status` enum/values in `prisma/schema.prisma` for the exact list before you write the filter).
- New page: `src/app/(dashboard)/orders/page.tsx` — table view with a "Group by Warehouse" and "Group by Status" toggle (pick whichever grouping is active, mutually exclusive, not both at once — keep it simple), driven by the new API's query params.
- Add `/orders` to `protectedRoutes` in `middleware.ts` — this is the **one line** you'll touch in that shared file; coordinate with Teammate 1 since they're also editing that file's `publicRoutes` list for the onboarding flow. Land whichever PR is ready first, the other rebases the one-line diff.

## Out of scope for this branch
- Quotation list search/multi-select/status-filter, quote pipeline audit → Branch 2
- Customer onboarding invite links, auth hardening → Branch 1

## Definition of done
- [ ] Products list supports multi-select with at least one real bulk action wired end-to-end
- [ ] Products list can be grouped by category
- [ ] Fulfillment page can be grouped by warehouse (inventory) and by status (orders)
- [ ] A real Orders list page + `GET /api/orders` exist, with warehouse/status grouping and filtering
