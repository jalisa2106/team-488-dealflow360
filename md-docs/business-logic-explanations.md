# DealFlow360 — Business Logic & Calculation Engines Playbook

**Purpose of this document:** you already have the database schema live, the Next.js
boilerplate about to be scaffolded, and the architectural skeleton (controllers →
services → engines → repositories) decided. What's missing is the actual *thinking*
inside each engine — the part a judge will grill you on. This document teaches you,
in plain words, exactly what each engine must do, what it reads, what it decides,
and what it must never do. No code — you write the code against your boilerplate;
this is the specification and mental model you implement it from.

Read it in the order given. The order **is** the dependency order: each engine
either consumes the output of the one before it, or is required before the next
one can be meaningfully tested.

---

## 0. The one idea to hold in your head the whole time

Every engine in this system follows the same shape:

```
INPUT (verified facts from the database)
   → PURE CALCULATION (no side effects, no I/O, no randomness)
   → OUTPUT (a structured decision/number/object)
```

Nothing in an engine should reach into the database itself, call another engine's
internals, send a notification, or talk to an AI model. Engines are answer
machines: you hand them facts, they hand you a verdict. The **service layer**
around each engine is the only place allowed to fetch data, call multiple engines
in sequence, write to the database, and trigger side effects (audit logs,
notifications). This separation is what lets you unit-test an engine with plain
numbers and no server running — and it's the single most convincing thing you can
show a technical judge.

Keep repeating this sentence to your teammates until it's annoying: **"the engine
decides, the service orchestrates, the repository persists."**

---

## 1. Pricing Resolution (the foundation everything else needs)

Before any discount or risk can be calculated, you need a trustworthy price for a
line. Never trust a price sent from the browser — recompute server-side.

**What it needs to know:**
- The product's base price and cost price (for margin later).
- Which price list applies, if you're using tiered price lists rather than a flat
  base price (your schema has `price_lists`/`price_list_items` — decide early
  whether you actually need multiple price lists for the demo, or whether
  `products.base_price` alone is enough. For a 36-hour hackathon, a flat base
  price per product is almost certainly sufficient — don't build price-list
  resolution unless you have spare time).
- The quantity being ordered (for line subtotal).
- The tax percentage on the product, if you want tax-inclusive totals shown
  anywhere (optional for the demo, but easy to add: subtotal × tax% as a separate
  displayed figure, never silently folded into "the price").

**What it produces:** a line subtotal (unit price × quantity, before discount),
which everything downstream — discount engine, margin calculation, risk engine —
treats as ground truth.

**The one rule that matters:** the *client* can suggest a discount percentage and
a quantity, but it can never supply the unit price or the final total. Those are
always recomputed from the product record on the server, every single time a
quote is evaluated. This is what lets you tell a judge, truthfully, "the browser
is never trusted for pricing."

---

## 2. The Discount Engine

This is the first real "decision" engine, and the one every other engine leans on.

### What it's answering

For a given quote line, "is this discount allowed, and if not, by how much does it
exceed policy?"

### The two ceilings, and how they combine

Your schema (and the blueprint) define discount ceilings two ways:
1. **By customer tier** (Bronze/Silver/Gold each get a maximum discount ceiling).
2. **By product category** (Hardware vs. Service each get their own ceiling,
   independent of who the customer is).

The critical insight from the blueprint's own worked example: a Gold customer
might be entitled to up to 15% generally, but if the *category* rule for Services
caps discounts at 10%, the Service line is only allowed 10% — **not** 15%. The
category ceiling and the tier ceiling are not additive, and neither one silently
wins by default. For each line, resolve both ceilings that apply to it, and take
the **more restrictive (i.e., smaller) of the two** as the effective ceiling for
that line. This is often called "most-restrictive-wins" and it is the resolution
rule you must implement and be able to explain out loud.

### Per-line calculation

