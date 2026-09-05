# DealFlow360 — Updated Frontend Build Specification
## Screens 5–8: Approvals → Approval Detail → Fulfillment → Fulfillment Detail

> **Source-of-truth alignment:** These screens continue the DealFlow360 decision workflow. Approval and fulfillment are not separate admin pages—they are downstream consequences of deterministic deal evaluation.

The frontend must make this chain visible:

```text
Quote
  ↓
Risk Evaluation
  ↓
Approval Routing
  ↓
Fulfillment Allocation
  ↓
Billing (next module)
```

---

# 1. Continuity Requirements

Screens 5–8 must be a seamless continuation of Screens 1–4.

Keep exactly the same:

- Neobrutalist visual language
- Persistent top navigation
- Typography scale
- Border thickness
- Hard shadows
- Button system
- Table system
- Status badges
- Spacing rhythm
- Hover/active/loading states
- Responsive behavior

Do not redesign the application when entering the operations workflow.

---

# 2. Persistent Navigation

Internal navigation:

1. Dashboard
2. Quotations
3. Approvals
4. Fulfillment
5. Subscriptions
6. Invoices
7. Deal Health
8. Reports
9. Product

Active states:

- Screen 5: Approvals
- Screen 6: Approvals
- Screen 7: Fulfillment
- Screen 8: Fulfillment

---

# 3. Core Workflow Rules

## Approval is engine-driven

Approval routing must originate from deal evaluation.

Examples of inputs:

- Customer tier
- Product category policy
- Discount violations
- Margin impact
- Blended risk
- Negotiated changes

The frontend should display the result; users should not manually invent approval rules.

---

## Fulfillment is inventory-driven

Warehouse allocation should evaluate:

- Available stock across warehouses
- Shipment fragmentation
- Shipping/operational cost
- Backorder quantity

Conceptually:

```text
Evaluate Inventory
      ↓
Generate Allocation Plan
      ↓
Minimize unnecessary splits
      ↓
Allocate Available Stock
      ↓
Backorder remainder if needed
```

---

## Historical integrity

When a quote changes after approval:

- Re-evaluate the quote.
- Do not silently mutate historical approval records.
- If policy thresholds are exceeded, create/restart the relevant approval cycle.

This matters especially for future customer negotiation screens.

---

# Screen 5 — Approvals List

## Route

`/approvals`

## Purpose

Provide a work queue for approvers and managers.

The screen should answer:

- What requires my attention?
- Why is it risky?
- Where is it in the approval process?
- Who owns the next action?

---

## Header

Persistent navigation.

Active item:

**Approvals**

---

## Page heading

### Title

**Approvals**

### Supporting text

> Review quotes requiring approval and track their progress through the decision workflow.

---

# Approval Summary / Filters

Provide interactive status filters.

Suggested:

- Pending
- Returned
- Approved

These can display counts.

Additional filters:

- Risk: Low / Medium / High / Critical
- Stage: Manager / Finance
- Assigned To

Do not overload the top of the page. Prioritize Pending.

---

# Approval Table

Recommended columns:

| Quote | Customer | Blended Risk | Current Stage | Assigned To |
|---|---|---|---|---|

Example:

| Quote | Customer | Risk | Stage | Assigned To |
|---|---|---|---|---|
| Q-1042 | Acme Corp | HIGH | Sales Manager | M. Shah |
| Q-1039 | Beta Industries | MEDIUM | Finance | R. Iyer |
| Q-1035 | Nova Retail | LOW | Auto-approved | — |

---

## Risk indicators

Always combine color + text.

- LOW
- MEDIUM
- HIGH
- CRITICAL

Risk should be derived from the evaluation engine.

Do not allow the frontend to arbitrarily label a deal as High.

---

## Row interaction

Every row opens:

`/approvals/:quotationId`

Example:

`/approvals/Q-1042`

This opens Screen 6.

---

## Empty state

Example:

> No approvals require attention right now.

Provide:

- Reset filters if filtered
- Link back to Quotations if useful

---

## Loading state

Use skeleton rows matching the table structure.

Avoid layout jumping.

---

# Screen 6 — Approval Detail

## Route

