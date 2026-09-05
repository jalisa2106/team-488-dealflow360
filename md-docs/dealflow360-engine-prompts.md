# DealFlow360 — Engine Build Prompts (feed into Antigravity, one at a time)

General notes before you start:
- Paste these **one at a time**, in order. Don't move to the next until the current engine's example scenarios pass.
- Before the first prompt, paste your actual DB schema (or the relevant tables) once so Sonnet has real column/table names to map onto — otherwise it'll invent plausible-sounding ones that don't match your Docker schema.
- Each prompt embeds the "engine = pure function" boundary explicitly, since that's the easiest thing for a code-generating model to blur.

---

## Prompt 0 — Standing context (paste once, before Prompt 1)

```
We're building DealFlow360, a B2B quoting/deal-management system. I'm going to
give you one calculation engine at a time, in dependency order. For every
engine, follow this exact discipline:

1. First, write out 3-5 concrete worked examples in plain numbers (inputs →
   expected output) BEFORE writing any code. Show me these and wait for my
   confirmation before proceeding to code.
2. Implement the engine as a PURE function: it takes plain input data
   (numbers, objects, arrays) and returns plain output data. It must NEVER
   query the database, call another engine's internals, make a network call,
   call an AI model, or have any side effects. If the engine needs data (e.g.
   inventory levels), assume that data is already fetched and passed in as an
   argument — don't fetch it yourself.
3. After I confirm the pure function passes the worked examples as unit tests,
   wire it into a service-layer function that fetches real data from the
   repository, calls the engine, and persists/returns the result. The service
   layer is the ONLY layer allowed to touch the database or trigger side
   effects (audit logs, notifications).

Here is our schema: [PASTE YOUR SCHEMA / RELEVANT TABLES HERE]

Confirm you understand this discipline, then wait for the first engine spec.
```

---

## Prompt 1 — Pricing Resolution

```
ENGINE 1: Pricing Resolution

This is the foundation. Never trust a price sent from the client — recompute
server-side every time.

Inputs: product base_price, cost_price, quantity, tax percentage (optional).
Output: line subtotal (unit price × quantity, before discount), and a tax
amount as a SEPARATE displayed figure if we're using tax (never fold it
silently into "the price").

Rule: for our 36-hour scope, use a flat base_price per product — do NOT build
multi-tier price_list resolution unless I explicitly ask for it later.

Rule: the client may suggest a discount % and a quantity, but must NEVER
supply the unit price or final total — those are always recomputed from the
product record server-side.

Give me 3-5 worked examples first (e.g. "Product base_price $500, cost_price
$300, qty 4 → subtotal $2000"), wait for my confirmation, then implement as a
pure function, then wire into a service.
```

---

## Prompt 2 — Discount Engine

```
ENGINE 2: Discount Engine (depends on Pricing Resolution)

Question it answers: for a given quote line, is the requested discount
allowed, and if not, by how much does it exceed policy?

Two independent ceilings apply to every line:
1. Customer tier ceiling (Bronze/Silver/Gold) — a max discount % per tier.
2. Product category ceiling (e.g. Hardware vs Service) — a max discount %
   per category, independent of the customer.

Resolution rule: take the MORE RESTRICTIVE (smaller) of the two ceilings as
the effective ceiling for that line. Neither ceiling wins by default — always
compute both and take the min. Example from spec: Gold customer entitled to
15% generally, but Service category caps at 10% → the Service line is only
allowed 10%, not 15%.

Per-line steps:
1. Look up tier ceiling for that line's category.
2. Look up category ceiling independently.
3. allowed = min(tier ceiling, category ceiling).
4. overage = max(0, requested - allowed).
5. Record allowed, requested, overage, and WHICH rule (tier or category) was
   the binding constraint — we need this for the UI later.

Also return a quote-level boolean: "does any line have an overage at all"
(cheap pre-check before the more expensive risk-scoring pass).

Do NOT decide approval routing here. Do NOT touch margin. Do NOT touch
inventory. This engine only knows discount percentages and ceilings.

Give me 3-5 worked examples first (include the Gold/Service 15%-vs-10% case
above, plus at least one multi-line quote showing several small overages that
should each be recorded independently — do NOT collapse to "worst line
only"), wait for my confirmation, then implement as a pure function, then
wire into a service.
```

---

## Prompt 3 — Margin Calculation

