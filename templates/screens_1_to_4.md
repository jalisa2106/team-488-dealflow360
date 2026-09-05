# DealFlow360 — Updated Frontend Build Specification
## Screens 1–4: Login → Dashboard → Quotations → Quotation Detail

> **Source-of-truth alignment:** This specification is updated to align with the project's source documents and the DealFlow360 product philosophy: **a quotation is a stateful business decision, not a static CRUD record.** The frontend must visibly react to deterministic business logic for discount governance, risk, approvals, inventory, and downstream workflow.

---

# 1. Non-Negotiable Product Principles

## DealFlow360 is a self-governing deal engine

The frontend must communicate this idea:

> **Most sales systems record what happened. DealFlow360 decides what should happen next.**

Do not build disconnected CRUD screens. User actions must propagate through visible application state.

Core decision flow:

```text
QUOTE CHANGE
    ↓
Pricing + Discount Rules
    ↓
Margin + Blended Risk Evaluation
    ↓
Approval Required?
    ├── No → Eligible for Fulfillment
    └── Yes → Approval Workflow
```

Important rule:

- AI may explain a result.
- Deterministic application logic decides discounts, risk thresholds, approval routing, stock allocation, and billing.
- The frontend must display engine outputs clearly rather than pretending these decisions are manual.

---

# 2. Shared Frontend System

## Visual Direction: Neobrutalism

All four screens must use the same design system.

### Required characteristics

- Bold 2–3px dark borders
- Hard offset shadows, not soft/glass shadows
- Flat, high-contrast surfaces
- Strong typography hierarchy
- Consistent corner radius
- Solid accent colors
- Obvious active, hover, pressed, disabled, loading, success and error states
- Generous whitespace
- Minimal gradients
- Functional animation only

### Suggested tokens

- Base background: warm off-white / very light neutral
- Ink: near-black
- Primary: strong blue
- Success: green
- Warning: amber/orange
- Error/risk: red
- Information: pale yellow or blue surface

Do not mix Neobrutalism with glassmorphism.

---

## Shared interaction behavior

### Buttons

- Hover: slight upward translation or shadow adjustment
- Active: reduce/remove offset shadow and move toward resting position
- Disabled: visibly muted, no pointer interaction
- Loading: prevent duplicate actions and show progress

### Cards and clickable rows

- Pointer cursor
- Clear hover feedback
- Small transform only; no excessive motion
- Keyboard accessible

### Inputs

- Strong visible border
- Clear focus ring
- Inline validation
- Error text close to the invalid field

### Tables

- Strong header separation
- Comfortable row height
- Clickable rows visibly interactive
- Responsive horizontal scroll where required

---

# 3. Shared Internal Navigation

After internal authentication, show persistent navigation:

1. Dashboard
2. Quotations
3. Approvals
4. Fulfillment
5. Subscriptions
6. Invoices
7. Deal Health
8. Reports
9. Product

Rules:

- Current module is clearly active.
- Navigation state must not be ambiguous.
- Mobile navigation may collapse into a menu.
- Do not create a different navigation design per screen.

---

# 4. Shared Application State Expectations

The frontend should model a connected deal lifecycle.

At minimum, state must support:

```text
User
Customer
Customer Tier
Products
Quote
Quote Lines
Line Discounts
Allowed Discount Limits
Margin
Risk Evaluation
Approval Requirement
Approval Status
Inventory Eligibility
Upsell Suggestions
Unsaved Changes
```

A quotation edit must trigger recalculation of relevant derived values.

Example:

```text
Change service discount
        ↓
Recalculate line violation
        ↓
Recalculate weighted/blended risk
        ↓
Update approval requirement
        ↓
Update UI immediately
```

---

# Screen 1 — Login / Sign Up

## Route

`/login`

## Purpose

Authenticate users and route them into the correct product experience.

Supported roles conceptually include:

- Sales Representative
- Sales Manager / Approver
- Finance / Operations
- Customer Portal User
- Admin
- Management

For this first frontend flow, internal users enter the internal workspace while customers enter the restricted customer portal.

---

## Layout

Keep this screen focused and uncluttered.

### Brand

Display:

**DealFlow360**

Optional supporting line:

> Build the deal. DealFlow360 decides what happens next.

### Authentication switch

Provide:

- Log In
- Sign Up

Use a clear tab/segmented interaction with an obvious active state.

---

## Login form

Fields:

- Email
- Password

Actions:

- Log In
- Forgot Password?

Validation:

- Required email
- Valid email format
- Required password
- Enter submits form
- Inline error feedback
- Loading state during authentication

---

## Sign Up form

Suggested fields:

- Full Name
- Work Email
- Password
- Confirm Password
- Organization / Company
- Account type if needed

Keep the sign-up flow simple; do not overcrowd Screen 1.

---

## Authentication routing

```text
Successful Login
      ↓
Identify Role
      ├── Internal User → /dashboard
      └── Customer → /portal (customer workflow)
```

The customer portal is outside Screens 1–8, but the routing boundary should already be respected.

---

# Screen 2 — Sales Dashboard

## Route

`/dashboard`

## Purpose