`/approvals/:quotationId`

Example:

`/approvals/Q-1042`

## Purpose

Give an approver enough context to make a defensible decision.

The screen must explain:

- Why approval is required
- Which quote lines violate policy
- What the blended risk means
- Current workflow stage
- What happened previously
- What decision actions are available

This screen should prioritize explanation and traceability.

---

## Entry and Back behavior

Provide:

**← Back to Approvals**

Return to:

`/approvals`

Preserve filters/list context where practical.

---

## Header

Example:

**Approval Detail: Q-1042**

Secondary:

**Acme Corp**

Show current status and current approval stage.

---

# Key decision badges

Show compact, high-importance information.

Examples:

- Blended Risk: HIGH
- Customer Tier: Gold
- Current Stage: Sales Manager

Do not turn this into a dashboard of too many cards.

---

# Why This Quote Was Flagged

This is the primary section.

Recommended table:

| Line | Actual Discount | Allowed | Result |
|---|---:|---:|---|

Example:

| Line | Actual | Allowed | Result |
|---|---:|---:|---|
| Laptop (Hardware) | 12% | 15% | OK |
| Setup Service | 18% | 10% | 8 pts OVER |

For violations, clearly explain:

> Setup Service exceeds its configured discount ceiling by 8 percentage points.

---

# Blended Risk Explanation

The UI should communicate that risk is not necessarily only the worst line.

Conceptually:

```text
Customer Tier Policy
        +
Category Discount Limits
        +
Line-Level Violations
        +
Revenue Weighting
        ↓
Blended Risk Score
```

Display an explanatory banner such as:

> This quote requires approval because its combined policy violations and deal impact exceed the configured risk threshold.

The exact score formula belongs to the business engine.

---

# Approval Workflow Timeline

Show progression:

```text
Submitted → Sales Manager → Finance → Confirmed
```

Each stage supports:

- Completed
- Current
- Pending
- Returned
- Rejected

Use text and visual state, not color alone.

On small screens, transform the timeline into a vertical layout.

---

# Audit Trail

Provide a chronological record.

Recommended fields:

| User | Action | Timestamp | Note |
|---|---|---|---|

Example actions:

- Submitted
- Returned for Revision
- Resubmitted
- Approved
- Rejected

Historical records should remain visible after state changes.

---

# Decision Actions

## Approve

Behavior:

```text
Approve
   ↓
Record Approver + Timestamp
   ↓
Advance Workflow Stage
   ↓
More stages required?
   ├── Yes → Assign next approver
   └── No → Mark approved and release downstream
```

When final approval completes:

- Update approval status
- Add audit event
- Make order eligible for fulfillment
- Update relevant dashboard/list state

Use confirmation for consequential actions.

---

## Return for Revision

Behavior:

- Require a revision reason
- Return quote to the appropriate owner
- Change state to Returned / Needs Revision
- Preserve audit history
- Prevent silent progression

Example modal:

- Reason for revision (required)
- Additional comments (optional)
- Cancel
- Return Quote

---

## Reject

Behavior:

- Require confirmation
- Require rejection reason
- Record user and timestamp
- Preserve audit history
- Stop downstream progression

This is destructive and should be visually distinct but not oversized.

---

# Re-approval Loop

The frontend state model must support this critical loop:

```text
Approved Quote
      ↓
Terms Change / Negotiation
      ↓
Full Re-evaluation
      ↓
Policy threshold exceeded?
   ├── No → Continue
   └── Yes → New Approval Cycle
```

Do not overwrite an old approval to fake this loop.

---

# Screen 7 — Fulfillment & Stock List

## Route

`/fulfillment`

## Purpose

Give operations users visibility into inventory and orders ready for allocation.

This is where the system proves:

> “Don't promise stock we don't have.”

---

## Header

Persistent navigation.

Active item:

**Fulfillment**

---

## Page heading

### Title

**Fulfillment & Stock**

### Supporting text

> Monitor inventory availability and allocate confirmed orders across warehouses.

---

# Section A — Warehouse Stock

Display:

| Warehouse | Product | In Stock | Reserved | Available |
|---|---|---:|---:|---:|

Core relationship:

```text
Available = In Stock - Reserved
```

Example:

| Warehouse | Product | In Stock | Reserved | Available |
|---|---|---:|---:|---:|
| Main Warehouse | Laptop Pro 14 | 40 | 18 | 22 |
| East Depot | Laptop Pro 14 | 10 | 6 | 4 |
| Main Warehouse | Docking Station | 65 | 12 | 53 |

---

## Stock warnings

If availability is low or insufficient:

- Show a warning label
- Explain the condition
- Do not rely only on color

Examples:

- Low Stock
- Insufficient for Full Order
- Backorder Required

---

# Section B — Orders Awaiting Fulfillment

Recommended columns:

| Order | Customer | Status | Allocation / Warehouse |
|---|---|---|---|

Example:

| Order | Customer | Status | Warehouse |
|---|---|---|---|
| Q-1042 | Acme Corp | Split Pending | Main + East Depot |
| Q-1030 | Zenith Co | Backorder | East Depot |

---

## Fulfillment statuses

Support meaningful states:

- Ready to Allocate
- Split Pending
- Partially Allocated
- Backorder
- Fulfilled

---

## Row interaction

Every order row opens:

`/fulfillment/:orderId`

Example:

`/fulfillment/Q-1042`

This opens Screen 8.

---

## Filters

Recommended:

- Warehouse
- Fulfillment Status
- Availability
- Backorders Only

Keep filter UI compact.

---

# Operational prioritization

Visually prioritize:

1. Backorders
2. Insufficient inventory
3. Split fulfillment
4. Ready orders

The goal is to help operations decide what needs action first.

---

# Screen 8 — Fulfillment Detail

## Route

`/fulfillment/:orderId`

Example:

`/fulfillment/Q-1042`

## Purpose

Review and confirm the warehouse allocation plan for an order.

The screen should clearly answer:

- Where is each quantity coming from?
- Can all quantity be fulfilled?
- How many shipments are needed?
- What is the operational cost?
- Is a split necessary?
- Is a backorder required?

---

## Entry and Back behavior

Provide:

**← Back to Fulfillment**

Return to:

`/fulfillment`

Preserve previous context where practical.

---

## Header

Example:

**Fulfillment Detail: Q-1042**

Supporting copy:

> Review the recommended warehouse allocation before confirming fulfillment.

Show current fulfillment status.

---

# Allocation Table

Recommended columns:

| Warehouse | Qty Allocated | Estimated Shipments | Operational / Shipping Cost |
|---|---:|---:|---:|

Example:

| Warehouse | Qty Allocated | Shipments | Cost |
|---|---:|---:|---:|
| Main Warehouse | 18 | 1 | $42 |
| East Depot | 6 | 1 | $29 |

Also show order quantity and allocation progress where useful.

---

# Suggested Allocation

Display an explanation card.

Example:

> Recommended split uses available stock across Main Warehouse and East Depot to fulfill the order while minimizing unnecessary shipment fragmentation.

The recommendation should conceptually consider:

- Available stock
- Number of warehouses used
- Shipment fragmentation
- Shipping cost
- Remaining backorder

---

# Accept Suggested Split

Primary action.

Behavior:

```text
Accept Plan
    ↓
Validate Latest Stock
    ↓
Reserve / Allocate Inventory
    ↓
Update Fulfillment Status
    ↓
Record Allocation
    ↓
Refresh Available Stock
```

Important:

Revalidate stock before final confirmation. Inventory could have changed since the page loaded.

---

# Manual Override

Secondary action.

Allows operations users to modify allocation.

Suggested editable structure:

- Quantity from each warehouse
- Shipment estimate
- Cost impact
- Override reason if required

---

## Allocation validation

### Quantity conservation

```text
Sum(allocated quantities) = order quantity
```

unless the system intentionally creates a partial fulfillment/backorder.

### Inventory constraint

```text
Allocated quantity <= currently available warehouse stock
```

### If invalid

- Highlight affected warehouse/input
- Explain exact reason
- Prevent confirmation

---

# Backorder handling

If total available stock is insufficient:

```text
Order Quantity
      >
Total Available Stock
      ↓
Allocate Available Quantity
      +
Create Backorder for Remainder
```

