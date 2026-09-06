# 03 — Backend Configuration Completion: Discount Rules, Warehouses, Upsell, Variants, Nav
**Branch:** `feature/admin-config-catalog`
**Depends on:** file `00` merged first (warehouse allocation now actually triggers on order creation, so your warehouse CRUD has something real to feed).
**Scope:** `src/app/(dashboard)/admin/**`, `src/app/api/admin/**`, new `src/app/api/warehouses/**`, `src/app/(dashboard)/products/**` (variants only — don't touch the multi-select/groupby work from last round, that's done), `src/components/TopNav.tsx`. Don't touch `quotations`, `subscriptions`, `reports`, `onboard`, `customers` — those are files `01`/`02`.

## Why this file exists
Spec section 4A ("Sales Backend / Configuration Area") describes five setup screens: product & price lists (done), discount tier & approval chain setup (exists visually, **not functional**), warehouse & fulfillment setup (**doesn't exist**), subscription plan setup (done — `subscriptions/plans/new`), and upsell rule setup (**doesn't exist**, only the *consuming* panel exists in the quote builder). This file builds the three that are missing or fake.

## Part A — Make Discount Tier / Approval Chain setup real (spec A3)

`src/app/(dashboard)/admin/discount-config/page.tsx` is fully decorative right now: `TIER_CEILINGS`/`CAT_CEILINGS`/`ROUTING` are hardcoded constants, and "Save" just does `await new Promise(r => setTimeout(r, 400))` then shows a fake success message — it never touches the database. Meanwhile the actual engines (`quote.service.ts`, `negotiation.service.ts`) correctly read live `DiscountRule` and `ApprovalRule` rows — there's just no admin UI or API to manage those rows, so today they can only be changed by editing the seed script.

1. New routes:
   - `GET/POST /api/admin/discount-rules/route.ts` — list + create `DiscountRule` (fields: `customerTierId?`, `categoryId?`, `maxDiscountPercent`, matching what `quote.service.ts` already expects — read its ceiling-lookup code first so your schema usage matches exactly).
   - `PATCH/DELETE /api/admin/discount-rules/[id]/route.ts`
   - `GET/POST /api/admin/approval-rules/route.ts` and `PATCH/DELETE .../[id]/route.ts` — same pattern for `ApprovalRule`.
   - All `ADMIN`-only via `requireRole(['ADMIN'])`.
2. Rewire `discount-config/page.tsx` to fetch real `CustomerTier`, `ProductCategory`, `DiscountRule`, and `ApprovalRule` data and actually persist edits through the routes above. Keep the existing visual layout (tier ceiling table, category ceiling table, routing table) — just make the data and the Save button real.
3. Delete (or repurpose, coordinate with file `01` which is also looking at this) the stale `GET /api/admin/config/route.ts` that returns unused hardcoded thresholds — nothing reads it and it'll confuse anyone auditing the app later.

## Part B — Warehouse & Fulfillment setup (spec A4) — currently doesn't exist at all

Right now `Warehouse` and `Inventory` are only ever *displayed* (`fulfillment/page.tsx`) — there is no create/edit UI and no API for either.

