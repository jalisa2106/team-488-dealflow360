# 06 — Subscription Screen Fixes & Date Fields
**Branch:** `feature/subscription-fixes` (continues file `02`'s owner)
**Depends on:** file `00` (order/billing auto-trigger — subscriptions get created off real orders now) and file `02` (real cancel/proration) merged.
**Scope:** `src/app/(dashboard)/subscriptions/**`, `src/app/api/subscriptions/**`. I haven't re-read the current code for the "New Plan" bug this session (no updated zip this round) — confirm root cause against `main` before patching.

## 1. "New Plan" button not working

Same diagnostic as file `05`'s variant-button item, applied here:
1. First determine which "New Plan" this is — the reviewer note doesn't distinguish `SubscriptionPlan` setup (spec A5, admin defines a *type* of recurring plan like "Monthly Support") from creating a `Subscription` instance for a specific customer/order. `subscriptions/plans/new/page.tsx` is the former; check whether the reported bug is on that page or on a "new subscription" action somewhere in the main `/subscriptions` list.
2. Check the network tab when clicking it: no request fired at all → routing/wiring bug (button not calling the handler, or `<Link>` pointed at a stale path). Request fires but fails → check the response body for the actual validation or server error rather than guessing; the git history (`85780b3`) mentions "new subscription plan creation" was added, so this may be a regression from a later merge rather than something never built — check `git log -p` on this file for what changed between when it worked and now if it used to work.
3. Once fixed, confirm the created plan actually appears in whatever dropdown/list is used to attach it to a quote line during quote-building (`quotations/new/page.tsx`) — a plan that saves to the DB but isn't selectable anywhere downstream is only half-fixed.

## 2. Start and end date fields on the Subscriptions page

Check `SubscriptionPlan` and `Subscription` models in `prisma/schema.prisma` first — `Subscription` likely already has something like `startDate`/`currentPeriodEnd` given the billing/proration engine needs them to compute anything at all (`calculateProration` in `billing.engine.ts` can't work without period boundaries). If the fields exist in the schema but aren't shown or aren't settable in the UI, that's a display/form gap, not a data-model gap — check before adding new columns.

1. **`subscriptions/plans/new/page.tsx`** (plan template setup) — if the spec's intent here is "monthly/quarterly/yearly" as a billing *cadence* rather than fixed calendar dates, confirm which the reviewer meant. A recurring plan template usually doesn't have fixed start/end dates (a specific customer's `Subscription` instance does) — if the feedback is about the template screen, the more likely correct addition is a "default duration" or "auto-renew" field, not literal dates. If it's about the subscription-instance screen (`subscriptions/[subscriptionId]/page.tsx` or wherever a subscription is created for a customer's order), add:
   - `startDate` — when billing begins (defaults to order confirmation date, per file `00`'s auto-trigger).
   - `endDate` — optional, for a fixed-term subscription; leave null for auto-renewing/ongoing.
2. Surface both fields on the subscription detail page (`subscriptions/[subscriptionId]/page.tsx`) alongside the (now-real, per file `02`) cancel control, and on the subscriptions list page as columns.
3. If `endDate` is set and passes, the subscription should auto-transition to a cancelled/completed status — check whether anything currently sweeps for this (likely nothing does yet, since it's a new field) and add a simple check: either a scheduled route hit by an external cron (out of scope for a hackathon — skip) or, more realistically for this project's scope, compute "is this subscription still active" as a derived value (`endDate == null || endDate > now()`) everywhere status is displayed, rather than trying to build a background job.

## 3. GroupBy on the Subscriptions page

Already covered as item 5.3 in file `05` (group by Plan and/or Status) — don't duplicate that work, just confirm with whoever's working file `05` who's actually landing it, since it touches the same file (`subscriptions/page.tsx`) you're also editing here for the date-field display. Land whichever of you is ready first, the other rebases.

## Out of scope for this branch
- Order/billing pipeline → file `00`
- Cancel/proration/CreditNote, Reports page → file `02` (already done, don't redo)
- Product/warehouse/order fixes → file `05`

## Definition of done
- [ ] "New Plan" button (whichever screen it actually refers to) creates a real, usable plan/subscription
- [ ] Start/end dates are visible and settable where they belong (plan template vs. subscription instance — confirmed with the team first)
- [ ] A subscription past its end date is visibly treated as inactive somewhere in the UI, even without a background job