For every line in the quote:
1. Look up the customer's tier ceiling for that line's category (or a general
   ceiling if you don't have per-category-per-tier rules).
2. Look up the category's own ceiling, independent of tier.
3. Take the minimum of the two → this is the "allowed discount" for that line.
4. Compare it against the discount percent actually requested on that line.
5. If requested ≤ allowed: no violation, this line contributes nothing to risk.
6. If requested > allowed: the difference (requested − allowed) is the
   "overage" for that line. Record it along with which rule caused it, because
   you will show this exact number to the user in the Deal Guardian panel and to
   the approver in the approval screen.

### Why you must not just look at the worst line

A common shortcut is "find the single worst violation and use only that." Don't.
The blueprint explicitly calls out that *multiple smaller violations across
different lines should accumulate into a blended risk*, not just be judged by
whichever line is worst. A quote with five lines each 3% over their ceiling should
usually be judged more risky than a quote with one line 3% over its ceiling and
four lines perfectly compliant — because the business is bleeding margin across
the whole deal, not on one line. You'll carry this "blended" idea into the risk
engine (next section) — the discount engine's job is just to produce *all* the
per-line overage numbers, cleanly, for the risk engine to combine.

### What the discount engine returns

For each line: the allowed ceiling, the requested amount, the overage (zero if
none), and which rule (tier vs category) was the binding constraint. For the
quote as a whole: whether *any* line has an overage at all (a simple boolean is
useful for a fast "is this even worth risk-scoring" check before you do the more
expensive blended calculation).

### What NOT to put in this engine

Don't decide approval routing here. Don't touch margin. Don't touch inventory.
This engine only knows about discount percentages and ceilings. Keep it narrow —
narrow engines are the ones you can actually finish and test in a hackathon.

---

## 3. Margin Calculation

Deceptively simple, but get the definitions exactly right, because "margin" is a
word non-engineers on your judging panel will ask about directly, and if your
numbers don't reconcile with your own screen it looks bad.

### Definitions to lock in before you write anything

- **Line revenue** = unit price × quantity, after discount is applied (i.e., the
  amount the customer will actually pay for that line).
- **Line cost** = cost price × quantity (cost price never has a discount applied
  to it — the discount is something you're giving up on price, not something
  that reduces what the item cost you).
- **Line margin amount** = line revenue − line cost.
- **Line margin percent** = line margin amount ÷ line revenue (not ÷ cost — margin
  percent is conventionally expressed against revenue/price, not against cost;
  if you accidentally divide by cost you get "markup," a different number, and
  a sharp judge may notice the mismatch if they do mental math).
- **Quote margin amount** = sum of all line margin amounts.
- **Quote margin percent** = quote margin amount ÷ quote total revenue (again,
  revenue in the denominator, not cost).

### What it's used for downstream

The margin percent feeds directly into the risk engine (a heavily discounted deal
with wafer-thin margin is riskier than one with the same discount percentage but
a naturally high-margin product). It's also just directly displayed on the
Quotation Builder screen ("Margin: 18.4%") — this is one of the explicit
must-have UI elements from the blueprint, and it must update the instant a
quantity or discount changes, because that visible responsiveness is part of the
"Deal Guardian" demo moment.

### Practical implementation note

Compute margin as part of the same "evaluate" pass that runs the discount engine
— don't make it a separate round trip. The evaluate endpoint should do pricing →
discount → margin → risk → approval all in one pass and return one combined
result object. That's both simpler to implement and much faster to demo (one
spinner, one network call, everything updates together).

---

## 4. The Risk Engine

This is the engine judges will focus on the most, because it's where "the numbers
become a decision." It has to feel principled, not arbitrary — so document your
weights and thresholds in `docs/business-rules.md` and be ready to explain "these
are our implementation choices, the problem statement doesn't mandate specific
numbers" (this is true, and saying it confidently is a strength, not a weakness).

### The blended discount-violation score

