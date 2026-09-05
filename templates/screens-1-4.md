# DealFlow360 — Frontend Specification (Screens 1–4)

## Purpose

This document describes the first four screens of the **DealFlow360 end-to-end product flow**, from authentication through quotation creation and approval submission.

The frontend must follow the provided navigation and ensure that every screen is properly connected. The visual direction should use **Neobrutalism**, not a generic dashboard style.

---

# Global Design & Interaction Rules

## Visual Style: Neobrutalism

Use a clean, modern Neobrutalist UI with:

- Bold solid borders (typically `2px–3px`)
- Hard offset box shadows rather than soft/glowing shadows
- High contrast between surfaces
- Strong, confident typography
- Rounded corners used consistently, but avoid excessive pill-shaped UI
- Solid accent colors
- Clear hover and pressed states
- Minimal gradients; prefer flat colors
- Spacious layouts with strong visual hierarchy

### Suggested visual language

- Background: light neutral/off-white
- Primary accent: strong blue
- Secondary accent colors: yellow, orange, green, or red for status/feedback
- Cards: solid light surfaces with dark borders
- Shadows: hard directional shadows such as `4px 4px 0 #111`
- Buttons: bordered, high contrast, slightly translate on active/click
- Inputs: clear rectangular fields with visible borders

Do **not** make the UI look overly corporate, glassmorphic, overly rounded, or dependent on subtle grey borders.

---

# Global Navigation

The internal application navigation should be persistent after login.

Primary navigation:

1. Dashboard
2. Quotations
3. Approvals
4. Fulfillment
5. Subscriptions
6. Invoices
7. Deal Health
8. Reports
9. Product

## Navigation behavior

- The currently active module must be visually highlighted.
- Clicking a navigation item should navigate to its respective module.
- Navigation should remain consistent across internal screens.
- Active state should be obvious through background contrast and/or offset styling.
- Hover states should provide immediate feedback.
- Page transitions should feel responsive and intentional.

For the first four screens specifically:

- Login → Dashboard after successful internal login
- Dashboard → Quotations when clicking the Quotations navigation item
- Dashboard → Quotation List when clicking “Open Quotations” or equivalent CTA
- Quotation List → Quotation Detail when clicking any quotation card/row
- Quotation Detail → Quotation List using a visible Back button
- Navigation should always allow moving back to Dashboard or another module

---

# Screen 1 — Login / Sign Up

## Route

`/login`

## Purpose

This is the entry point into DealFlow360. It allows users to authenticate or create an account.

The screen supports both:

- Internal users → Sales Dashboard
- Customers → Customer Portal (outside the scope of these first four screens)

## Layout

The page should be simple and focused, with the authentication form as the primary visual element.

### Header / Brand

Display:

**DealFlow360**

The brand should be prominent and use the same Neobrutalist styling language as the rest of the application.

### Authentication mode switch

Provide two clear options:

- Log In
- Sign Up

These should behave as tabs or a segmented control.

Requirements:

- Active option must be visually obvious.
- Switching between modes should update the form smoothly.
- Avoid a full page reload.
- Use a subtle animation or transition.

## Login Form

Fields:

- Email
- Password

Actions:

- Log In
- Forgot Password?

### Login validation

- Email is required.
- Email format should be validated.
- Password is required.
- Validation messages should appear close to the relevant input.
- Invalid inputs should use a strong visual error state.

## Sign Up Form

Switching to Sign Up should display fields appropriate for account creation.

Suggested fields:

- Full Name
- Email
- Password
- Confirm Password
- Account Type / Company selector if required

## Login Flow

When authentication succeeds:

### Internal user

Navigate to:

`/dashboard`

### Customer

Navigate to the customer quotation portal.

## Interaction requirements

- Enter key should submit the form.
- Buttons must have loading states.
- Disable duplicate submissions while authentication is processing.
- Show clear success/error feedback.
- Inputs should have visible focus states.

## Neobrutalist design notes

- Form container should have a strong dark border and hard shadow.
- Primary CTA should be a bold blue block button.
- Active authentication tab should have high contrast.
- Avoid excessive empty decoration.
- Keep the screen visually welcoming but product-focused.

---

# Screen 2 — Sales Dashboard / Home

## Route

`/dashboard`

## Purpose

The dashboard gives internal users a quick overview of the sales pipeline and provides shortcuts to important workflows.

## Header

Use the persistent application navigation.

Brand on the left:

**DealFlow360**

Navigation items:

- Dashboard
- Quotations
- Approvals
- Fulfillment
- Subscriptions
- Invoices
- Deal Health
- Reports
- Product

The Dashboard item must be active on this screen.

## Page Heading

Title:

**Sales Dashboard**

Supporting text:

A concise description such as:

“Overview of your active deals, approvals, and recent activity.”

## Summary Metrics

Display three prominent summary cards:

### 1. Pending Approvals

Example:

**4**

Supporting label:

“quotations waiting for approval”

### 2. Open Quotations

Example:

**12**

Supporting label:

“active deals”

### 3. At-Risk Deals

Example:

**3**

Supporting label:

