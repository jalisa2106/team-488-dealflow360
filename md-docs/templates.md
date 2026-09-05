# DealFlow360 — Screens 1–18 (Full Product Flow: Login to Payment)

This document specifies every screen in the Excalidraw wireframe **"DealFlow360 - End to End Product Flow (Login to Payment)"**, screen for screen, in the exact layout shown. Build with **Next.js (App Router)**. Do not alter section order, field sets, table columns, button labels, or copy — reproduce the wireframe as-is.

---

## Shared Visual Language

Apply the same DealFlow360 **Neobrutalist** design system used across the rest of the product:

- Warm off-white page background.
- Near-black typography and bold borders with a slightly hand-drawn character.
- Strong blue top navigation bar; the active tab uses a white/light "selected" treatment against the blue bar.
- Flat surfaces, hard offset shadows (no soft shadows), structured rounded corners.
- Green = success/paid/approved/active. Amber/orange = warning/pending/negotiation/at-risk. Red = destructive/unpaid/rejected/escalation. Blue = primary navigation/primary actions. Pale yellow = informational notice panels.
- Tables: strong outlines, distinct grey header row, readable rows, clear hover/clickable-row states.
- Generous whitespace, clear visual hierarchy, minimal gradients/decoration.

## Global Internal Navigation

Every internal (non-customer-portal) screen uses the same top nav bar, in this exact order:

```text
DealFlow360   Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports | Product
```

The tab for the module currently open is shown in the active/selected (white) state. Each module has one **list** screen (all records) and, where applicable, one **detail** screen (single record, opened by clicking a row).

```text
Dashboard      → Screen 2
Quotations     → Screen 3 (list) → Screen 4 (detail)
Approvals      → Screen 5 (list) → Screen 6 (detail)
Fulfillment    → Screen 7 (list) → Screen 8 (detail)
Subscriptions  → Screen 9 (list) → Screen 10 (detail)
Invoices       → Screen 12 (list) → Screen 13 (detail)
Deal Health    → Screen 14 (single dashboard, no separate detail)
Reports        → Screen 15 (single dashboard)
Product        → Screen 16 (list) → Screen 17 (detail)
My Quotation / Messages / Profile → Screen 11 (customer portal, separate nav)
```

Discount tiers and approval-chain configuration (Screen 18) is an admin settings surface reached from Product/Admin settings, not from the main nav bar itself.

---

# Screen 1 — Login / Signup

## Route

`/login`

## Purpose

Single entry point for both internal users and customers.

## Header

Full-width near-black top bar with centered title **DealFlow360** (no nav tabs — pre-authentication).

## Page Content

Heading: **Login / Signup**
Supporting text: *Entry point for internal users and customers*

Two toggle/tab buttons:
- **Log In** (primary blue, selected)
- **Sign Up** (secondary grey)

Form fields, side by side:
- **Email** (text input)
- **Password** (password input)

Actions below the fields:
- **Log In** — primary blue button
- **Forgot Password?** — plain/link-style secondary button

Pale-yellow informational notice:

> After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.

Plain supporting bullet list below the notice:
- Company / team selector shown for multi-team setups
- Basic validation on email and password fields
- Sign Up link creates a new internal or customer account

## Functional Expectations

- Authenticate via Supabase Auth.
- Route internal roles (Admin, Sales Rep, Sales Manager, Finance, Operations) to Screen 2 (Sales Dashboard) after login.
- Route Customer role to Screen 11 (Customer Portal) after login.
- Sign Up creates either an internal or a customer account depending on context.
- Support a company/team selector for multi-team internal accounts.

---

# Screen 2 — Sales Dashboard / Home

## Route

`/dashboard`

## Purpose

Central hub for internal users; links out to every module.

## Header / Navigation

Standard internal nav. **Dashboard** — active/selected.

## Page Header

**Sales Dashboard / Home**
Supporting text: *Central hub, links out to every module below*

## Summary Cards

Three flat bordered cards side by side:

| Card | Supporting value |
|---|---|
| Pending Approvals | 4 quotations waiting |
| Open Quotations | 12 active deals |
| At-Risk Deals | 3 flagged by Deal Health |

## Actions

