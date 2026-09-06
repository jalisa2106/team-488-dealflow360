# 07 — Final Manual QA Pass (run by all three, after files 00–06 land)
**Not a branch — this is a checklist, run directly against a freshly-reset demo database on `main` once everything above has merged.** Split the sections below across the three of you by who owns that area (same split as files `01`/`02`/`03`), but the point of this file is that someone *other* than the builder clicks through each flow — you don't reliably catch your own bugs.

## Why this file exists
Three items from your list are QA process, not features: *"check the functionality of all the add buttons," "test data consistency," "manual testing on everything."* This gives that a concrete shape instead of a vague "test more" note, so it's actually done rather than skipped under time pressure.

## 0. Setup
1. Run the reset script (from last round's Branch 2 work) against a scratch DB, then reseed.
2. Have one login per role ready: `ADMIN`, `SALES_REP`, `SALES_MANAGER`, `FINANCE`, `OPERATIONS`, and a `CUSTOMER` account created via the real onboarding flow (file `04`) — not a seeded one, so you're testing the actual path a jury demo would show.

## 1. Every "Add" / "New" / "Create" button, by page — click it, don't just look at it
Go through and confirm each one (a) fires a real request, (b) succeeds with valid input, (c) shows a clear error with invalid/missing input (not a silent console error), (d) the new item actually appears in the relevant list without a manual page refresh:

- [ ] `+ New Product`
- [ ] `+ Add Variant` (per-product, file `05`)
- [ ] `+ New Quotation`
- [ ] Add line item inside the quote builder
- [ ] `+ New Warehouse` (file `03`)
- [ ] Adjust/add stock at a warehouse (file `03`)
- [ ] `+ New Upsell Rule` (file `03`)
- [ ] `+ New Discount Rule` / `+ New Approval Rule` (file `03`)
- [ ] `+ New Plan` (subscriptions, file `06`)
- [ ] "Send onboarding link" (Customers page, file `01`/`04`)
- [ ] "Accept Upsell Suggestion" in the quote builder
- [ ] "Accept Suggested Split" / manual override on fulfillment (file `00`'s auto-allocation should mean there's always an initial suggestion to accept now — confirm)
- [ ] "Submit Request" / "Confirm Quotation" on the customer portal
- [ ] "Approve" / "Reject" / "Return for Revision" on the approval screen
- [ ] "Record Payment" on an invoice

## 2. End-to-end: the problem statement's own 8-step test flow (PDF section 9)
Run this fully as a live click-through, not via API calls, timing roughly how long each step takes — if any step requires you to manually poke the database to make the next step work, that's a bug, not an acceptable manual workaround, and it goes back to whichever file above should have covered it:
1. Sign up/log in, set up a discount tier, warehouse, and subscription plan
2. Create a quotation, add a line with an above-normal discount
3. Confirm it auto-routes for manager approval
4. Accept an upsell suggestion mid-build, confirm total/margin update live
5. Get it approved, confirm stock is pulled from the correct warehouse (splitting across two if needed) — this now depends on file `00`'s auto-allocation actually firing
6. Confirm a one-time product and a recurring subscription on the same order bill correctly and separately
7. Open the customer portal, request a bigger discount, confirm it re-enters approval automatically
8. Confirm the order, record a payment, confirm invoice status updates

## 3. Data consistency pass
- [ ] Pick 3 random quotations in the DB and manually re-derive their totals (line prices × qty − discount + tax) by hand or in a spreadsheet; confirm they match what's stored and what's displayed. This is the single best way to catch a silent engine bug that's been there since the hackathon and never got caught because the demo always used the same 2 quotes.
- [ ] Confirm every `Order` has exactly one corresponding confirmed `Quote`, and no `Order` exists with a `Quote` still in `DRAFT`/`PENDING_APPROVAL` (would indicate the file `00` transaction isn't atomic).
- [ ] Confirm every `Invoice`/`Subscription`'s amounts trace back to real `QuoteLine` data — not leftover values from an earlier hardcoded/dummy-data era predating this round's fixes.
- [ ] Confirm seed data doesn't have duplicate customers, orphaned records (an `Inventory` row pointing at a deleted product, a `QuoteLine` with a null product from a hard-delete — see file `05`'s soft-delete note), or products sharing SKUs.
- [ ] Spot-check that role-based visibility actually holds: log in as a `SALES_REP` and confirm you only see your own quotes (per the existing `listQuotes` scoping); log in as the test `CUSTOMER` and confirm you cannot reach any `/api/*` internal route by hitting it directly with your portal session cookie.

## 4. Responsive/visual pass (per file `00`'s non-negotiables)
- [ ] Every dashboard table scrolls horizontally on a narrow viewport instead of breaking layout
- [ ] Top nav collapses sensibly below ~768px
- [ ] No remaining `alert()`/`confirm()` anywhere — grep the repo one more time before the demo, don't trust memory: `grep -rn "alert(\|confirm(" src --include=*.tsx`

## Definition of done
- [ ] Every button in section 1 is checked off by someone other than its author
- [ ] The full 8-step flow passes live, timed, with no manual DB intervention
- [ ] Data consistency spot-checks pass or have been fixed
- [ ] No `alert()`/`confirm()` remain