“flagged by Deal Health”

## Metric card behavior

- Cards should be clickable when relevant.
- Clicking Pending Approvals should navigate to `/approvals`.
- Clicking Open Quotations should navigate to `/quotations`.
- Clicking At-Risk Deals should navigate to `/deal-health`.
- Use hover movement and hard shadow changes for interaction feedback.

## Primary Actions

Provide:

### + New Quotation

Primary CTA.

Navigation:

`/quotations/new`

### View Approvals

Secondary CTA.

Navigation:

`/approvals`

## Recent Activity

Display a timeline or activity feed containing events such as:

- Acme Corp quotation approved by Finance
- Beta Industries requested a discount
- East Depot stock updated for Order #2291

Each activity item may include:

- Activity type
- Short description
- Timestamp
- Optional status marker

## Interaction requirements

- Metric cards should be interactive.
- Recent activity can link to the relevant record where applicable.
- Dashboard should be responsive.
- Loading states should use skeletons matching the Neobrutalist visual style.
- Empty states should provide helpful next actions.

## Visual hierarchy

Prioritize:

1. Key metrics
2. Primary actions
3. Recent activity

Do not overcrowd the dashboard with unnecessary charts.

---

# Screen 3 — Quotations List

## Route

`/quotations`

## Purpose

This screen displays all quotations and allows users to quickly understand the current quotation pipeline.

Each quotation should be represented as a clickable item.

## Header

Use the same persistent application navigation.

The **Quotations** navigation item must be active.

## Page Heading

Title:

**Quotations**

Supporting text:

“Manage all quotations and track their progress through the sales pipeline.”

## Primary View

Use a Kanban-style pipeline as the primary layout.

Columns:

1. Draft
2. Pending Approval
3. Approved
4. Negotiation
5. Confirmed

Each column should be visually distinct while remaining consistent with the Neobrutalist design system.

## Example quotation cards

### Draft

- Acme Corp — $12,400
- Delta LLC — $3,200

### Pending Approval

- Beta Industries — $28,900

### Approved

- Nova Retail — $9,750

### Negotiation

- Zenith Co — $15,300

### Confirmed

- Orion Ltd — $41,000

## Quotation Card Requirements

Each card should contain:

- Customer/company name
- Total quotation value
- Optional quotation ID
- Status indicator

Recommended optional additions:

- Last updated time
- Assigned sales representative
- Risk indicator

## Card interaction

Every quotation card must be clickable.

Clicking a card navigates to:

`/quotations/:id`

Example:

`/quotations/Q-1042`

This navigation is essential because Screen 4 is the detail view of the selected quotation.

## Actions

### + New Quotation

Primary CTA.

Navigation:

`/quotations/new`

### Switch to Table View

Secondary action.

This can toggle between:

- Kanban View
- Table View

The selected view may persist locally.

## Optional interactions

- Drag-and-drop between status columns can be added if status transitions are permitted.
- If implemented, status changes must require appropriate validation.
- Cards should animate subtly while dragging.

## Table View

The alternate table view can include:

- Quote ID
- Customer
- Amount
- Status
- Created Date
- Last Updated
- Owner

Rows must also be clickable and open the quotation detail page.

## Empty states

If a column contains no quotations:

- Show a lightweight empty state.
- Do not leave the section looking broken.
- Optionally provide “Create quotation” as an action.

## Neobrutalist design notes

- Kanban columns should use bordered containers.
- Cards should have hard shadows and clear hover elevation.
- Avoid overly subtle status labels.
- Use status colors consistently.
- Ensure cards remain readable and not visually cluttered.

---

# Screen 4 — Quotation Detail

## Route

`/quotations/:id`

Example:

`/quotations/Q-1042`

## Entry behavior

This screen is opened when a user clicks a quotation from the Quotations List.

A clear visible Back button must be provided.

### Back navigation

The Back button should:

- Return to `/quotations`
- Preserve the previously selected view where possible
- Maintain filters/scroll position if feasible

Do not rely only on the browser back button.

## Header

Persistent application navigation remains visible.

The **Quotations** module remains active.

## Page Heading

Example:

**Quotation Detail: Q-1042**

Customer name can be shown beside or below the quotation ID:

**Acme Corp**

Supporting description:

“Review products, discounts, limits, and recommended upsell opportunities.”

## Customer Information

Display editable or viewable fields:

- Customer
- Price List

These fields should be clearly grouped.

## Product Line Items

Display quotation products in a structured table.

Columns:

| Field | Description |
|---|---|
| Product | Product/service name |
| Qty | Quantity |
| Price | Unit or line price |
| Discount | Applied discount |
| Limit | Maximum permitted discount |
| Status | Validation result |

Example products:

- Laptop Pro 14
- Onsite Setup Service
- Extended Warranty

## Discount Validation

This is an important business rule.

Discounts must be checked against each product's allowed limit.

Example:

- Laptop Pro 14: 12% discount, 15% limit → OK
- Onsite Setup Service: 18% discount, 10% limit → Over limit
- Extended Warranty: 10% discount, 15% limit → OK