- **+ New Quotation** — primary blue button, opens Screen 4 (new quotation).
- **View Approvals** — secondary outlined button, opens Screen 5.

## Recent Activity

Section heading: **Recent Activity** (blue link-style heading)

Plain activity list:
- Acme Corp quotation approved by Finance
- Beta Industries requested a discount change
- East Depot stock updated for Order #2291

## Functional Expectations

- Summary cards reflect live counts from Quotations, Approvals, and Deal Health modules.
- Recent Activity reflects the latest cross-module events.
- Clicking **+ New Quotation** or **View Approvals** navigates to the corresponding module.

---

# Screen 3 — Quotations (List)

## Route

`/quotations`

## Purpose

Every quotation in the system, one row per quotation, kanban-style by stage; click a row to open it.

## Header / Navigation

Standard internal nav. **Quotations** — active/selected.

## Page Header

**Quotations (List)**
Supporting text: *Every quotation in the system, one row per quotation, click a row to open it*

## Kanban Columns

Five columns, each a bordered container listing quotation cards (customer — amount):

| Column | Example cards |
|---|---|
| Draft | Acme Corp - $12,400; Delta LLC - $3,200 |
| Pending Approval | Beta Industries - $28,900 |
| Approved | Nova Retail - $9,750 |
| Negotiation | Zenith Co - $15,300 |
| Confirmed | Orion Ltd - $41,000 |

Clicking a card opens Screen 4 (Quotation Detail) — annotated **"click a row"** on the connector to Screen 4.

## Actions

- **+ New Quotation** — primary blue button.
- **Switch to Table View** — secondary outlined button (alternate flat-table rendering of the same data).

## Functional Expectations

- Columns represent quotation status/stage.
- Card counts and totals reflect live data.
- Clicking any card opens that quotation's detail (Screen 4).
- Table View toggle re-renders the same quotations as a flat, sortable table instead of kanban columns.

---

# Screen 4 — Quotation Detail

## Route

`/quotations/[quotationId]`

## Purpose

Add products, apply discounts, review upsells, and submit a quotation for approval.

## Header / Navigation

Standard internal nav. **Quotations** — active/selected.

## Page Header

**Quotation Detail: Q-1042 (Acme Corp)**
Supporting text: *Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.*

## Top Fields

Two fields side by side:
- **Customer** (text/select input)
- **Price List** (text/select input)

## Line Items Table

| Product | Qty | Price | Discount | Limit | Status |
|---|---:|---:|---:|---:|---|
| Laptop Pro 14 | 2 | $1,200 | 12% | 15% | OK |
| Onsite Setup Service | 1 | $450 | 18% | 10% | OVER (+8pt) |
| Extended Warranty | 1 | $180 | 10% | 15% | OK |

**Status** column uses color: OK = green/neutral, OVER = red/destructive with the over-by amount shown (e.g. "+8pt").

## Reconciliation-Style Notice

Pale-yellow informational panel:

> Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time.

## Upsell and Cross-Sell Suggestions

Section heading: **Upsell and Cross-Sell Suggestions** (blue)

Three suggestion cards side by side:

| Suggestion | Supporting text |
|---|---|
| + Wireless Mouse | Margin +$18 |
| + Docking Station | Promo: 12% off |
| + Care Plan 2yr | Margin +$46 |

## Actions

- **Save Draft** — secondary outlined button.
- **Submit for Approval** — primary blue button.

## Functional Expectations

- Opened from a row on the Quotations list.
- Line-level discount is validated against each line's own limit in real time as it is entered.
- A line exceeding its limit is flagged **OVER** with the exact over-by amount, without blocking further editing.
- Upsell suggestions are generated from co-purchase/promotion data and can be added as new lines with one click.
- **Submit for Approval** triggers discount evaluation → risk evaluation → approval routing (see Screen 6), moving the quotation to Pending Approval.
- All totals and discount checks are calculated server-side.

---

# Screen 5 — Approvals (List)

## Route

`/approvals`

## Purpose

Every quotation that needed, needs, or is going through discount approval.

## Header / Navigation

Standard internal nav. **Approvals** — active/selected.

## Page Header

**Approvals (List)**
Supporting text: *Every quotation that needed, needs, or is going through discount approval*