```
ENGINE 3: Margin Calculation (depends on Pricing Resolution + Discount Engine)

Lock in these exact definitions — margin percent is always against REVENUE,
never against cost (dividing by cost gives "markup," a different number):

- line_revenue = unit_price × quantity, AFTER discount is applied.
- line_cost = cost_price × quantity (cost price is NEVER discounted).
- line_margin_amount = line_revenue - line_cost.
- line_margin_percent = line_margin_amount / line_revenue.
- quote_margin_amount = sum of all line_margin_amounts.
- quote_margin_percent = quote_margin_amount / quote_total_revenue.

This must run in the same "evaluate" pass as pricing + discount, not a
separate round trip — the evaluate endpoint should eventually do pricing →
discount → margin → risk → approval in one pass, one combined result object.
(We'll build risk/approval next; for now just implement margin and make sure
it slots into that same pass.)

Give me 3-5 worked examples first (include one where margin is deceptively
low despite a "compliant" discount, to sanity-check the revenue-vs-cost
distinction), wait for my confirmation, then implement as a pure function,
then wire into the service alongside pricing+discount.
```

---

## Prompt 4 — Risk Engine

```
ENGINE 4: Risk Engine (depends on Discount Engine + Margin Calculation)

This produces a blended risk score, a mapped risk level, and a human-readable
reasons list. Document whatever numeric weights/thresholds you pick — they're
our implementation choice, not mandated, but must stay consistent everywhere
(seed data, demo script, code).

Component 1 — blended discount-violation score:
Do NOT just sum raw overage amounts (a 5% overage on a $10 line and a 5%
overage on a $10,000 line are not equally risky). For each line: multiply its
overage PERCENTAGE by its share of total quote revenue, then sum across all
lines. This weights violations by dollar exposure.

Component 2 — margin risk:
If quote_margin_percent falls below a floor (use 15% unless I say otherwise),
add a fixed number of risk points, regardless of whether any discount rule
was technically violated.

Component 3 — inventory risk:
If fulfilling the quote requires splitting across more than one warehouse, or
there isn't enough total stock, add risk points. Assume the service layer
will pass in already-fetched inventory availability data — do NOT have this
engine query inventory itself.

Combine with simple additive weights (pick and document specific numbers,
e.g. "discount violation score contributes most; +10 pts if margin <15%; +15
pts if inventory needs 2+ warehouses; +25 pts if not fully fulfillable").

Map total score to four bands with cutoffs you pick and document (e.g. 0-9
Low, 10-19 Medium, 20-34 High, 35+ Critical) — keep these exact numbers
consistent across code, seed data, and demo script.

Return: numeric score, mapped level, and a reasons list — one entry per
contributing factor, each with severity + a plain-English message (e.g.
"Setup Service is 8 points above its permitted discount ceiling"). This
reasons list will later be fed to an AI explanation layer verbatim — it must
never need the AI to invent facts.

Give me 3-5 worked examples first, including one full multi-line quote that
exercises all three components at once, wait for my confirmation, then
implement as a pure function, then wire into the service.
```

---

## Prompt 5 — Approval Engine

```
ENGINE 5: Approval Engine (depends on Risk Engine)

Deliberately the simplest engine — resist adding complexity.

Core mapping:
- Low risk → no approval needed, straight to approved.
- Medium risk → Sales Manager approval required.
- High or Critical risk → Sales Manager approval, THEN Finance approval
  (sequential, not parallel — Finance is a backstop on deals the Manager
  already blessed).

Hard-violation-floor rule (on top of the score mapping): if ANY single line
violates its category discount ceiling by a nontrivial amount (pick and
document a threshold), force at least Manager approval even if the blended
score would have landed in "no approval needed." This closes the loophole
where one bad line gets diluted by many compliant lines in the blended
average.

Return: a boolean "approval_required," and if true, an ORDERED list of roles
that must approve (e.g. ["SALES_MANAGER"] or ["SALES_MANAGER", "FINANCE"]).
The engine itself never touches the database — the service layer turns this
list into actual approval-request rows.

Re-approval invariant (implement this now, we'll exercise it fully in the
Negotiation Engine later): once a quote is approved, if it's re-evaluated
after a material change and the NEW approval requirement is higher or
different from what was already approved, create a NEW approval request —
never mutate or overwrite the old approved record. Historical approval
records are immutable.

Give me 3-5 worked examples first (include the hard-violation-floor loophole
case explicitly — one huge violating line diluted by many clean lines), wait
for my confirmation, then implement as a pure function, then wire into the
service.
```

---

## Prompt 6 — Wire up the evaluate flow end-to-end

```
Now wire Pricing → Discount → Margin → Risk → Approval into a single
"evaluate quote" service function that:
1. Fetches all needed data via the repository (product prices/costs, tier
   ceilings, category ceilings, inventory availability).
2. Calls each pure engine in order, passing outputs forward as needed.
3. Returns one combined result object covering all five engines' outputs.
4. Persists whatever needs persisting (the quote's computed totals, any new
   approval request rows) in a single transaction if possible.

This should be callable both when a quote is first submitted and later when
it's re-evaluated after a negotiation (we'll use it again in Engine 9).

Walk me through the full pipeline with one worked example end-to-end (reuse
one of the earlier worked examples) before finalizing.
```

