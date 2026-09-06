# 04 — Customer Portal Completion & Real Email Onboarding
**Branch:** `feature/portal-completion` (continues file `01`'s owner)
**Depends on:** file `01` (onboarding invite links + Toast component) merged.
**Scope:** `src/app/portal/**` (new `messages` and `profile` pages), `src/app/api/portal/**`, `src/lib/auth/invite-token.ts` / the invite route from file `01` (extend, don't rewrite), plus one new dependency for email sending.

## 1. Send the onboarding link by actual email, not just a copyable link

File `01` deliberately shipped the invite as a copyable link to avoid an SMTP dependency under deadline. Your reviewer feedback is now explicit that they want the real thing: *"admin or sales representative want to onboard a customer, then they should be able to send the email to the customer."* Add it now that the base flow works:

1. Add `resend` (simplest for a short-lived hackathon app — API-key only, no SMTP config) or `nodemailer` if you'd rather use an existing SMTP account (Gmail app password, etc.) — pick whichever your team can get credentials for fastest, don't burn demo-eve time evaluating providers.
2. New file `src/lib/email/send-invite-email.ts` — one function, `sendInviteEmail({ to, companyName, inviteUrl, invitedByName })`, rendering a plain-but-clean HTML email (subject: "You've been invited to the DealFlow360 customer portal"). Keep the template in the same file — no need for a templating library at this scale.
3. In `POST /api/customers/[id]/invite/route.ts` (from file `01`), after creating the `CustomerInvite` row, call `sendInviteEmail(...)`. **Keep returning the raw URL in the API response too** — if email delivery fails (bad API key, rate limit, etc.) the sales rep can still copy/paste it manually rather than being stuck. Wrap the send in try/catch and don't fail the whole request if the email bounces — log it and tell the UI "invite created, email may not have sent" via the Toast component from file `01`.
4. Env vars: add `RESEND_API_KEY` (or SMTP equivalent) to `.env.local` / your deployment env, and document it in `frontend/README.md` so whoever deploys for the jury demo doesn't get a silent failure.

## 2. Customer portal: Messages page (currently missing)

The spec's B8 negotiation screen already has "line level comment and change request" on the *quotation* — check `src/app/portal/quotation/page.tsx` first, since that may already cover this at the per-quote level and a separate global "Messages" page may be redundant. If your team genuinely wants a standalone inbox (e.g., for messages not tied to one specific quote):

1. New page: `src/app/portal/messages/page.tsx` — reuse the existing `Negotiation`/`NegotiationMessage` models if they're generic enough (check `schema.prisma`); don't invent a second messaging table if one already exists that just isn't surfaced outside the quote-detail view.
2. If `NegotiationMessage` is quote-scoped only (likely, given the model name), the more honest fix is: make this page a cross-quote inbox that lists all `NegotiationMessage` rows across the customer's quotes, grouped by quote, linking back into each quote's negotiation thread — rather than building a parallel free-standing chat feature the spec never actually asked for. Keep scope tight here.

## 3. Customer portal: Profile page (currently missing)

1. New page: `src/app/portal/profile/page.tsx` — the customer's own `Customer` record (company name, contact name, email) as a read-only view plus an editable contact-name/email form (`PATCH /api/portal/profile/route.ts`, restricted so a portal user can only ever update the `Customer` row their own `portalUserId` points to — verify this server-side, never trust a customer-supplied `customerId` in the request body).
2. Include a password-change control here too while you're building the page — check whether one exists anywhere for `CUSTOMER`-role users; if not, this is the natural place for it (`POST /api/portal/profile/password/route.ts`, requires current password).
3. Add both new routes to the portal's own nav (wherever `portal/quotation/page.tsx`'s parent layout renders portal navigation — if there isn't a persistent portal nav/header yet, that's worth adding too, otherwise Messages/Profile will be orphan pages nobody can reach without typing the URL).

## 4. Verification: "create customer user and check"

This is a manual test, not a code change — but write it down so it's repeatable and someone other than the person who built it can run it:
1. As `ADMIN` or `SALES_REP`, go to the Customers page (file `01`), send an invite to a real test email address you control.
2. Confirm the email arrives (or, if email isn't wired yet, use the returned link directly) and complete onboarding.
3. Log in as that new customer, confirm you land in the portal (not the internal dashboard — check `middleware.ts`/RBAC routes this correctly for `CUSTOMER` role), and confirm `Customer.portalUserId` is actually set in the DB, not just a `User` row floating unlinked.
4. Confirm the new customer can see their own quotations (if any exist) and cannot see any other customer's data — this is a real security check, not just a UI smoke test.

## Out of scope for this branch
- Onboarding link generation, Customers list page, auth hardening, Toast → already in file `01`
- Anything under `products`, `subscriptions`, `admin`, `fulfillment`, `orders` → files `05`/`06`

## Definition of done
- [ ] Sending an onboarding invite actually emails the customer, with the link still returned/shown as a fallback
- [ ] Customer portal has working Messages and Profile pages, reachable from portal navigation
- [ ] A documented, repeatable manual test confirms a newly onboarded customer is correctly scoped to their own data