## Status Chips

Three status count chips:
- **3 Pending** — amber/orange
- **1 Returned** — red
- **12 Approved** — green

## Approvals Table

| Quotation | Customer | Blended Risk | Stage | Assigned To |
|---|---|---|---|---|
| Q-1042 | Acme Corp | HIGH | Sales Manager | M. Shah |
| Q-1039 | Beta Industries | MEDIUM | Finance | R. Iyer |
| Q-1035 | Nova Retail | LOW | Auto-Approved | – |

Pale-yellow informational notice:

> Click any row to open its full approval detail, risk breakdown, and audit trail.

## Actions

- **Filter: Pending Only** — secondary outlined toggle button.

## Functional Expectations

- Clicking a row opens Screen 6 (Approval Detail) — annotated **"click a row"** on the connector.
- Blended Risk is a computed value (LOW/MEDIUM/HIGH) driving the assigned approval stage.
- LOW risk quotations may be Auto-Approved with no assignee.
- Filter toggle narrows the table to Pending items only.

---

# Screen 6 — Approval Detail

## Route

`/approvals/[quotationId]`

## Purpose

Show why a quotation was flagged, its full discount/limit breakdown, its approval-chain progress, and the audit trail; let an approver act.

## Header / Navigation

Standard internal nav. **Approvals** — active/selected.

## Page Header

**Approval Detail: Q-1042 (Acme Corp)**
Supporting text: *Opened by clicking a row on the Approvals list*

## Status Badges

Two badges side by side:
- **Blended Risk: HIGH** — red/destructive treatment.
- **Customer Tier: Gold** — blue treatment.

## Why This Quote Was Flagged

Section heading: **Why This Quote Was Flagged** (blue)

| Line | Discount Given | Limit Allowed | Over By |
|---|---:|---:|---|
| Laptop (Hardware) | 12% | 15% | 0 pt - OK |
| Setup Service (Services) | 18% | 10% | 8 pt OVER |

Pale-yellow informational notice:

> Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.

## Approval Chain Tracker

Horizontal status tracker with circular nodes connected by arrows:

```text
Submitted → Sales Manager → Finance → Confirmed
```

Example state: **Submitted** (green/completed) → **Sales Manager** (blue/current) → **Finance** (grey/pending) → **Confirmed** (grey/pending).

## Audit Trail Table

| User | Action | Date | Note |
|---|---|---|---|
| J. Rao | Submitted | Aug 20 | Initial 12% discount |
| M. Shah | Returned | Aug 21 | Requested justification |
| J. Rao | Resubmitted | Aug 22 | Added margin note |

## Actions

Three buttons side by side:
- **Approve** — green/success.
- **Return for Revision** — amber/orange.
- **Reject** — red/destructive.

## Functional Expectations

- Opened from a row on the Approvals list.
- Displays the blended risk score and the specific line(s) that caused escalation.
- Approval chain reflects the actual routing (Sales Manager, then Finance, for HIGH risk; a subset for lower risk).
- Every action (approve/return/reject) appends a new audit-trail row with user, action, date, and note, and never overwrites prior rows.
- **Approve** advances the quote to the next chain stage or to Confirmed if this was the final stage, which then unlocks Fulfillment (Screen 7/8).
- **Return for Revision** sends the quote back to Draft (Screen 4) with the reviewer's note attached.
- **Reject** ends the approval flow for this quotation.
- If a customer negotiation (Screen 11) later changes terms and the new blended risk exceeds thresholds, the quote automatically re-enters this screen at the appropriate stage.

---

# Screen 7 — Fulfillment and Stock (List)

## Route

`/fulfillment`

## Purpose

Live stock per warehouse, plus every order that still needs fulfilling.

## Header / Navigation

Standard internal nav. **Fulfillment** — active/selected.

## Page Header

**Fulfillment and Stock (List)**
Supporting text: *Live stock per warehouse, plus every order that still needs fulfilling*

## Stock Table

| Warehouse | Product | In Stock | Reserved | Available |
|---|---|---:|---:|---:|
| Main Warehouse | Laptop Pro 14 | 40 | 18 | 22 |
| East Depot | Laptop Pro 14 | 10 | 6 | 4 |
| Main Warehouse | Docking Station | 65 | 12 | 53 |