---

## Prompt 7 — Fulfillment / Warehouse Allocation Engine

```
ENGINE 7: Fulfillment / Warehouse Allocation Engine (independent of 2-5,
but risk engine peeks at its output)

Given a requested quantity of a product and stock scattered across
warehouses, decide how to split the order. Deterministic greedy heuristic,
not an optimization solver — that's a deliberate, defensible choice, not a
cop-out (be ready to say why: the objective is minimize shipment count/cost
subject to stock constraints, which doesn't need combinatorial optimization
at this scale).

Steps:
1. Find every warehouse with any stock of the product.
2. Sort by available quantity descending (largest first) — consolidates into
   fewest warehouses, minimizing shipment count.
3. Allocate greedily from the top: take as much as needed or as much as
   available, whichever is smaller; move to next warehouse if quantity
   remains; repeat.
4. Leftover unfulfilled quantity after exhausting all warehouses becomes an
   explicit backorder quantity — never silently under-fill.
5. Return: per-warehouse allocation, shipment count (distinct warehouses
   used), total shipping cost (flat cost per warehouse or per
   warehouse-shipment — tell me which our seed data supports), and backorder
   quantity if any.

Hard invariants — test these explicitly:
- Total allocated across all warehouses must NEVER exceed requested quantity.
- A single warehouse's allocation must NEVER exceed that warehouse's actual
  stock.
- Never trust a manual override's numbers from the client without
  re-validating against actual stock server-side.

Manual override: Operations users can reject the recommended split and enter
their own per-warehouse quantities. Validate the override against the same
two invariants above, and require a reason string that goes to the audit log
alongside before/after allocation.

Give me 3-5 worked examples first, INCLUDING an explicit "requested more than
total available stock" case (produces a backorder) and an explicit "manual
override that would exceed a warehouse's stock" case (must be rejected), wait
for my confirmation, then implement as a pure function, then wire into the
service.
```

---

## Prompt 8 — Billing Engine

```
ENGINE 8: Billing Engine (hybrid one-time + recurring)

Walk every line on a confirmed order:
- One-time-billing lines: sum them into a single invoice for the order.
- Recurring-billing lines: each spins up its own subscription record (tied
  to a subscription plan) plus a billing schedule of future billing
  dates/amounts, starting from order confirmation date, repeating at the
  plan's frequency (monthly/quarterly/yearly).

Keep these two flows on genuinely separate data models/lifecycles internally
even though they originate from the same order and share a billing screen —
don't force them through one shared model.

Proration (for mid-cycle subscription quantity/plan changes):
1. daily_rate = plan_price_per_period / days_in_period
2. prorated_amount = daily_rate × days_remaining_in_current_period × (change
   in quantity or price)
3. This prorated amount is charged (if increased) or credited (if decreased)
   for ONLY the remainder of the current cycle. The next full cycle onward
   uses the new quantity/price at the normal full rate — proration never
   applies beyond the partial period where the change happened.

Invoice status lifecycle: Draft → Issued → Paid, with Cancelled as a side
exit from Draft or Issued. Recording a payment moves Issued → Paid.

Hard rule: every billed amount must trace back to an already-evaluated quote
line price, or to this documented proration formula. Never let this engine
invent or independently set a price.

Give me 3-5 worked examples first, including one full proration walkthrough
with concrete dates/amounts and one "record a payment, invoice flips to
Paid" case, wait for my confirmation, then implement as a pure function
(proration/invoice-total calculation) plus the service layer that creates
the actual invoice/subscription/schedule records.
```

---

## Prompt 9 — Upsell / Cross-Sell Engine

```
ENGINE 9: Upsell / Cross-Sell Engine (independent, but needs Margin's
definitions)

For products already on a quote, score candidate add-on products using
historical co-purchase data (already seeded) combined with:
1. Co-purchase frequency (weighted most heavily).
2. Whether the candidate currently has an active promotion (bonus).
3. Margin delta adding it would contribute (smaller bonus) — use the same
   margin definitions as Engine 3 (percent against revenue, not cost).

Hard filter BEFORE ranking: throw out any candidate whose margin falls below
our minimum-acceptable-margin threshold (pick and document a number). This
filter runs first, unconditionally — never let a high co-purchase score
override a below-threshold margin.

Return a short ranked list, each with: product, human-readable reason string
("Frequently purchased with Laptop Pro"), margin delta, and promotion status.
Frame explicitly as "customers who bought X also bought Y," not "AI
recommends" — this isn't the AI layer, it's statistics.

Give me 3-5 worked examples first, including one where a high co-purchase
candidate gets filtered out entirely for low margin, wait for my
confirmation, then implement as a pure function, then wire into the service.
```

