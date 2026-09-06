# 05 — Catalog & Fulfillment Bug Fixes + Meaningful Product IDs
**Branch:** `feature/catalog-fixes` (continues file `03`'s owner)
**Depends on:** file `00` (order pipeline fix) and file `03` (variants, warehouse admin, product multi-select groundwork) merged.
**Scope:** `src/app/(dashboard)/products/**`, `src/app/api/products/**`, `src/app/(dashboard)/fulfillment/**`, `src/app/api/fulfillment/**`, `src/app/(dashboard)/orders/**`, `src/app/(dashboard)/admin/warehouses/**` (from file `03`), `prisma/seed.ts`. I haven't re-read this session's actual code for the three bugs below (no updated zip was provided this round) — verify the exact cause against current `main` before patching; the likely-cause diagnosis is based on the architecture from the last audit.

## 1. Critical bug: every product detail page shows the same data ("Laptop Pro 14")

This is the most serious item on your list — worth fixing first. Likely causes, in order of probability, check each against `src/app/(dashboard)/products/[productId]/page.tsx`:
1. **The page isn't reading the dynamic route param.** If the fetch call is `fetch('/api/products/1')` or otherwise hardcoded instead of `fetch(`/api/products/${params.productId}`)` (or the Next 15/16 async-params pattern `const { productId } = await params` used elsewhere in this codebase, e.g. `orders/[id]/fulfillment/override/route.ts`), every product page will render whatever that one hardcoded ID resolves to.
2. **The API route ignores the ID.** Check `GET /api/products/[id]/route.ts` (if it exists as its own file — if product detail data is instead being filtered client-side out of the full `/api/products` list response, confirm the `find`/`filter` actually uses `params.productId` and not a stale closure or the first array element by mistake, e.g. `products[0]` left over from early scaffolding).
3. **Client-side data caching.** If this is a Next.js App Router fetch without `cache: 'no-store'` and the route is statically-optimized, you could be looking at a build-time-cached response served for every dynamic segment. Check for a `generateStaticParams` or default fetch caching behavior on this route.

Fix whichever of the above is the actual cause, then manually click through at least 3 different products and confirm each shows its own name/price/SKU/category before moving on.

## 2. "Add Variant" button not working (products page)

File `03` built the `ProductVariant` model and the variant CRUD routes — if the button exists but does nothing, check:
1. Is the button actually wired to `POST /api/products/[id]/variants` at all, or was the UI shipped ahead of the API (or vice versa) during the merge? Check the network tab for a failed/missing request when clicked.
2. If it does fire a request, check the response — a 403 (role check too strict for whoever's testing), a 400 (form sending the wrong field names — `attributeName`/`value`/`extraPrice` per the model in file `03`), or a 500 (likely a Prisma foreign-key issue if `productId` isn't being passed correctly from the dynamic route).
3. Confirm there's a success handler that actually re-fetches/appends the new variant to the on-screen list — a button that succeeds server-side but never updates the UI looks identical to "not working."

## 3. "New Plan" button not working (subscriptions page)

`src/app/(dashboard)/subscriptions/plans/new/page.tsx` exists per the last audit — same diagnostic approach as the variant button:
1. Check what "New Plan" refers to — is it a link/nav button that should route to `/subscriptions/plans/new` (a routing bug, e.g. wrong `href`, or the button not wrapped in `<Link>` at all), or is it the **submit** button on that page itself failing to actually create a `SubscriptionPlan`?
2. If it's the submit button: check `POST /api/subscriptions/plans/route.ts` exists and is being hit (network tab), check role gating, check for silent validation failures (a Zod schema rejecting a field the form doesn't actually send).

## 4. Product listing: real checkbox-driven update/delete (extends file `03`'s multi-select)

File `03`'s multi-select shipped with one real bulk action wired (archive/activate). Reviewer feedback now wants update and delete as real bulk actions too:
1. Extend `PATCH /api/products/bulk/route.ts` (from file `03`) to accept an `action` discriminator: `{ ids: string[], action: 'archive' | 'activate' | 'delete' | 'update', patch?: {...} }`.
2. **Delete should be a soft delete** (`active: false` + maybe a distinct `archivedAt` timestamp) rather than a hard `prisma.product.delete`, since `Product` is referenced by `QuoteLine`/`Inventory`/`FulfillmentAllocation` — a hard delete on a product that's already on a historical quote will break referential integrity or cascade-delete order history you need for the audit trail. If the team specifically wants hard delete for genuinely unused products, guard it: only allow hard delete when the product has zero `QuoteLine` references, otherwise force soft-delete and say why in the UI.
3. Bulk "update" (e.g., reassign category, adjust tax %) — build the specific fields your team actually needs here rather than a generic "edit anything" form; check with whoever requested this feedback item what field(s) they meant.