## Orders Awaiting Fulfillment

Section heading: **Orders Awaiting Fulfillment** (blue)

| Order | Customer | Status | Warehouses |
|---|---|---|---|
| Q-1042 | Acme Corp | Split Pending | Main + East Depot |
| Q-1030 | Zenith Co | Backorder | East Depot |

Pale-yellow informational notice:

> Click an order row to open its warehouse split detail.

## Functional Expectations

- Stock levels update live as inventory is reserved/consumed.
- Clicking an order row opens Screen 8 (Fulfillment Detail) — annotated **"click a row"** on the connector.
- An order needing stock from more than one warehouse shows **Split Pending**; an order with insufficient stock anywhere shows **Backorder**.
- Fulfillment can never allocate more inventory than exists.

---

# Screen 8 — Fulfillment Detail

## Route

`/fulfillment/[orderId]`

## Purpose

Show how a specific order's quantity is being split/fulfilled across warehouses, and allow an operator to accept or override the split.

## Header / Navigation

Standard internal nav. **Fulfillment** — active/selected.

## Page Header

**Fulfillment Detail: Q-1042 (Acme Corp)**
Supporting text: *Opened by clicking an order row on the Fulfillment list*

## Warehouse Split Table

| Warehouse | Qty Fulfilled | Est. Shipments | Cost |
|---|---:|---:|---:|
| Main Warehouse | 18 units | 1 | $42 |
| East Depot | 6 units | 1 | $29 |

Pale-yellow informational notice:

> "Consolidate Remaining Backorder" prompt appears automatically once East Depot restocks.

## Actions

- **Accept Suggested Split** — primary blue button.
- **Manual Override** — secondary outlined button.

## Functional Expectations

- Opened from an order row on the Fulfillment list.
- The suggested split is system-computed to minimize shipments/cost within available stock per warehouse.
- **Accept Suggested Split** confirms the shown allocation and moves the order toward Shipped.
- **Manual Override** allows an operator to manually reassign quantities across warehouses within available stock.
- A restock event that resolves a backorder automatically surfaces a "Consolidate Remaining Backorder" prompt on this screen.
- Confirmed shipments here update the invoice lifecycle tracker on Screen 13 (Shipped step).
- Partial delivery here must not trigger billing for items not yet shipped (see Screen 13).

---

# Screen 9 — Subscriptions (List)

## Route

`/subscriptions`

## Purpose

Every recurring plan across every customer, regardless of which order it came from.

## Header / Navigation

Standard internal nav. **Subscriptions** — active/selected.

## Page Header

**Subscriptions (List)**
Supporting text: *Every recurring plan across every customer, regardless of which order it came from*

## Status Chips

- **18 Active** — green
- **2 Paused** — amber/orange
- **3 Cancelled** — red

## Subscriptions Table

| Customer | Plan | Cycle | Next Bill | Status |
|---|---|---|---|---|
| Acme Corp | Care Plan 2yr | Monthly | Sep 15 | Active |
| Beta Industries | Support SLA | Quarterly | Nov 1 | Active |
| Delta LLC | Care Plan 1yr | Monthly | – | Paused |

Pale-yellow informational notice:

> Click a subscription row to open its billing detail and proration history.

## Actions

- **+ New Plan (Admin)** — secondary outlined button.

## Functional Expectations

- Clicking a row opens Screen 10 (Billing Detail) — annotated **"click a row"** on the connector.
- A Paused subscription shows no Next Bill date.
- **+ New Plan (Admin)** is restricted to authorized/admin roles.

---

# Screen 10 — Billing Detail

## Route

`/subscriptions/[subscriptionId]`

## Purpose

Show the one-time lines from the originating order alongside the ongoing recurring lines for a subscription, and let an authorized user modify or cancel it.

## Header / Navigation

Standard internal nav. **Subscriptions** — active/selected.

## Page Header

**Billing Detail: Acme Corp - Care Plan 2yr**
Supporting text: *Opened by clicking a row on the Subscriptions list*

## One-Time Lines

Section heading: **One-Time Lines (from originating order)** (blue)

