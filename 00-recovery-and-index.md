# 00 — START HERE: Recovery Plan & How These Files Fit Together

I read the actual merged codebase (not just the docs) against your original problem statement PDF. The good news: a lot of what looked risky in the reviewer round is actually solid — the discount/risk/approval engines are genuinely DB-driven (`DiscountRule`, `ApprovalRule`), not hardcoded, and Branches 2 and 3 from the last round landed cleanly with no merge conflicts. The bad news: there's one broken seam that quietly disconnects the whole back half of the product, plus a set of screens that are visually complete but not actually wired to anything.

## What actually landed vs. what didn't

| Branch (last round) | Status |
|---|---|
| Branch 2 — quotation pipeline audit + search/filter | ✅ Landed (`4c78479`) — auth bypass removed, search/multi-status filter added, reset script added |
| Branch 3 — product multi-select + groupby | ✅ Landed (`fd512a0`) — products, fulfillment, new Orders page |
| Branch 1 — customer onboarding + auth hardening | ❌ **Never landed.** No `CustomerInvite` model, no `/onboard` route, no Customers page, no JWT-secret fix, no login rate limiting. This still needs to be built from scratch — see file `01`. |

## The one bug that matters more than any of the reviewer feedback

**Confirmed by reading the code, not assumed:** nothing in this codebase ever calls `prisma.order.create(...)`. I grepped the entire `src` tree for it — zero matches. That means:

- A customer confirms a quote (`POST /api/portal/quotes/[token]/confirm`) → the `Quote.status` flips to `CONFIRMED` → **and nothing else happens.** No `Order` row is ever created.
- `fulfillment.service.ts`'s `allocateOrder()` (the actual warehouse-split logic, spec section B6) can only run against an `orderId` that already exists — but nothing ever creates one outside of manual seed data.
- `billing.service.ts`'s `createOrderBilling()` (spec B7 — invoices + subscription billing schedules) has the exact same problem: it does `prisma.order.findUniqueOrThrow({ where: { id: orderId }})` and there's no automatic path that gives it a real `orderId` to work with.
- On top of that, `GET /api/fulfillment` filters orders by `status: { in: ['CONFIRMED', 'FULFILLING', 'PARTIALLY_FULFILLED'] }`, but `Order.status` in `prisma/schema.prisma` is documented as `PENDING, PARTIAL, FULFILLED, BACKORDERED` — **those two sets of strings don't overlap at all.** Even if an order existed, this query would never find it.

Net effect: if you run your own 8-step test flow from the problem statement right now — sign up, quote, discount, approval, upsell, **warehouse split, hybrid billing**, negotiation, **payment → invoice** — it will pass the first half and silently fall over at exactly the "warehouse split" and "payment/invoice" steps, because there's no order for those steps to act on. This is almost certainly *why* the reviewers told you to re-check the pipeline with real data instead of trusting the demo script.

### This gets fixed once, by one person, before the other three files below are touched
Because Branch 2 (quotes), Branch 3 (fulfillment/orders), and the billing engine all sit downstream of this, don't let three people patch around it independently — that's how you get three incompatible fixes merged into one weekend. **One person takes this file, lands it on `main` (or a short-lived `fix/quote-to-order-pipeline` branch merged same-day), then everyone else branches from the result.**

