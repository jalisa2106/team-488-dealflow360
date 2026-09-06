# 01 — Onboarding, Access & Shared UI Infra
**Branch:** `feature/onboarding-access` (continuing unfinished work from last round)
**Depends on:** file `00` merged first (order/status fix) — this branch doesn't touch that logic so you can actually start before it lands, just rebase once it's in.
**Scope:** new `src/app/onboard/**`, new `src/app/(dashboard)/customers/**`, `src/app/api/customers/**` (new invite sub-route only — don't touch the existing `GET /api/customers`, that's stable), `src/lib/auth/**`, `src/middleware.ts` (additive only), plus one new shared component used by everyone: `src/components/Toast.tsx`.

This is the same brief as last round's Branch 1 — it didn't get built, so it's carrying over. Nothing here has changed except priority: it's now blocking the "make everything production grade" ask, not just a reviewer nice-to-have.

## Part A — Invite-link onboarding (unchanged from last round, still needed)

### Schema
```prisma
model CustomerInvite {
  id          String    @id @default(uuid())
  customerId  String    @map("customer_id")
  email       String
  token       String    @unique
  status      String    @default("PENDING") // PENDING, ACCEPTED, EXPIRED, REVOKED
  invitedById String    @map("invited_by_id")
  expiresAt   DateTime  @map("expires_at") @db.DateTime2
  acceptedAt  DateTime? @map("accepted_at") @db.DateTime2
  createdAt   DateTime  @default(now()) @map("created_at") @db.DateTime2

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  invitedBy   User      @relation("InvitedByUser", fields: [invitedById], references: [id], onDelete: NoAction)

  @@index([customerId])
  @@index([token])
  @@map("customer_invites")
}
```
Add `invites CustomerInvite[]` to `Customer` and `sentInvites CustomerInvite[] @relation("InvitedByUser")` to `User` — additive lines only. Run your own `npx prisma migrate dev --name add_customer_invites`.

### Token handling (`src/lib/auth/invite-token.ts`, new file)
- `crypto.randomBytes(32).toString('hex')` for the raw token, store only its SHA-256 hash in the DB, put the raw token in the URL. 7-day expiry.

### Routes (new files only)
- `POST /api/customers/[id]/invite/route.ts` — `ADMIN`/`SALES_REP`/`SALES_MANAGER`. Invalidates prior pending invites for that customer, creates a new one, returns the shareable `/onboard/<token>` URL. No email sending required — a copyable link is enough for the demo and doesn't require debugging SMTP under deadline.
- `GET /api/onboard/[token]/route.ts` — public. Validates hash + expiry + status, returns the customer/company name for display, never echoes the token back.
- `POST /api/onboard/[token]/route.ts` — public. Accepts `{ name, password }`, creates the `User` (`role: CUSTOMER`), sets `Customer.portalUserId`, marks invite `ACCEPTED`, writes an audit log via the existing `audit.service.ts` (import only).

### Pages (new files only)
- `src/app/onboard/[token]/page.tsx` — public, styled like `(auth)/login/page.tsx` (read for reference, don't edit).
- `src/app/(dashboard)/customers/page.tsx` — **this page doesn't exist at all today**, only the API route does. Build a standard list page (same table pattern as `products/page.tsx`) showing company name, tier, contact, portal status (linked / invite pending / not invited), with a "Send onboarding link" action per row that calls the invite endpoint and shows the result in a copyable modal.
- Add `/customers` to `NAV_ITEMS` in `src/components/TopNav.tsx` (one line — coordinate with file `03`, which also edits `TopNav.tsx` to complete the B1 menu items; land whichever is ready first, rebase the other).

### Middleware
Add `/onboard` to `publicRoutes` and `/customers` to `protectedRoutes` in `src/middleware.ts` — additive lines only.

## Part B — Auth/security hardening

1. **Hardcoded JWT fallback secret.** `src/middleware.ts` has:
   ```ts
   const DEFAULT_SECRET = "dealflow360-insecure-default-jwt-secret-replace-in-env-key-99881122";
   ```
   Also check `src/lib/auth/jwt.ts` and `src/lib/auth.ts` — yes, there are **two** auth-related files at the top level of `src/lib` (`auth.ts` and the `auth/` folder). Read both before changing anything; one may be dead code left over from an earlier refactor. Whichever is live: fail fast at startup if `JWT_SECRET`/equivalent env var is missing, instead of silently signing with a secret that's sitting in the repo in plain text.
2. **Lock down `/api/auth/register`.** It currently defaults unspecified `role` to `SALES_REP` and lets anyone self-register as internal staff. Once the invite flow exists, customers should only ever be created via `/onboard`; restrict `/api/auth/register` to `ADMIN`-only (`requireRole(['ADMIN'])`) for creating internal accounts. Confirm with the team first in case seed/demo login setup relies on open registration.
3. **Rate limit `/api/auth/login`.** Minimal in-memory counter (5 attempts / 15 min per email+IP) is enough — keep it self-contained in `src/lib/auth/`, don't restructure the login route itself.
4. **Dead-code cleanup while you're in here:** `src/app/api/admin/config/route.ts` returns hardcoded `discountThresholds` (`repMaxDiscount: 15`, etc.) that nothing in the actual discount/risk engines reads — the real ceilings come from `DiscountRule` in the DB. Either delete this route or repurpose it to actually read from `DiscountRule`/`ApprovalRule` (file `03` is building the real admin CRUD for those tables — coordinate so you don't duplicate work; if `03` is handling it, just delete this stale route and its unused nav link if any).

## Part C — Shared toast/error component (small, do this early — other branches depend on it)

`src/components/Toast.tsx` — a minimal toast/notification system (context provider + `useToast()` hook returning `{ success(msg), error(msg) }`) to replace every `alert()`/`confirm()` call across the app. Wire the provider into `src/app/(dashboard)/layout.tsx` (one small addition) and `src/app/portal/layout.tsx` if one exists, or `portal/quotation/page.tsx`'s parent otherwise. Push this early and tell the team it's ready — files `02` and `03` both need to swap their `alert()` calls over to it.

## Out of scope for this branch
- Order/status pipeline fix → file `00` (must already be merged)
- Subscription billing, negotiation, reports → file `02`
- Discount/approval/warehouse admin CRUD, upsell setup, product variants → file `03`

## Definition of done
- [ ] Admin/sales rep can generate an invite link from the new Customers page
- [ ] Customer can complete onboarding via the link and lands in the portal, linked to their `Customer` row
- [ ] Expired/used/revoked tokens fail gracefully, not with a 500
- [ ] No hardcoded secrets remain; login has basic rate limiting
- [ ] Shared `Toast` component exists, is wired into the dashboard layout, and is used everywhere in files you touch