| Product | Qty | Amount |
|---|---:|---:|
| Laptop Pro 14 | 2 | $2,280 |
| Onsite Setup | 1 | $450 |

## Recurring Lines

Section heading: **Recurring Lines** (blue)

| Plan | Cycle | Next Bill Date | Amount |
|---|---|---|---:|
| Care Plan 2yr | Monthly | Sep 15 | $46 |
| Support SLA | Quarterly | Nov 1 | $300 |

## Actions

- **Modify Subscription** — secondary outlined button.
- **Cancel Subscription** — destructive outlined (red text/border) button.

## Functional Expectations

- Opened from a row on the Subscriptions list.
- Clearly distinguishes one-time (originating order) lines from recurring billing lines.
- **Modify Subscription** allows plan/cycle/quantity changes, which recompute future recurring amounts.
- **Cancel Subscription** stops future recurring billing while preserving billing history.
- Billing must always distinguish one-time and recurring lines; this screen is the canonical place that relationship is visible.

---

# Screen 11 — Customer Portal Negotiation Screen

## Route

`/portal/quotation`

## Purpose

Let a customer review and negotiate their quote directly, with no email needed.

## Header / Navigation

Separate customer-facing nav bar (not the internal nav):

```text
DealFlow360   My Quotation | Messages | Profile
```

**My Quotation** — active/selected.

## Page Header

**Customer Portal Negotiation Screen**
Supporting text: *Customer reviews and negotiates the quote directly, no email needed*

## Status Badge

- **Status: Under Negotiation** — amber/orange badge.

## Negotiation Table

| Line | Customer Comment |
|---|---|
| Extended Warranty | Can this be 15% off instead of 10%? |
| Onsite Setup | Can we push this to next month? |

## Request Fields

Two fields side by side:
- **Counter Discount %** (text/number input)
- **Requested Delivery Date** (date input)

## Actions

- **Submit Request** — secondary outlined button.
- **Confirm Quotation** — primary green/success button.

## Reconciliation-Style Notice

Pale-yellow informational panel:

> If final terms exceed thresholds, the quote automatically re-enters approval (Screen 6).

## Functional Expectations

- Customer-only surface; cannot access internal fields (cost price, internal notes, blended risk internals, audit trail).
- **Submit Request** records the customer's counter-discount % and/or requested delivery date as comments against the affected lines and notifies the sales rep.
- **Confirm Quotation** accepts the quote as currently priced.
- Any customer-initiated change (counter discount, delivery date) triggers automatic quote re-evaluation; if the new blended risk/discount exceeds thresholds, the quotation automatically re-enters the Approval flow (Screen 6) rather than being silently confirmed.
- The customer sees quote status update in real time as internal approval progresses.

---

# Screen 12 — Invoices (List)

## Route

`/invoices`

## Purpose

Every invoice generated from one-time and recurring orders.

## Header / Navigation

Standard internal nav. **Invoices** — active/selected.

## Page Header

**Invoices (List)**
Supporting text: *Every invoice generated from one-time and recurring orders*

## Status Chips

- **4 Unpaid** — red
- **21 Paid** — green

## Invoices Table

| Invoice # | Customer | Amount | Status | Due Date |
|---|---|---:|---|---|
| INV-1042 | Acme Corp | $2,730 | Unpaid | Sep 10 |
| INV-1043 | Acme Corp | $46 | Paid | Sep 15 |
| INV-1038 | Nova Retail | $9,750 | Paid | Aug 30 |

Pale-yellow informational notice:

> Click an invoice row to open its full payment and delivery reconciliation detail.

## Functional Expectations

- Combines invoices generated from one-time order lines and from recurring subscription billing in a single list.
- Clicking a row opens Screen 13 (Invoice Detail) — annotated **"click a row"** on the connector.
- Status uses red for Unpaid, green for Paid.

---

# Screen 13 — Invoice Detail

## Route

`/invoices/[invoiceId]`

## Purpose

Show an invoice's relationship to order confirmation, shipment, invoicing, and payment; allow recording payment and downloading a summary.

## Header / Navigation

Standard internal nav. **Invoices** — active/selected.

## Page Header

**Invoice Detail: INV-1042 (Acme Corp)**
Supporting text: *Opened by clicking a row on the Invoices list*