#### Fix checklist
1. **Reconcile the `Order.status` values.** Decide on one enum and use it everywhere: `PENDING → CONFIRMED → FULFILLING → PARTIALLY_FULFILLED → FULFILLED` (recommended, since it matches what `fulfillment.service.ts` and the API queries already assume) and update the comment in `schema.prisma` plus anywhere else `Order.status` is set or compared (`billing.service.ts`, `fulfillment.service.ts`, `analytics/route.ts`).
2. **Create the order on confirmation.** In `POST /api/portal/quotes/[token]/confirm/route.ts` (customer-side confirm) — and in whatever internal-side "Confirm Quotation" action exists for the internal workspace flow (check `quotations/[quotationId]/page.tsx` and its API for a parallel confirm path; the spec's flow allows confirmation either from the portal or, once approved, straight to fulfillment internally) — after setting `Quote.status = 'CONFIRMED'`, create the `Order`:
   ```ts
   const order = await prisma.order.create({
     data: {
       quoteId: quote.id,
       orderNumber: generateOrderNumber(), // same pattern as generateInvoiceNumber() in billing.service.ts
       status: 'CONFIRMED',
     },
   });
   ```
   Wrap the quote-status-update and order-create in a single `prisma.$transaction([...])` so you never end up with a confirmed quote and no order (or vice versa).
3. **Auto-run the initial fulfillment allocation.** Right after the order is created, call `allocateOrder(order.id, ...)` per quote line (loop over `quote.quoteLines`) with `manualOverride: false` so each line gets its suggested warehouse split immediately — this is what powers the "recommended warehouse split" spec B6 describes; right now that screen has no way to ever show a first-time suggestion, only overrides of a split that was never created.
4. **Auto-trigger billing.** Immediately after order creation (same request, or a follow-up call), invoke `createOrderBilling(order.id, actorId)` so one-time invoices and recurring subscription/billing schedules are generated the moment an order exists, matching spec B7 ("Order can be automatically split... A single order can mix one time products and recurring subscription lines with correct proration and billing schedules" — this should not require a human to separately go hit the `/api/billing` endpoint by hand).
5. **Re-run the 8-step test flow from the PDF (section 9) end to end**, with a fresh DB reset (the reset script Branch 2 added), and confirm every step produces a visible, correct result — not just that the screen loads. This is the actual acceptance test for this file; don't mark it done until all 8 steps pass with real UI clicks, not curl calls.

## How the remaining three files split up
Once the above is on `main`, the team splits into three parallel branches again, scoped so file edits don't collide:

- **`01-onboarding-and-access.md`** (Teammate 1, picking up unfinished work) — customer invite/onboarding links, Customers page, auth hardening, and the shared toast/error-handling component everyone else references.
- **`02-quotation-billing-and-reporting.md`** (Teammate 2) — finish wiring what looks done but isn't: subscription cancel/proration, negotiation restart verification, and the Reports/Analytics page, which is currently 100% hardcoded fake numbers.
- **`03-admin-config-and-catalog.md`** (Teammate 3) — the backend configuration screens the spec calls for that don't functionally exist yet: discount tier/approval chain CRUD, warehouse management, upsell rule setup, product variants, and finishing the top navigation per the spec's B1 menu.

Each file lists exactly which files/routes are in scope so you don't step on each other. `middleware.ts` is touched by both file `01` (adds `/onboard`, `/customers`) and file `03` (adds any new admin routes) — same rule as last time: whoever merges first wins, the other rebases their one-line diff.

## Non-negotiables for all three branches (production-grade pass)
Apply these wherever you touch a file, don't do a separate global sweep — that just creates merge conflicts:
- **No `alert()`/`confirm()` for anything user-facing.** These are currently used in `quotations/[quotationId]`, `quotations/new`, `fulfillment/[orderId]`, `approvals/[quotationId]`, `products`, `subscriptions/plans/new`, and `portal/quotation`. Replace with the shared toast component from file `01` (or build your own local one first if `01` isn't merged yet, then swap it out — don't block on that).
- **No screen that shows fabricated numbers as if they were live data.** If a screen can't be wired to a real query in the time you have, it should show an honest "coming soon" or be removed from nav — not silently lie with `148` quotes or `Team A`/`Team B` that don't exist in the schema.
- **Every mutating button needs a loading state and an error state**, not just a happy-path success state. If a fetch fails, the user should see why, not a console error only you can see.
- **Responsive pass**: `globals.css` currently has exactly one `@media` query in the whole app. At minimum, the dashboard tables need a mobile-safe fallback (horizontal scroll wrapper, already partially present via `.table-wrap` — check it actually has `overflow-x: auto`) and the top nav needs a collapsed/hamburger state below ~768px.