Validation should happen immediately when a discount value changes.

Do not wait until the user clicks Submit.

## Validation Feedback

Use strong, clear visual feedback:

- Valid → positive status indicator
- Warning/Over limit → warning or error indicator

If a discount exceeds its allowed limit:

- Clearly highlight the affected row.
- Explain why it is invalid.
- Prevent submission if required by the business workflow.

## Upsell and Cross-Sell Suggestions

Display recommendation cards below the quotation items.

Example suggestions:

### Wireless Mouse

Margin: +$18

### Docking Station

Promotion: 12% off

### Care Plan 2yr

Margin: +$46

## Recommendation behavior

Each recommendation card should be interactive.

Suggested interactions:

- Add to quotation
- View details
- Dismiss suggestion

When added:

- The product should appear in the quotation line items.
- Totals should update.
- Relevant validation should rerun.
- Provide visible success feedback.

## Actions

### Save Draft

Secondary action.

Behavior:

- Save current changes.
- Keep quotation in Draft state if applicable.
- Show confirmation feedback.

### Submit for Approval

Primary action.

Behavior:

1. Validate all required fields.
2. Validate discount limits.
3. Prevent submission if blocking validation errors exist.
4. Change quotation status to `Pending Approval`.
5. Navigate appropriately or show a confirmation state.

Suggested destination after success:

`/quotations`

or

`/approvals`

depending on the desired workflow.

## Additional recommended UI elements

Include:

- Back to Quotations button
- Quotation status badge
- Last saved indicator
- Unsaved changes warning
- Loading state during save/submit
- Confirmation toast after successful actions

---

# Required Screen-to-Screen Flow

The first four screens must be connected exactly as a functional user flow.

```text
Screen 1: Login / Sign Up
        |
        | Internal user login
        v
Screen 2: Sales Dashboard
        |
        | Click Quotations / Open Quotations
        v
Screen 3: Quotations List
        |
        | Click quotation card or table row
        v
Screen 4: Quotation Detail
        |
        | Back to Quotations
        v
Screen 3: Quotations List
```

Additional navigation:

```text
Dashboard
 ├── + New Quotation → /quotations/new
 ├── Open Quotations → /quotations
 ├── Pending Approvals → /approvals
 └── At-Risk Deals → /deal-health

Quotations List
 ├── Quotation Card → /quotations/:id
 └── + New Quotation → /quotations/new

Quotation Detail
 ├── Back → /quotations
 ├── Save Draft → persist quotation
 └── Submit for Approval → approval workflow
```

---

# Functional Implementation Requirements

## Routing

Implement proper client-side routing.

Recommended route structure:

```text
/login
/dashboard
/quotations
/quotations/new
/quotations/:id
```

## State Management

For the prototype, maintain realistic state for:

- Logged-in user
- Quotations
- Quotation status
- Line items
- Discounts
- Validation errors
- Unsaved changes

State updates should immediately reflect across screens where appropriate.

For example:

- A newly created quotation appears in the Quotations List.
- Editing a quotation updates its detail and list representation.
- Submitting for approval changes its pipeline status.

## Animations

Animations should improve usability, not distract.

Recommended:

- Fast page transitions
- Button press animation
- Card hover translation
- Modal entrance animation
- Status transition animation
- Smooth tab switching

Avoid:

- Excessive floating effects
- Slow transitions
- Continuous decorative animation
- Animation that delays user interaction

---

# Responsiveness

The screens must work across:

- Desktop
- Tablet
- Mobile

On smaller screens:

- Navigation may collapse into a menu.
- Kanban columns should scroll horizontally rather than becoming unreadably narrow.
- Product tables should become horizontally scrollable or use responsive cards.
- Primary actions should remain easily accessible.

---

# Final Frontend Quality Checklist

Before considering these four screens complete, verify:

- [ ] Neobrutalism is consistently applied.
- [ ] Login successfully navigates internal users to Dashboard.
- [ ] Persistent navigation works across internal screens.
- [ ] Active navigation state is correct.
- [ ] Dashboard metrics and CTAs navigate correctly.
- [ ] Quotations List displays pipeline stages.
- [ ] Every quotation item is clickable.
- [ ] Clicking a quotation opens the correct detail page.
- [ ] Quotation Detail has a visible Back button.
- [ ] Back button returns to Quotations List.
- [ ] Discount validation happens in real time.
- [ ] Invalid discounts are clearly communicated.
- [ ] Upsell recommendations are interactive.
- [ ] Save Draft works.
- [ ] Submit for Approval validates before submission.
- [ ] Buttons have hover, active, disabled, and loading states.
- [ ] Layout has proper spacing and does not feel cluttered.
- [ ] Desktop and mobile layouts are usable.
- [ ] No screen is visually disconnected from the overall product flow.

---

## Core Instruction for Implementation

Build these screens as a **connected product experience**, not as four isolated static pages. Every CTA, navigation item, quotation card, row, and back action described above should have meaningful navigation or interaction behavior. Maintain a consistent **Neobrutalist design system**, strong spacing, clear hierarchy, and responsive layouts throughout.