## Billing Lifecycle Tracker

Horizontal tracker with circular nodes connected by arrows:

```text
Order Confirmed → Shipped → Invoiced → Paid
```

Example state: **Order Confirmed** (green/completed) → **Shipped** (green/completed) → **Invoiced** (blue/current) → **Paid** (grey/pending).

## Invoice Table

| Invoice # | Amount | Status | Due Date |
|---|---:|---|---|
| INV-1042 | $2,730 | Unpaid | Sep 10 |
| INV-1043 (Recurring) | $46 | Paid | Sep 15 |

Status: Unpaid = red/destructive, Paid = green/success.

## Actions

- **Record Payment** — primary green/success button.
- **Download Summary** — secondary outlined button.

## Reconciliation Notice

Pale-yellow informational panel:

> Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.

## Functional Expectations

- Opened from a row on the Invoices list.
- Lifecycle tracker reflects the true state coming from Quotations (Order Confirmed), Fulfillment (Shipped), and Billing (Invoiced/Paid).
- **Record Payment** opens a payment-recording workflow and updates the invoice/payment status on success.
- **Download Summary** exports the invoice/payment summary.
- Partial delivery must never cause billing for items that have not shipped.

---

# Screen 14 — Deal Health and Anomaly Dashboard

## Route

`/deal-health`

## Purpose

Real-time flags for stalled deals and unusual discount patterns.

## Header / Navigation

Standard internal nav. **Deal Health** — active/selected.

## Page Header

**Deal Health and Anomaly Dashboard**
Supporting text: *Real-time flags for stalled deals and unusual discount patterns*

## Summary Cards

| Card | Supporting value |
|---|---|
| Stalled Deals | 5 quotes idle 7+ days |
| Discount Anomalies | 2 above rep average |
| Delivery Slippage | 3 promise dates at risk |

## Deal Health Table

| Deal | Issue | Flagged | Action |
|---|---|---|---|
| Zenith Co | Idle 9 days | Aug 24 | Nudge sent |
| Delta LLC | Discount 22% vs avg 8% | Aug 25 | Escalated to Manager |

## Actions

- **Escalate** — red/destructive button.
- **Nudge Rep** — blue primary button.

## Functional Expectations

- Surfaces stalled deals, discount anomalies, and delivery slippage from live quotation/fulfillment data.
- Selecting a deal-health row opens the related quotation for investigation, preserving the flagged issue context.
- **Escalate** records an escalation action against the selected deal.
- **Nudge Rep** records a nudge/follow-up action against the selected deal's owning rep.
- This dashboard is part of the operational workflow, not a read-only report.

---

# Screen 15 — Admin / Reporting Dashboard (Optional)

## Route

`/reports`

## Purpose

Sales trends, approval bottlenecks and platform usage.

## Header / Navigation

Standard internal nav. **Reports** — active/selected.

## Page Header

**Admin / Reporting Dashboard (Optional)**
Supporting text: *Sales trends, approval bottlenecks and platform usage*

## Filters

Four fields in a row:
- **Period**
- **Sales Team**
- **Approval Status**
- **Product**

## Summary Cards

| Card | Example value |
|---|---|
| Quotes Created | 148 this month |
| Avg Approval Time | 6.4 hours |
| Top Upsold Product | Care Plan 2yr |

## Actions

- **Export PDF** — secondary outlined button.
- **Export XLS** — secondary outlined button.

## Functional Expectations

- Filters (Period, Sales Team, Approval Status, Product) update the summary metrics when applied.
- Exports respect the currently selected filters.
- Metrics are derived from the application's actual quotation, approval, and product/upsell data.
- Screen is marked optional in the overall build priority.

---

# Screen 16 — Product Catalog (List)

## Route

`/products`

## Purpose

Every product, variant, and price list in one place.

## Header / Navigation

Standard internal nav. **Products** — active/selected.

## Page Header

**Product catalog**
Supporting text: *Every product, variant and price list in one place.*

## Actions (top)

- **+ New Product** — primary blue button.
- **Manage Price fields** — secondary link-style button.

## Summary Cards

| Card | Supporting value |
|---|---|
| Total Products | 128 active, 6 archived |
| Pricelists | 3 tiers, 2 currencies |
| Variants | 340 SKUs across all products |