1. New routes:
   - `GET/POST /api/warehouses/route.ts` — create/list warehouses (name, code, and whatever "shipping cost weighting" field the spec calls for — add a `shippingWeight` or similarly-named `Float`/`Decimal` column to `Warehouse` in `schema.prisma` if it isn't already there; check first).
   - `PATCH /api/warehouses/[id]/route.ts` — edit warehouse details.
   - `POST /api/warehouses/[id]/inventory/route.ts` — set/adjust stock level for a product at that warehouse (creates or updates the `Inventory` row). Log every stock adjustment via `audit.service.ts` — this is exactly the kind of change a jury will ask "how do you know this number is trustworthy" about.
   - Role: `ADMIN`/`OPERATIONS`.
2. New page: `src/app/(dashboard)/admin/warehouses/page.tsx` — list warehouses, create new, and per-warehouse stock-level editing (a simple table of product × current stock with an inline edit). This is genuinely new functionality, not a polish pass, so budget real time for it.
3. Add "Admin: Warehouses" to `TopNav.tsx`'s `NAV_ITEMS`, `ADMIN`/`OPERATIONS` only.

## Part C — Upsell rule setup (spec A6) — currently doesn't exist at all

`upsell.engine.ts` and `UpsellRule`/`ProductCoPurchase` exist and are consumed in the quote builder's upsell panel, but there's no admin screen to actually create pairing rules, mark promoted products, or set margin thresholds — someone can only get upsell suggestions if the seed script happened to create the right rows.

1. New routes: `GET/POST /api/admin/upsell-rules/route.ts`, `PATCH/DELETE .../[id]/route.ts` — `ADMIN`-only. Match whatever fields `UpsellRule` actually has in `schema.prisma` (primary/secondary product, promoted flag, minimum margin threshold per the spec).
2. New page: `src/app/(dashboard)/admin/upsell-rules/page.tsx` — a simple table: pick primary product, pick paired product, toggle "currently promoted", set minimum margin threshold. Add to nav, `ADMIN` only.

## Part D — Product variants (spec A2) — currently doesn't exist at all

The `Product` model in `schema.prisma` has no variant/attribute support (`name`, `sku`, `basePrice`, etc. are all flat, single-SKU fields). Spec A2 asks for "Variants: Attribute (example: Size or Pack), Values, Extra prices."

1. Add a `ProductVariant` model:
   ```prisma
   model ProductVariant {
     id            String   @id @default(uuid())
     productId     String   @map("product_id")
     attributeName String   @map("attribute_name") // e.g. "Size"
     value         String                           // e.g. "Large"
     extraPrice    Decimal  @default(0) @map("extra_price") @db.Decimal(14, 2)
     sku           String?  @unique
     createdAt     DateTime @default(now()) @map("created_at") @db.DateTime2

     product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

     @@index([productId])
     @@map("product_variants")
   }
   ```
   Add `variants ProductVariant[]` to `Product` — additive only.
2. Extend `products/[productId]/page.tsx` with a variants section (add/edit/remove attribute-value-extraPrice rows) and `GET/POST /api/products/[id]/variants/route.ts` + `PATCH/DELETE .../[variantId]/route.ts` (`ADMIN` for mutation, existing read roles for GET).
3. **Don't touch the quotation builder to consume variants unless time allows** — this is explicitly the kind of scope-creep that sinks a jury demo. Landing variant *management* satisfies the spec's setup requirement; wiring variant selection into the live quote-builder cart is a stretch goal, call it out as such in your demo notes if you don't get to it (spec deliverable 8 explicitly wants "a short note on what the team would build next with more time" — this is a legitimate thing to put there instead of rushing it in).

## Part E — Finish the top navigation per spec B1

Spec B1 describes: `Quotations`, `Pipeline` (a Kanban-style deal view), and action buttons `Reload Data`, `Go to Back-end`, `Close Workspace`. Today's `TopNav.tsx` only has a flat list of page links — the kanban view exists but only as an in-page toggle inside `/quotations`, there's no standalone `Pipeline` nav entry, and none of the three action buttons exist.

1. Add a `Pipeline` nav item pointing at `/quotations?view=kanban` (read the query param in `quotations/page.tsx` to default the toggle state — small change, don't restructure that page).
2. `Reload Data` — a button in `TopNav.tsx` that calls `router.refresh()` (Next.js) to force-refetch server data for the current route; cheap to implement, matches the spec's intent of "refresh pricing, stock, and approval data from the backend."
3. `Go to Back-end` — a link to `/admin/discount-config` (or a new `/admin` index page listing all the admin screens you and file `01` have built: Discount Rules, Warehouses, Upsell Rules, Customers). Consider adding a small `/admin/page.tsx` index if more than two admin screens exist by the time you land this — nicer for the jury demo than making them guess a URL.
4. `Close Workspace` — for a hackathon-scope app without a "workspace session" concept beyond the logged-in session, the honest implementation is: end the current sales-workspace context (e.g., clear any in-progress quote-builder local state / draft) and return to `/dashboard`. Don't overbuild a session-management system for this — a single button doing exactly that is enough to satisfy the spec line.

## Out of scope for this branch
- Order/status pipeline fix → file `00`
- Onboarding, Customers page, auth hardening, shared Toast → file `01`
- Subscription billing, negotiation, reports → file `02`

## Definition of done
- [ ] Discount tier / category ceilings and approval routing are edited through a real admin UI backed by `DiscountRule`/`ApprovalRule`, not hardcoded constants
- [ ] Warehouses and their stock levels can be created/edited through a real admin UI
- [ ] Upsell rules can be created/edited through a real admin UI
- [ ] Products support variants (attribute/value/extra price) with basic admin management
- [ ] Top nav has `Pipeline`, `Reload Data`, `Go to Back-end`, `Close Workspace` per spec B1
- [ ] No `alert()`/`confirm()` remains in this branch's files (use the shared `Toast` from file `01`)