From the discount engine you have, per line: an overage amount and that line's
revenue. Don't just sum the overages — a 5% overage on a $10 line and a 5%
overage on a $10,000 line are not equally dangerous to the business. Weight each
line's overage by how much revenue that line represents relative to the whole
quote. Concretely: for each line, multiply its overage percentage by its share of
total quote revenue, then sum those weighted values across all lines. This gives
you a single number that fairly represents "how much discount policy violation,
weighted by dollars, is happening in this quote" — which is exactly the
"blended" score the blueprint asks for.

### The other risk ingredients

Discount violation is the primary signal, but a well-rounded risk score also
folds in:
- **Margin risk** — if the resulting margin percent falls below some acceptable
  floor (pick a number, e.g. anything under ~15% margin adds risk points),
  regardless of whether any single discount rule was technically violated. This
  catches cases where lots of small legal discounts still gut the margin.
- **Inventory risk** — if fulfilling this quote would require splitting across
  more than one warehouse, or if there isn't enough total stock to fulfill it at
  all, add risk points. (This means the risk engine needs to at least peek at
  inventory availability — either by calling into a read-only inventory check, or
  by having the service layer fetch inventory data and pass it in as part of the
  risk engine's input. Keep the engine itself pure; let the service assemble the
  input.)
- **Stall/negotiation risk** (mainly relevant for Deal Health, described later,
  but you can also fold a light version into quote-level risk: e.g., how many
  times has this quote already been countered/negotiated — more rounds of
  negotiation is itself a risk signal).

### Combining them into one score