## Products Table

Section heading: **Products** (blue)

| Product name | Category | Variants | Price | Unit | Tax | Status |
|---|---|---|---:|---|---:|---|
| Laptop Pro 14 | Hardware | 3 (size) | $1,200 | Each | 15% | Active |
| Onsite Setup Service | Services | – | $450 | Each | 10% | Active |
| Docking Station | Hardware | 3 (color) | $180 | Each | 15% | Active |
| Care Plan 3 years | Subscription | – | $40/month | Recurring | 0% | Active |

Pale-yellow informational notice:

> Click a product row to open general info, variants and tier/currency price lists.

## Functional Expectations

- Clicking a product row opens Screen 17 (Product Details page).
- **+ New Product** opens a blank Product Details form (Screen 17 layout).
- **Manage Price fields** opens tier/currency price-list configuration.

---

# Screen 17 — Product and Pricelist (Detail)

## Route

`/products/[productId]`

## Purpose

Edit a single product's general info, subscription/recurring behavior, variants, and tier/currency price rules.

## Header / Navigation

Standard internal nav.

## Page Header

**Product and pricelist**

## General Info

Section label: **General Info**

Left column fields:
- **Product name** (text input)
- **Category** (text input)
- **Price** (text/number input)
- **Unit** (text input)
- **Description** (text input)

Right column fields:
- **Tax %** (text/number input)
- **Subscription** — **Yes / No** toggle, with inline note: *If subscription yes then recurring will be visible*
- **Recurring** — **Monthly/Yearly/Weekly** select (visible only when Subscription = Yes)
- **Quantity on hand** (integer input), with inline note: *(Integer field)*

## Product Variants

Section label: **Product Variants**

| Attribute | Values | Extra price |
|---|---|---:|
| Color | Blue, Black | 0 |
| RAM | 4GB, 8GB | +$30 |
| Manufacturer | Dell, HP | +$10/+$30 |

## Pricelists

Section label: **Pricelists**

| Tier | Currency | Price Rule |
|---|---|---|
| Bronze | USD | Price, no adjustment |
| Gold | USD/EUR | Price minus 10 percent base |

## Reconciliation-Style Notice

Pale-yellow informational panel:

> Product details should be filled. Recurring order with this product will be invoiced at the beginning of the period.

## Functional Expectations

- Opened from a row on the Product catalog list, or from **+ New Product**.
- Subscription = Yes reveals the Recurring cadence field; Subscription = No hides it.
- Variant attribute/value combinations generate the product's SKUs and roll into the Variants count on Screen 16.
- Tier/currency price rules here are what the Discount tiers screen (Screen 18) checks discounts against.
- Subscription products with Recurring set invoice at the start of each billing period, per the notice.

---

# Screen 18 — Discount Tiers and Approval Chain Setup

## Route

`/admin/discount-config`

## Purpose

Admin configuration of maximum discount ceilings by customer tier and product category, and the approval chain each discount range triggers.

## Header / Navigation

Standard internal nav (admin context).

## Page Header

**Discount tiers and approval chains**

## Tier Discount Ceilings

Section label: **Tier Discount Ceilings**

| Tier | Max Discount |
|---|---:|
| Bronze | 5 percent |
| Silver | 10 percent |
| Gold | 15 percent |

## Category Discount Ceilings

Section label: **Category Discount ceilings**

| Category | Max Discount |
|---|---:|
| Hardware | 15 percent |
| Services | 10 percent |

## Approval Routing by Discount Range

Section label: **Tier Discount Ceilings** *(as labeled in the source wireframe — routing-by-range table)*

| Discount range | Max Discount |
|---|---|
| Within tier/Category limit | No approval needed |
| Over Limit, blended risk medium | Sales manager |
| Over limit, blended high risk | Sales manager then finance |

## Actions

- **Save configuration** — primary blue button.

## Reconciliation-Style Notice

Pale-yellow informational panel:

> When a quote mixes categories with different ceilings, the system must compute a blended risk score and route to the highest required level.
> All approvals, rejections, and edits must be logged with user, timestamp, and reason.

## Functional Expectations