## 5. GroupBy/filtering: extend to Warehouses, Orders, Subscriptions

File `03` covered Products (by category) and Fulfillment (by warehouse/status). Orders got its own list page in the original Branch 3 round. Remaining:
1. **Warehouses admin page** (`src/app/(dashboard)/admin/warehouses/page.tsx`, from file `03`) — if it lists inventory per warehouse, add the same "group by product category" toggle pattern used on the Products page, so an admin scanning one warehouse's stock can collapse by category.
2. **Orders page** (`src/app/(dashboard)/orders/page.tsx`) — confirm the warehouse/status groupby from the original Branch 3 spec actually shipped; if it's flat, add the toggle using the same pattern as Products/Fulfillment for visual consistency.
3. **Subscriptions page** (`src/app/(dashboard)/subscriptions/page.tsx`) — add "Group by Plan" and/or "Group by Status" (active/cancelled/past-due — check `Subscription.status`'s actual enum values first). This is a new surface, not previously scoped in files `00`–`03`.

## 6. Fulfillment page: no data for "orders awaiting fulfillment"

Once file `00` lands (orders actually get created + allocated on quote confirmation), this may resolve itself — verify that first before treating it as a separate bug. If it's still empty after `00` is merged and you've confirmed at least one quote has been fully confirmed through the app:
1. Check `GET /api/fulfillment`'s order-status filter matches whatever enum file `00` standardized `Order.status` on.
2. If the issue is that your *seed data* has zero orders in an awaiting-fulfillment state (as opposed to a live-app bug), add 2–3 explicit demo-fixture orders in `prisma/seed.ts` in a `CONFIRMED`/`FULFILLING` state so the fulfillment screen isn't empty on a fresh demo-database reset, independent of whether a live quote has been walked through yet.

## 7. Meaningful product IDs (not random strings)

Two different things live under `Product` today: the primary key `id` (`@default(uuid())`) and the human-facing `sku` (`String @unique`). **Don't change the primary key** — it's referenced as a foreign key from `QuoteLine`, `Inventory`, `FulfillmentAllocation`, `ProductCoPurchase`, `UpsellRule`; converting it to a readable string would mean rewriting every relation and risks breaking existing seed/demo data right before a jury round, for a change that's purely cosmetic. What you actually want is a **meaningful `sku`** — that's the field intended for exactly this.

1. Design a convention, e.g. `{CATEGORY-CODE}-{TYPE-CODE}-{SEQ}`: a sofa product category might yield `SOFA-3ST-014` (3-seater, sequence 014), `SOFA-REC-002` (recliner). Keep it short and short-lived-hackathon-appropriate — don't over-engineer a full taxonomy.
2. Add a small SKU-generation helper (`src/lib/products/generate-sku.ts`) that takes category name + product type/name and produces the next sequential code for that category (query existing `Product.sku` values matching the prefix, increment).
3. Use it in both `prisma/seed.ts` (regenerate meaningful SKUs for your demo fixtures — this is what the jury will actually see) and in the "New Product" creation form/route, so it's not just fixed in seed data and then immediately wrong again the next time someone adds a product by hand.
4. Where the UI currently displays the raw `id` anywhere (check product detail pages, quote line items, order line items) — display `sku` instead; the UUID `id` should stay purely internal/technical.

## Out of scope for this branch
- Order/status pipeline fix → file `00`
- Onboarding, portal pages, email → files `01`/`04`
- Subscription plan bugs beyond the "New Plan" button, start/end dates, reports → file `06`

## Definition of done
- [ ] Every product detail page shows that product's own data
- [ ] Add Variant button actually creates and displays a variant
- [ ] Product bulk actions (archive/activate/delete/update) work via checkbox selection
- [ ] Warehouses, Orders, and Subscriptions pages all support groupby consistent with Products/Fulfillment
- [ ] Fulfillment page shows real awaiting-fulfillment orders after a fresh demo reset
- [ ] New products get a meaningful, human-readable SKU by category/type instead of an arbitrary string