Pick simple additive weights, e.g.: discount violation score contributes most of
the total, margin risk adds a fixed number of points if margin falls below your
floor, inventory risk adds a fixed number of points per extra warehouse required
or a larger fixed number if the order can't be fully filled at all. Don't
over-engineer this into a machine-learning-flavored weighted regression — a
transparent additive formula that you can literally read out loud to a judge
("discount overage weighted by revenue, plus 10 points if margin is under 15%,
plus 15 points if inventory needs to come from two warehouses") is *more*
credible than something opaque, even if a data scientist could technically build
something fancier.

### Mapping the score to a risk level

Decide on four bands — Low, Medium, High, Critical — with score cutoffs you
choose and document (for example: 0–9 Low, 10–19 Medium, 20–34 High, 35+
Critical — these exact numbers are yours to pick, just pick them once and keep
them consistent everywhere, including in your seed data and your rehearsed demo
script, so your golden-path 18%-discount example reliably lands in "High" every
single time you run it).

### What the risk engine returns

The numeric score, the mapped level, and a list of human-readable "reasons" — one
per contributing factor, each with a severity and a plain-English message (e.g.
"Setup Service is 8 points above its permitted discount ceiling"). This reasons
list is not a nice-to-have — it's what makes your Deal Guardian panel and your
approval screen actually explain themselves instead of just showing a mystery
number, and it's also exactly the structured input your AI explanation layer
will read from later (the AI never invents these reasons — it just prose-ifies
the ones your engine already generated).

---

## 5. The Approval Engine

Purely a mapping from risk level (or score) to a routing decision. Deliberately
the simplest engine in the system — resist the urge to make it fancier.

### Core mapping

Something like: Low risk → no approval needed, quote can go straight to approved.
Medium risk → Sales Manager approval required. High or Critical risk → Sales
Manager **and then** Finance approval required, in that order (Manager first,
Finance second — sequential, not parallel, because Finance is meant to be a
backstop on deals the Manager has already blessed).

### The "hard violation floor" rule

Add one more rule on top of the pure score mapping: if *any* line violates its
category discount ceiling by a nontrivial amount, force at least Manager approval
even if the blended score would technically have landed in the "no approval"
band. This closes a loophole where one huge line and many perfectly-priced lines
could dilute the blended average score in a way that quietly bypasses approval
for what is, on inspection, a clearly out-of-policy line. This exact "closes a
loophole" framing is a good line to have ready if a judge asks "why do you have
this extra rule on top of the score bands?"

### What it returns

A boolean "approval required," and if so, an ordered list of the roles that must
approve (e.g. `["SALES_MANAGER"]` or `["SALES_MANAGER", "FINANCE"]`). The service
layer is responsible for turning that ordered list into actual approval-request
rows in the database — the engine itself never touches the database.

### The re-approval invariant (very important, tested twice in the blueprint)

Once a quote is approved, if anything materially changes the deal afterward
(most commonly: a customer negotiation), you must re-run pricing → discount →
margin → risk → approval from scratch on the new terms, and if the *new*
approval requirement is equal to or less than what was already approved, you can
let it proceed; but if the new evaluation requires a *higher* or *different*
approval step than what already happened, you must create a **new** approval
request rather than silently reusing or overwriting the old approved one.
Historical approval records must never be mutated after the fact — this is both
a correctness rule and an audit-integrity rule, and it's explicitly called out
as one of the ten core invariants worth putting in your `business-rules.md`.

---

## 6. Fulfillment / Warehouse Allocation Engine

### What it's solving

Given a requested quantity of a product and inventory scattered across multiple
warehouses, decide how to split the order to actually fulfill it, without
building a heavyweight optimization solver.

### The heuristic (deterministic, explainable, good enough)

1. Find every warehouse that has any stock of the product at all.
2. Sort those warehouses by some preference order — the simplest defensible
   order is "largest available quantity first," so you consolidate into the
   fewest warehouses possible (fewer warehouses touched = fewer shipments =
   lower shipping cost, which is the actual business goal).
3. Allocate from the top of that sorted list: take as much as that warehouse can
   give (up to what's still needed), move to the next warehouse if quantity
   remains unfulfilled, and repeat.
4. If you run out of warehouses before the requested quantity is fully covered,
   whatever is left over becomes a **backorder** quantity — record it explicitly
   rather than silently under-filling the order.
5. Count how many distinct warehouses you ended up allocating from — that's your
   shipment count. Sum up a per-warehouse shipping cost (you can seed a flat
   shipping cost per warehouse, or per warehouse-per-shipment, whichever your
   seed data supports) into a total shipping cost figure.

### Why this counts as a "real" engine and not a cop-out

Explicitly say, if asked: "we deliberately chose a deterministic greedy heuristic
over a solver because the business objective (minimize shipment count and
shipping cost, subject to real stock constraints) doesn't need combinatorial
optimization at hackathon scale, and a heuristic is something we can fully
explain and test." That is a legitimate, mature engineering answer — don't be
embarrassed that it isn't a linear program.

### Manual override

The Operations user should be able to reject the recommended split and manually
enter their own warehouse quantities. When they do, validate the override never
allocates more from a warehouse than that warehouse actually has in stock (never
trust the browser's numbers here either), and require a reason string, which
goes straight into the audit log alongside the before/after allocation.

### What it must never do

Never let the *total* allocated quantity across all warehouses exceed the
originally requested quantity, and never let a single warehouse's allocation
exceed that warehouse's actual current stock. Both are the kind of "obviously
wrong" bug a judge will specifically try to trigger by asking "what if I order
more than you have?" — make sure you've actually tried that scenario yourself
before demo day.

---

## 7. Billing Engine (hybrid one-time + recurring)

### The core split

Walk every line on a confirmed order. Lines marked one-time-billing go onto a
single invoice for the order (sum them up, apply tax if you're doing that,
produce one invoice record). Lines marked recurring-billing each spin up a
subscription record (referencing whichever subscription plan they're tied to)
plus a billing schedule of future billing dates and amounts, starting from the
order's confirmation date and repeating at the plan's frequency (monthly,
quarterly, yearly).

This is the "same order, two billing treatments" requirement — the important
thing to get right is that these two flows are genuinely independent internally
(different tables, different lifecycles) even though they originate from the
same order and appear together on the same billing screen. Don't try to force
one-time and recurring lines through the same data model just because they came
from the same order — that will make everything downstream (cancellation,
proration, invoice status) harder than it needs to be.

### Proration, in words

When a subscription's quantity or plan changes mid-cycle, you owe (or owe back)
only the portion of money that corresponds to the days remaining in the current
billing period, not a full new period's charge. The calculation: take the
plan's price for one billing period, divide it by the number of days in that
period to get a daily rate, multiply that daily rate by the number of days
remaining in the current period, then multiply by however much the quantity (or
price) changed by. That gives you the incremental amount to charge (if quantity
went up) or credit (if quantity went down) for just the remainder of the current
cycle. The *next* full billing cycle onward simply uses the new quantity/price
at the normal full rate — proration only ever applies to the partial period in
which the change happened.

### Invoice status lifecycle

Keep it simple and linear: Draft → Issued → Paid, with Cancelled as a side exit
from Draft or Issued. Recording a payment against an invoice is what moves it
from Issued to Paid — and this is one of the eight steps the blueprint's own
suggested test flow explicitly walks through, so make sure "record a payment,
watch invoice status flip to Paid" actually works before demo day, not just
"invoice gets created."

### What must never happen

Never let the billing engine independently invent a price — every amount it
bills traces back to a quote line's already-evaluated price, or to a documented
proration formula. If a judge asks "how do I know your invoice total is
correct," you want to be able to say "it's derived directly from the same
approved quote lines, recomputed the same way every time" rather than "it's a
field we set once and hope stays in sync."

---

## 8. Upsell / Cross-Sell Engine

### The scoring idea

For whatever products are already on the quote, look up historical co-purchase
data (which products are frequently bought alongside these ones — you already
have seed rows for this) and combine that "how often are these bought together"
signal with two more factors: whether the candidate product currently has an
active promotion, and how much margin adding it would contribute (margin delta).
Combine these three into a single suggestion score — co-purchase frequency
matters most, promotion status gives a bonus, margin delta gives a smaller
bonus — and use it purely to *rank* candidate suggestions, showing the top few.

### The hard filter you must not skip

Before ranking anything, throw out any candidate product whose margin falls
below your minimum-acceptable-margin threshold. The point of upselling is to
improve the deal's economics, not to hit a "recommend more stuff" quota — a
recommendation engine that suggests a low-margin add-on because it happened to
co-occur historically undermines the whole "governance" story of this product.

### What it returns

A short list of candidate products, each with a human-readable reason string
("Frequently purchased with Laptop Pro"), the margin delta adding it would
produce, and whether it's currently promoted. Frame these in the UI as "customers
who bought X also bought Y" rather than "AI recommends Y" — it's both more
honest (it's not AI, it's statistics) and more persuasive to a buyer.

---

## 9. Negotiation Engine

### The invariant that makes this the "wow" feature

Every material change a customer makes from the portal — most importantly, a
counter-offer on discount — must trigger a *full* re-evaluation of the quote
using the exact same pricing → discount → margin → risk → approval pipeline the
internal quote builder uses. There is no separate, simplified "portal version"
of these calculations. This is what makes "customer changes a number and the
internal approval workflow reacts automatically" actually true rather than
theater.

### The flow, in words

1. Verify the portal token identifies a real, still-negotiable quote (not one
   that's already confirmed, cancelled, or otherwise past the point where
   negotiation makes sense — decide which quote statuses even permit
   negotiation, and reject the request cleanly outside of those).
2. Persist the customer's proposed terms as a negotiation record (don't mutate
   the quote's committed lines directly with unconfirmed customer input — keep
   the proposal as its own record until it's accepted internally).
3. Apply the proposed terms to a fresh copy of the evaluation context (i.e.,
   pretend the quote's discount were the customer's proposed number) and run it
   through discount → margin → risk → approval exactly as above.
4. Compare the *new* required approval steps against whatever approval state the
   quote is already in.
5. If the new evaluation needs more (or different) approval than before, create
   a new approval request and flip the quote's status to reflect that it's
   pending internal review again. If the new evaluation is actually still within
   whatever was already approved, you can let the quote proceed under
   negotiation without necessarily restarting the whole chain — but be
   conservative here: for the hackathon demo, it's safer and simpler to say "any
   negotiated change re-triggers approval evaluation," even if in some edge case
   the new terms are technically still compliant, because that's the behavior
   you're going to be showing off live.
6. Whatever happens, write an audit log entry capturing the before/after
   discount values and the reason ("customer counter-offer").

### What the customer must never see

Nothing about margin, internal risk score, approval reasoning, or warehouse
allocation. Build a dedicated, deliberately restricted response shape for
anything sent to the portal — never send the same object your internal API
returns and just hide fields on the frontend. If a judge opens the browser
network tab during your demo and sees `marginPercent` sitting in the portal's
API response even though it's not rendered, you lose the security argument
instantly, no matter how good your explanation is.

---

## 10. Deal Health Engine

### Purpose

Distinct from per-quote risk (which is about "is this specific quote's discount
too aggressive"), Deal Health is about "is this deal, as an ongoing process,
dying quietly." It runs either periodically (a background scan) or on-demand
when someone opens the dashboard.

### The signals to combine

- **Stall/inactivity** — how many days has it been since the quote was last
  touched (edited, commented on, negotiated)? Long silence adds risk points.
- **Discount anomaly relative to the rep's own history** — if this rep's average
  discount across their other deals is, say, 8%, and this deal is sitting at
  25%, that gap itself is worth flagging even independent of whether it violates
  a hard policy ceiling — it's an outlier-detection signal, not a policy-violation
  signal, and the two are usefully different things to show on the dashboard.
- **Approval sitting too long** — if an approval request has been pending beyond
  some time threshold (e.g. 24 hours) without action, add points; this is what
  lets a manager's manager notice a bottleneck.
- **Inventory/delivery risk** — if fulfillment requires splitting across
  warehouses, or if a promised delivery date has already slipped, add points.
- **Negotiation churn** — a deal that's been countered back and forth many times
  without converging is itself a warning sign.

### Combine into the same four-band structure

Healthy / Watch / At Risk / Critical, using the same "pick simple additive
points, document your thresholds" approach as the quote-level risk engine. Keep
the same discipline: every contributing signal produces its own human-readable
reason string, and the dashboard should show *why* a deal is flagged, not just a
colored dot.

### Why this must stay separate from the per-quote Risk Engine

They answer different questions at different times: Risk Engine asks "should
*this specific submission* need approval, right now, based on its discount and
margin." Deal Health asks "is this deal, over time, showing signs of dying or
being mismanaged." Reusing the exact same score for both will make your
dashboard describe every large, correctly-approved, healthy enterprise deal as
"risky" forever, which is both wrong and will look wrong on screen.

---

## 11. Audit Logging (a discipline, not really an "engine")

### The rule

Any service-layer function that changes something material — an approval
decision, a rejection, a manual override, an edit to a quote line, a negotiation
counter-offer, a discount change — writes one audit record capturing: what kind
of entity changed and its ID, what action happened, who did it, what the value
was before, what it became after, and (where relevant) a reason string the actor
provided.

### Practical tip

Build one small, generic "write an audit entry" helper very early (it's cheap:
one repository function, one shape) and call it from every service that needs
it, rather than each engine/service inventing its own ad hoc logging. Consistency
here is what makes the Audit Timeline UI component trivial to build later — it's
just "list of audit rows for this entity, newest first, rendered as a
timeline."

### Why this is worth your time even though it feels like busywork

It's one of the cheapest ways in the entire project to look like a serious,
production-minded team to a judge, because "who approved this, when, and why"
is exactly the kind of question a real enterprise buyer would ask, and you can
answer it instantly by pulling up the timeline live during Q&A.

---

## 12. Where the AI layer is allowed to touch any of this (and where it is not)

This deserves its own short section because it's the single question most
likely to trip you up in review if you get it backwards.

**Never let AI decide anything above.** Discount ceilings, risk scores, approval
routing, warehouse allocation, billing amounts, proration — all of that is
deterministic and computed exactly as described in the sections above, with no
model call anywhere in the path.

**What AI is allowed to do:** take the *already-computed* structured facts (the
risk score, the specific reasons list your Risk Engine produced, the approval
steps your Approval Engine decided, maybe the deal health reasons) and turn them
into a fluent natural-language explanation for a human — "why is this deal
risky," phrased conversationally. The AI is a translator sitting on top of
verified facts it did not generate and is not allowed to contradict. Validate
whatever structured response the model gives you against a strict schema before
showing it to anyone, and if the model is unavailable or returns something
malformed, fall back to a plain deterministic sentence built directly from the
reasons list (e.g., join the reason messages together with "because") — the
explanation feature must never be a single point of failure for the demo.

If a judge asks "why did the AI decide Finance approval was needed," the correct
answer is "the AI didn't decide that — the Approval Engine did, deterministically,
before the AI was even called; the AI's only job was to explain that decision in
plain English." Have this sentence ready verbatim.

---

## 13. How to actually build and test this yourself, engine by engine

For each engine above, follow the same three-step build discipline:

1. **Write down 3–5 concrete example scenarios in plain numbers first**, before
   touching any code — e.g. for the Discount Engine: "Gold customer, Hardware
   line, 12% requested, ceiling is 15% → no violation" and "Gold customer,
   Service line, 18% requested, ceiling is 10% → 8-point overage." Do this for
   every engine. These examples become your unit tests almost verbatim, and
   writing them first forces you to actually pin down your thresholds and
   formulas instead of discovering gaps while typing code under time pressure.
2. **Implement the engine as a pure function** — something that takes plain
   input data and returns plain output data, with no database or network calls
   inside it. This is what makes it independently testable and is what
   separates "engine" from "endpoint" in this architecture.
3. **Wire it into its service**, which is the only layer allowed to fetch the
   real data the engine needs from the repository, call the engine, and persist
   or return the result. Test the endpoint end-to-end only after the pure
   engine already passes your example scenarios in isolation — this order
   catches logic bugs immediately instead of thirty minutes into debugging a
   full HTTP round trip.

Do the engines in this order, because each one's test scenarios depend on the
one before existing and being trustworthy:

```
Pricing resolution
   → Discount Engine
   → Margin calculation
   → Risk Engine
   → Approval Engine
   → (only now) Quotation submit/evaluate flow end-to-end
   → Fulfillment Engine
   → Billing Engine
   → Upsell Engine
   → Negotiation Engine (needs Discount+Risk+Approval already solid)
   → Deal Health Engine
   → Audit logging discipline threaded through all of the above
   → AI explanation layer (last, and never a blocker for anything else)
```

This mirrors DF-010 through DF-056 in your ticket list, but the point of this
section is that you now understand *why* that order exists, not just that it
was handed to you as a checklist.

---

## 14. What to say when the reviewer asks "explain the logic to me"

A good, honest, hackathon-appropriate answer walks the reviewer through exactly
one worked example end to end, out loud, using real numbers from your seed data
(Acme Corp, Gold tier, Laptop Pro + Setup Service, 18% discount on the service
line). Narrate it in this order: price resolution → per-line discount ceiling
lookup and violation → blended risk score with its component reasons → approval
routing decision → (if you want to extend the example) what happens if Acme then
counters at 20% from the portal, and how that re-triggers the same pipeline.
That single walkthrough demonstrates every engine in this document in about two
minutes, using your own real numbers, and is far more convincing than reciting
definitions.