- Tier and Category ceilings are independent inputs into the blended discount check used on Screen 4 and Screen 6.
- A quote spanning multiple categories/tiers with different ceilings computes a single blended risk score and routes to the highest approval level required by any line (this is the exact rule demonstrated on Screen 6).
- **Save configuration** persists ceiling and routing changes; changing these values does not retroactively alter historical approvals.
- Every approval, rejection, and edit anywhere in the system must be logged with user, timestamp, and reason (see the Screen 6 audit trail).

---

# Cross-Screen Navigation Map

```text
1. Login / Signup
      │
      ├─ internal user ──► 2. Sales Dashboard
      └─ customer ───────► 11. Customer Portal Negotiation Screen

2. Sales Dashboard
      │  + New Quotation
      ▼
3. Quotations (List) ──click a row──► 4. Quotation Detail ──Submit for Approval──► 6. Approval Detail

5. Approvals (List) ──click a row──► 6. Approval Detail ──Approve──► 7/8. Fulfillment

7. Fulfillment (List) ──click a row──► 8. Fulfillment Detail ──shipped──► 13. Invoice Detail

9. Subscriptions (List) ──click a row──► 10. Billing Detail

11. Customer Portal ──terms exceed threshold──► 6. Approval Detail (re-enters approval)

12. Invoices (List) ──click a row──► 13. Invoice Detail

14. Deal Health Dashboard ──select alert──► related Quotation (Screen 4)

15. Admin / Reporting Dashboard (standalone, optional)

16. Product Catalog (List) ──click a row──► 17. Product and Pricelist Detail

18. Discount Tiers and Approval Chain Setup (admin config, feeds Screens 4 and 6)
```

## Operational Data Flow

```text
Quotation → Discount Engine → Risk Engine → Approval Chain
     │                                            │
     ▼                                            ▼
Upsell Suggestions                          Fulfillment (warehouse split)
                                                   │
                                                   ▼
                                              Billing / Invoice
                                                   │
                                                   ▼
                                                Payment

Customer Portal negotiation ──► quote re-evaluation ──► (if over threshold) re-enters Approval Chain

Quotation / Fulfillment activity ──► Deal Health Signals ──► Stalled/Discount/Delivery Alerts ──► Escalate / Nudge Rep

Discount Tiers & Approval Chain Setup ──► governs ──► Discount Engine + Approval Chain routing
```

---

# Shared Interaction & UI Requirements

## Buttons

- Strong visible border, hard offset shadow, flat background.
- Clear hover, pressed/active, and disabled states.
- Green = successful actions (Approve, Record Payment, Confirm Quotation).
- Red = destructive/escalation actions (Reject, Cancel Subscription, Escalate).
- Amber/orange = caution/return actions (Return for Revision).
- Blue = primary workflow actions (Submit for Approval, + New Quotation, Nudge Rep, Save configuration).
- Light/outlined = secondary actions (Save Draft, Download Summary, Export PDF/XLS).

## Tables

- Distinct grey header rows, strong borders, consistent column spacing, readable row height.
- Clickable rows show clear hover feedback.
- Status is shown via text label plus color, never color alone.
- Wide tables scroll horizontally or stack responsively on small screens.

## Status & Health Indicators

- Every status (Draft/Pending/Approved/Confirmed, Unpaid/Paid, Active/Paused/Cancelled, LOW/MEDIUM/HIGH risk) is communicated through text plus a consistent color treatment plus context — never color alone.

## Responsive Behavior

- Internal nav collapses into a mobile-friendly control on small screens.
- Kanban columns (Screen 3) stack vertically on narrow viewports.
- Wide tables scroll horizontally or transform into stacked records.
- Key actions and filters remain accessible and touch-friendly at all breakpoints.

## Business Logic Boundaries

- All discount, risk, approval-routing, invoice-total, and payment-state calculations are deterministic, server-side application logic.
- AI, where present elsewhere in the product, may explain a verified result but must never decide invoice totals, payment state, approval requirements, or risk thresholds.
- The customer-facing portal (Screen 11) never has access to internal-only fields (cost price, internal notes, audit trail, blended-risk internals).
- Every approval, rejection, edit, and negotiation event is captured in an audit trail and is never overwritten.