The UI must clearly distinguish:

- Allocated now
- Backordered
- Awaiting replenishment

Do not silently mark an incomplete allocation as fulfilled.

---

# Screen 5–8 Connected Workflow

```text
Quotation Detail
      |
      | Risk requires approval
      v
5. APPROVALS LIST
      |
      | Select approval request
      v
6. APPROVAL DETAIL
      |
      | Final approval
      v
7. FULFILLMENT & STOCK
      |
      | Select confirmed order
      v
8. FULFILLMENT DETAIL
      |
      | Confirm allocation
      v
Downstream Billing / Subscription Workflow
```

---

# State Propagation Requirements

## Approval changes

When approval is completed:

```text
Approval Detail
      ↓
Approval status updates
      ↓
Approvals List updates
      ↓
Quote state updates
      ↓
Order becomes eligible for fulfillment
      ↓
Fulfillment List updates
```

## Fulfillment changes

When allocation is confirmed:

```text
Fulfillment Detail
      ↓
Inventory reservation/update
      ↓
Available stock recalculates
      ↓
Fulfillment status updates
      ↓
Fulfillment List updates
```

Do not implement these screens as visually isolated local state demos.

---

# Required Routes

```text
/approvals
/approvals/:quotationId

/fulfillment
/fulfillment/:orderId
```

Combined first-eight route structure:

```text
/login
/dashboard
/quotations
/quotations/new
/quotations/:id
/approvals
/approvals/:quotationId
/fulfillment
/fulfillment/:orderId
```

---

# Suggested Shared Types

The frontend should anticipate connected backend contracts.

```typescript
type ApprovalRequest = {
  quoteId: string;
  status: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";
  currentStage: string;
  assignedTo?: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  history: ApprovalEvent[];
};

type FulfillmentPlan = {
  orderId: string;
  status: "READY" | "SPLIT_PENDING" | "PARTIAL" | "BACKORDER" | "FULFILLED";
  allocations: WarehouseAllocation[];
  backorderQuantity: number;
};

type WarehouseAllocation = {
  warehouseId: string;
  quantity: number;
  shipments: number;
  estimatedCost: number;
};
```

---

# Completion Checklist

## Screen 5 — Approvals List

- [ ] Approvals navigation is active
- [ ] Status filters work
- [ ] Risk filters work
- [ ] Table rows are clickable
- [ ] Risk text is visible
- [ ] Empty/loading states exist

## Screen 6 — Approval Detail

- [ ] Back button is visible
- [ ] Why flagged is explained clearly
- [ ] Line-level violations are shown
- [ ] Blended risk context is shown
- [ ] Workflow timeline works
- [ ] Audit trail is preserved
- [ ] Approve works
- [ ] Return for Revision requires reason
- [ ] Reject requires confirmation/reason
- [ ] Final approval releases downstream fulfillment eligibility
- [ ] Re-approval cycles can be represented

## Screen 7 — Fulfillment List

- [ ] Fulfillment navigation is active
- [ ] Stock availability is displayed
- [ ] Available stock is derived correctly
- [ ] Low stock/backorders are visible
- [ ] Orders are clickable
- [ ] Filters work

## Screen 8 — Fulfillment Detail

- [ ] Back button is visible
- [ ] Suggested allocation is explained
- [ ] Accept Suggested Split revalidates stock
- [ ] Manual Override works
- [ ] Allocation totals validate
- [ ] Warehouse availability validates
- [ ] Backorder state is explicit
- [ ] Confirmed allocation updates inventory state

## Overall

- [ ] Same Neobrutalist system as Screens 1–4
- [ ] No dead CTA/buttons
- [ ] State transitions propagate
- [ ] Deterministic business logic drives decisions
- [ ] Responsive layouts work
- [ ] Error/loading/empty states exist
- [ ] Historical audit information is preserved

---

# Core Implementation Instruction

Build Screens 5–8 as one connected operational sequence:

> **The deal becomes risky → the right people approve it → approved demand is checked against real inventory → the system proposes a valid allocation → operations confirms or overrides it.**

The frontend should make those decisions understandable and actionable. It must not merely display records.