Give internal users a fast operational view of deals requiring attention.

This is not a generic analytics dashboard. It should answer:

- What needs approval?
- How many deals are active?
- Which deals are risky?
- What changed recently?
- What should I do next?

---

## Header

Use persistent internal navigation.

Active item:

**Dashboard**

---

## Page heading

### Title

**Sales Dashboard**

### Supporting copy

Example:

> Monitor active deals, approvals, and operational risk.

---

## Priority metrics

Use interactive Neobrutalist metric cards.

### Pending Approvals

Show count.

Click → `/approvals`

### Open Quotations

Show count.

Click → `/quotations`

### At-Risk Deals

Show count.

Click → `/deal-health`

Do not use these as dead statistics. If displayed as cards, they must be actionable.

---

## Primary actions

### + New Quotation

Primary CTA.

Route:

`/quotations/new`

### View Approvals

Secondary CTA.

Route:

`/approvals`

---

## Recent Activity

Show meaningful state transitions, for example:

- Quote Q-1042 submitted for approval
- Acme Corp quotation approved by Sales Manager
- Service discount changed from 10% to 18%
- East Depot stock allocation updated
- Customer negotiation requires re-evaluation

Activity should demonstrate that the system is reacting to events.

Each item may link to its relevant record.

---

## Optional dashboard intelligence

Do not overload the first dashboard, but a compact alert area may show:

- High-risk quote
- Approval waiting too long
- Inventory shortage
- Recent negotiation

This should point to the appropriate module.

---

## Screen 2 key interactions

```text
Open Quotations → /quotations
Pending Approvals → /approvals
At-Risk Deals → /deal-health
+ New Quotation → /quotations/new
```

---

# Screen 3 — Quotations List

## Route

`/quotations`

## Purpose

Display quotations as a living sales pipeline.

Each quote should expose enough information to understand its current state and should open the detail view.

---

## Header

Persistent navigation.

Active item:

**Quotations**

---

## Page heading

### Title

**Quotations**

### Supporting text

> Track quotations as they move through evaluation, approval, negotiation, and confirmation.

---

## Primary layout: Kanban pipeline

Suggested stages:

1. Draft
2. Pending Approval
3. Approved
4. Negotiation
5. Confirmed

These are workflow states, not merely visual categories.

Example:

```text
Draft
  → Pending Approval
  → Approved
  → Negotiation
  → Confirmed
```

A negotiation can later change terms and trigger re-evaluation/re-approval.

---

## Quotation cards

Each card should show:

- Quote ID
- Customer name
- Total value
- Current status
- Optional risk indicator

Example:

**Q-1042 · Acme Corp**  
$12,400 · High Risk

Do not overcrowd cards.

---

## Card interaction

Every card is clickable.

Route:

`/quotations/:id`

Example:

`/quotations/Q-1042`

This opens Screen 4.

---

## Primary action

### + New Quotation

Route:

`/quotations/new`

The new quotation flow must ultimately create real frontend state so it appears in the list.

---

## Alternate Table View

Provide a view toggle:

- Kanban
- Table

Suggested table fields:

- Quote ID
- Customer
- Value
- Risk
- Approval Status
- Last Updated

Rows must also open the quotation detail.

Persist view preference locally if practical.

---

## Drag-and-drop

Optional.

Do not allow arbitrary visual status movement if it violates business rules.

For example, a user should not be able to drag a high-risk quote directly from Draft to Confirmed and bypass the approval engine.

If drag-and-drop is implemented, it must invoke valid state transitions.

---

# Screen 4 — Quotation Detail

## Route

`/quotations/:id`

Example:

`/quotations/Q-1042`

## Purpose

This is the most important screen in the first group.

It is where the user should feel that DealFlow360 is actively governing the deal.

The screen must combine:

- Quote data
- Discount governance
- Risk feedback
- Product line items
- Upsell opportunities
- Approval decision readiness

Do not make this just a form with a Save button.

---

## Entry and navigation

Opened by clicking a quotation card or table row.

Provide:

**← Back to Quotations**

Behavior:

- Return to `/quotations`
- Preserve list view/filter state where feasible

---

## Header

Example:

**Quotation Detail: Q-1042**

Secondary:

**Acme Corp**

Display a clear quote status badge.

---

## Customer and pricing context

Show:

- Customer
- Customer tier
- Price list

Customer tier matters because discount policy may depend on customer tier and product category.

---

# Product Line Items

Display a structured table.

Recommended columns:

| Product | Qty | Price | Discount | Allowed | Margin / Status |
|---|---:|---:|---:|---:|---|

Example:

| Product | Qty | Price | Discount | Allowed | Status |
|---|---:|---:|---:|---:|---|
| Laptop Pro 14 | 2 | $1,200 | 12% | 15% | OK |
| Setup Service | 1 | $450 | 18% | 10% | 8 pts OVER |
| Extended Warranty | 1 | $180 | 10% | 15% | OK |

---

# Real-Time Discount Governance

This behavior is mandatory.

When a user changes a discount:

1. Determine the allowed discount using applicable policy.
2. Compare actual discount against allowed limit.
3. Calculate overage:

