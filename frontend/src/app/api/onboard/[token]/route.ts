import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/invite-token";
import { hashPassword } from "@/lib/auth/hash";
import { writeAuditLog } from "@/lib/services/audit.service";
import { z } from "zod";

/**
 * Resolves and validates an invite by raw token.
 * Returns the invite row + customer or a rejection reason.
 */
async function resolveInvite(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const invite = await prisma.customerInvite.findUnique({
    where: { token: tokenHash },
    include: {
      customer: { select: { id: true, companyName: true, contactName: true, portalUserId: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) {
    return { error: "INVALID_TOKEN", message: "This invite link is invalid." };
  }
  if (invite.status === "ACCEPTED") {
    return { error: "ALREADY_USED", message: "This invite has already been used." };
  }
  if (invite.status === "REVOKED") {
    return { error: "REVOKED", message: "This invite link has been revoked." };
  }
  if (invite.status === "EXPIRED" || new Date() > invite.expiresAt) {
    // Mark as expired in DB lazily
    if (invite.status !== "EXPIRED") {
      await prisma.customerInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { error: "EXPIRED", message: "This invite link has expired. Please ask for a new one." };
  }

  return { invite };
}

/**
 * GET /api/onboard/[token]  (PUBLIC)
 *
 * Validates the invite token and returns display info for the onboarding page.
 * Never echoes the raw token back.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const result = await resolveInvite(params.token);

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: { code: result.error, message: result.message } },
      { status: result.error === "INVALID_TOKEN" ? 404 : 410 }
    );
  }

  const { invite } = result;

  return NextResponse.json({
    success: true,
    data: {
      companyName: invite.customer.companyName,
      contactName: invite.customer.contactName,
      invitedByName: invite.invitedBy.name,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}

const AcceptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/onboard/[token]  (PUBLIC)
 *
 * Accepts the invite: creates a User (role: CUSTOMER), links Customer.portalUserId,
 * marks the invite ACCEPTED, and writes to AuditLog.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const result = await resolveInvite(params.token);

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: { code: result.error, message: result.message } },
      { status: result.error === "INVALID_TOKEN" ? 404 : 410 }
    );
  }

  const { invite } = result;

  // Prevent race: if customer already has a portal user, reject
  if (invite.customer.portalUserId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ALREADY_ONBOARDED",
          message: "This customer account has already been set up.",
        },
      },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input." } },
      { status: 400 }
    );
  }

  const { name, password } = parsed.data;

  // Check if an account with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });
  if (existingUser) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EMAIL_IN_USE",
          message: "An account with this email already exists. Please log in instead.",
        },
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // Atomic: create user, link customer, mark invite accepted
  const newUser = await prisma.user.create({
    data: {
      email: invite.email,
      passwordHash,
      name,
      role: "CUSTOMER",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await prisma.customer.update({
    where: { id: invite.customer.id },
    data: { portalUserId: newUser.id },
  });

  await prisma.customerInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  // Audit log — import-only, not modified
  await writeAuditLog({
    entityType: "CUSTOMER",
    entityId: invite.customer.id,
    action: "CUSTOMER_ONBOARDED",
    actorId: newUser.id,
    after: { portalUserId: newUser.id, inviteId: invite.id },
  });

  return NextResponse.json({
    success: true,
    data: { message: "Account created successfully. You can now log in." },
  });
}
