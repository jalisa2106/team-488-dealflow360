# Branch 1 — Customer Onboarding & Access Security
**Suggested branch name:** `feature/onboarding-access`
**Owner:** Teammate 1
**Do not touch outside this file's listed paths** — that's what keeps this branch mergeable without conflicts.

## Why this exists
Reviewer feedback: *"if an admin or sales rep wants to onboard someone, we should be able to send link to customer and then onboard to platform."*

Right now `Customer.portalUserId` exists in the schema but there's no way to actually create that link — an admin has to hit `/api/auth/register` by hand with role `CUSTOMER` and then manually wire the `portalUserId` in the DB. There is no invite, no token, no customer-facing "finish setting up your account" screen. This branch builds that end-to-end, and folds in the auth hardening the app needs before a jury looks under the hood.

---

## Part A — Invite-link onboarding flow

### 1. Schema (`prisma/schema.prisma`)
Add a new model — do not touch any existing model's fields besides adding the relation:
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
Then add the two back-relations as **additive** lines only:
- On `Customer`: `invites CustomerInvite[]`
- On `User`: `sentInvites CustomerInvite[] @relation("InvitedByUser")`

Run `npx prisma migrate dev --name add_customer_invites` on your own branch/DB — do not touch other teammates' migration files.

### 2. Token generation & hashing (new file: `src/lib/auth/invite-token.ts`)
- Generate with `crypto.randomBytes(32).toString('hex')`.
- Store only a SHA-256 hash of the token in `CustomerInvite.token`; put the raw token in the link. (Same pattern as password reset tokens — if a DB dump leaks, links stay unusable.)
- Default expiry: 7 days.

### 3. API routes (new files only)
- `POST /api/customers/[id]/invite/route.ts` — role-gated to `ADMIN`, `SALES_REP`, `SALES_MANAGER`. Creates a `CustomerInvite`, invalidates any prior pending invite for that customer, returns the shareable URL (`/onboard/<token>`). Do not send email yet unless you want to add `nodemailer`/`resend` as a new dependency — for the demo, a copyable link the sales rep pastes into their own email/WhatsApp is enough and is more reliable than debugging SMTP the night before a jury round.
- `GET /api/onboard/[token]/route.ts` — public (add to `publicRoutes` in `middleware.ts`, see below), validates token hash + expiry + status, returns customer/company name for the confirmation screen (never leak the token back).
- `POST /api/onboard/[token]/route.ts` — public, accepts `{ name, password }`, creates the `User` (`role: CUSTOMER`), sets `Customer.portalUserId`, marks the invite `ACCEPTED`, and logs into `AuditLog` (reuse existing `audit.service.ts` — import only, don't modify it).

### 4. Pages (new files only)
- `src/app/onboard/[token]/page.tsx` — public page: "You've been invited by {companyName rep} — set your password to access the customer portal." Reuse the visual language of `src/app/(auth)/login/page.tsx` (read it for styling, don't edit it).
- On the customer detail page `src/app/(dashboard)/customers/...` — **if that route doesn't exist yet**, add a minimal one at `src/app/(dashboard)/customers/page.tsx` (currently there is no dedicated Customers page at all, only the `/api/customers` route — check before you build to avoid duplicating anyone else's work) with a "Send onboarding link" button per row that calls the new invite endpoint and shows the generated link in a copyable modal/toast.

### 5. Middleware update (`src/middleware.ts`)
This file is shared — make **one small, additive edit**: add `/onboard` to `publicRoutes`. Do not restructure the file. Coordinate in your team chat before pushing since Part B below also touches this file — land whichever PR is ready first, the other rebases.

---

## Part B — Auth/security hardening (production-grade pass)

These are small, surgical fixes reviewers will notice immediately if left in:

1. **Hardcoded JWT fallback secret** — `src/middleware.ts` currently has:
   ```ts
   const DEFAULT_SECRET = "dealflow360-insecure-default-jwt-secret-replace-in-env-key-99881122";
   ```
   Fail fast instead: if `process.env.JWT_SECRET` (or whatever the current env var is named — check `src/lib/auth/jwt.ts` for the actual name) is missing, throw at startup rather than silently signing tokens with a secret that's sitting in plain text in the repo. Apply the same check in `src/lib/auth/jwt.ts` if it has its own fallback.
2. **Password/registration hardening** — `src/app/api/auth/register/route.ts` currently defaults `role` to `SALES_REP` for anyone who calls it with no role. Once the invite flow above exists, self-registration as an internal role (`SALES_REP`, `ADMIN`, etc.) via the public register endpoint should be removed or locked down to `ADMIN`-only (`requireRole`) — customers should now only ever be created via the invite flow, internal staff should be created by an admin. Confirm with the team before removing anything since this may be relied on for seeding/demo logins.
3. **Rate limiting on `/api/auth/login`** — add a minimal in-memory or DB-backed attempt counter (5 attempts / 15 min per email+IP is enough for a jury demo) so a brute-force isn't trivially possible. Keep it self-contained in `src/lib/auth/` — don't touch the login route's core logic beyond calling your new check.
4. **`.env` hygiene** — confirm `.env` and `.env.local` (present in the repo root) are actually gitignored going forward and that no real DB credentials remain in git history from earlier commits; flag to the team if they do rather than force-pushing history rewrites yourself.

## Out of scope for this branch (other teammates own these)
- Quotation list search/filter/multi-select, quote pipeline data audit → Branch 2
- Product multi-select, groupby filters on products/fulfillment/orders → Branch 3

## Definition of done
- [ ] Admin/sales rep can generate an invite link from the customer record
- [ ] Customer can open the link, set a password, and lands in the portal already linked to their `Customer` row
- [ ] Expired/used/revoked tokens are rejected with a clear message, not a 500
- [ ] No hardcoded secrets remain in `middleware.ts` / `jwt.ts`
- [ ] Login has basic rate limiting