```text
overage = max(0, actual_discount - allowed_discount)
```

4. Update line status immediately.
5. Recalculate quote-level risk.
6. Update approval requirement immediately.

Do not wait until Submit.

---

## Important business example

A customer tier can allow one ceiling while a product category applies a stricter rule.

Example:

```text
Gold customer general ceiling: 15%

Hardware ceiling: 15%
Services ceiling: 10%

Laptop discount: 12% → OK
Setup Service discount: 18% → 8 points over limit
```

The quote can require approval because of the service violation even if the customer is Gold.

---

# Blended Risk

The frontend should expose quote-level risk, not only individual line errors.

Conceptually:

```text
Line Violations
      +
Revenue Weighting
      ↓
Blended Risk
      ↓
Approval Requirement
```

The exact scoring formula is an application/business-engine concern, but the UI should clearly display engine output.

Suggested compact Deal Guardian panel:

```text
DEAL GUARDIAN

Discount Risk      HIGH
Margin             18.4%
Approval           Manager + Finance
Inventory          Checking
Overall Status     Attention Required
```

This should update as quote data changes.

---

## Approval requirement feedback

Examples:

### Safe

> Within configured policy. No additional approval required.

### Approval required

> Approval required: service discount exceeds its permitted limit by 8 percentage points.

Do not simply show “Error”.

Explain:

- What changed
- Why it matters
- What happens next

---

# Upsell and Cross-Sell Suggestions

Show recommendations based on product/deal context.

Example cards:

- Wireless Mouse — margin +$18
- Docking Station — promotion available
- Care Plan 2yr — margin +$46

Each card supports:

- Add to Quote
- View details
- Dismiss

When added:

```text
Add Product
    ↓
Quote Lines Update
    ↓
Totals Recalculate
    ↓
Margin Recalculate
    ↓
Risk Recalculate if relevant
```

---

# Save Draft

Secondary action.

Behavior:

- Persist current quote state
- Keep quote in Draft when applicable
- Show success feedback
- Track unsaved changes before leaving

---

# Submit for Approval

Primary action.

This must not be a decorative button.

Behavior:

```text
Click Submit
      ↓
Validate Required Data
      ↓
Run Latest Deal Evaluation
      ↓
Approval Required?
   ├── Yes → Create/Update Approval Request
   └── No → Continue to next valid business state
```

For a quote requiring approval:

- Update status to `Pending Approval`
- Create approval workflow state
- Make it visible on Approvals List
- Add activity/audit event

Recommended success route:

`/approvals`

or return to `/quotations` with updated status.

---

## Unsaved changes

If a user edits:

- discount
- quantity
- product
- customer

and attempts to leave:

Show a confirmation dialog if changes are unsaved.

---

# Screens 1–4 Connected Flow

```text
1. LOGIN
      |
      | Internal authentication
      v
2. DASHBOARD
      |
      | Open Quotations
      v
3. QUOTATIONS LIST
      |
      | Click quote
      v
4. QUOTATION DETAIL
      |
      | Edit products / discounts
      v
DETERMINISTIC DEAL EVALUATION
      |
      ├── Safe → Next valid workflow state
      |
      └── Risky → Pending Approval
                     |
                     v
                 /approvals
```

---

# Required Routes

```text
/login
/dashboard
/quotations
/quotations/new
/quotations/:id
```

---

# Implementation Contract

The frontend should expose these conceptual outputs from the business layer:

```typescript
type DealEvaluation = {
  subtotal: number;
  discountAmount: number;
  total: number;
  marginPercent: number;

  risk: {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };

  approval: {
    required: boolean;
    steps: string[];
  };

  violations: {
    lineId: string;
    actualDiscount: number;
    allowedDiscount: number;
    overage: number;
    reason: string;
  }[];
};
```

The UI may initially use mock data, but its component structure should anticipate real engine responses.

---

# Completion Checklist

## Screen 1

- [ ] Login validation works
- [ ] Sign Up mode works
- [ ] Internal user routes to dashboard
- [ ] Customer routing is isolated conceptually
- [ ] Loading/error states exist

## Screen 2

- [ ] Dashboard navigation is active
- [ ] Metrics are actionable
- [ ] Primary CTAs navigate correctly
- [ ] Recent activity reflects workflow events

## Screen 3

- [ ] Quotations navigation is active
- [ ] Pipeline statuses are meaningful
- [ ] Every card/row opens detail
- [ ] Kanban/Table toggle works
- [ ] New quote CTA works

## Screen 4

- [ ] Visible Back button
- [ ] Product line table works
- [ ] Discounts validate in real time
- [ ] Allowed limits are shown
- [ ] Violations explain the reason
- [ ] Blended risk is visible
- [ ] Approval requirement updates dynamically
- [ ] Upsells are interactive
- [ ] Save Draft works
- [ ] Submit triggers a valid workflow transition

## Overall

- [ ] Neobrutalist design is consistent
- [ ] No isolated static screens
- [ ] State changes propagate between screens
- [ ] Loading/empty/error states exist
- [ ] Responsive layout works
- [ ] Accessibility and keyboard interaction are considered