---

## Prompt 10 — Negotiation Engine

```
ENGINE 10: Negotiation Engine (depends on the full evaluate pipeline from
Prompt 6 being solid)

Core invariant: every material customer change from the portal (especially a
counter-offer on discount) must trigger a FULL re-run of the exact same
pricing → discount → margin → risk → approval pipeline used internally.
There is no separate simplified "portal version" of these calculations.

Flow:
1. Verify the portal token identifies a real, still-negotiable quote — reject
   cleanly if the quote's status doesn't permit negotiation (tell me which
   statuses you're treating as negotiable based on our schema).
2. Persist the customer's proposed terms as a SEPARATE negotiation record —
   do NOT mutate the quote's committed lines directly with unconfirmed
   customer input.
3. Apply the proposed terms to a fresh copy of the evaluation context and run
   the full pipeline (discount → margin → risk → approval) against it.
4. Compare the new required approval steps against the quote's current
   approval state.
5. If the new evaluation needs more/different approval: create a NEW approval
   request (per the re-approval invariant from Engine 5) and flip quote
   status to pending-internal-review. For this hackathon, treat this as
   always-retrigger-approval-evaluation on any negotiated change, even in
   edge cases where the new terms might technically still be compliant —
   simpler and safer for a live demo.
6. Write an audit log entry with before/after discount values and reason
   "customer counter-offer."

Security requirement: build a DEDICATED, deliberately restricted response
shape for anything sent to the portal. It must never include margin,
internal risk score, approval reasoning, or warehouse allocation — not "hide
fields on the frontend," an actually separate response object. I will check
the network tab for this.

Give me 3-5 worked examples first, including one where a counter-offer
pushes a previously Low-risk quote into High risk and a new approval request
must be created, wait for my confirmation, then implement as a pure function
for the re-evaluation core, then wire into the service including the
restricted portal response shape.
```

---

## Prompt 11 — Deal Health Engine

```
ENGINE 11: Deal Health Engine (independent of per-quote Risk Engine —
answers a different question over time, not at submission)

Do NOT reuse the quote-level Risk Engine's score for this — Risk Engine asks
"should this submission need approval right now"; Deal Health asks "is this
deal, over time, showing signs of dying or being mismanaged." Conflating them
will mislabel every large, correctly-approved, healthy deal as "risky"
forever.

Signals to combine (simple additive points, same discipline as Risk Engine —
document your thresholds):
1. Stall/inactivity: days since quote was last touched (edited/commented/
   negotiated) — longer silence adds points.
2. Discount anomaly vs the rep's own historical average discount — this is
   outlier detection, distinct from policy violation (a deal can be flagged
   here even if fully within policy ceilings).
3. Approval sitting too long: pending beyond a time threshold (e.g. 24h)
   without action adds points.
4. Inventory/delivery risk: warehouse splitting or a slipped promised
   delivery date adds points.
5. Negotiation churn: many back-and-forth counters without convergence adds
   points.

Map to four bands: Healthy / Watch / At Risk / Critical, with documented
score cutoffs. Every contributing signal produces its own human-readable
reason string, same as Risk Engine.

Give me 3-5 worked examples first (include one deal that's technically
"compliant" on every quote-level metric but still flagged At Risk due to
stall+approval-delay, to demonstrate the separation from Risk Engine), wait
for my confirmation, then implement as a pure function, then wire into a
service that can run this both periodically and on-demand.
```

---

## Prompt 12 — Audit Logging discipline

```
Build one small, generic audit-log helper NOW if we haven't already (one
repository function, one shape): entity type, entity ID, action, actor,
before value, after value, reason (optional).

Then go back through every service function we've built for Engines 2, 5, 7,
8, 10 and confirm each one calls this helper wherever it changes something
material: approval decisions, rejections, manual overrides, quote line
edits, negotiation counter-offers, discount changes. Show me the list of
call sites you've added or confirmed.
```

---

## Prompt 13 — AI Explanation layer (last, never a blocker)

```
ENGINE 12 (AI layer, sits on top of everything — build LAST):

This layer NEVER decides anything — it only translates already-computed
structured facts into fluent natural language for a human. Feed it:
- The Risk Engine's score, level, and reasons list.
- The Approval Engine's routing decision.
- Optionally, Deal Health's reasons list.

It must not contradict or invent facts beyond what's in those reasons lists.
Validate whatever the model returns against a strict schema before showing
it to anyone. If the model call fails, times out, or returns something
malformed, fall back to a plain deterministic sentence built by joining the
reasons list with "because" — this fallback must work with zero model calls,
since this feature must never be a single point of failure for the demo.

Give me the schema you'll validate against and the deterministic fallback
sentence builder first, then the actual prompt/call to the model.
```
