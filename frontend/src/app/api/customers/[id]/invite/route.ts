import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/require-role";
import { generateRawToken, hashToken, buildInviteUrl, getExpiryDate } from "@/lib/auth/invite-token";

/**
 * POST /api/customers/[id]/invite
 *
 * Role-gated: ADMIN, SALES_REP, SALES_MANAGER
 *
 * Creates a CustomerInvite for the given customer.
 * Invalidates any prior PENDING invite so only one active link exists at a time.
 * Returns the shareable invite URL — the sales rep pastes it wherever they like.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(req, ["ADMIN", "SALES_REP", "SALES_MANAGER"]);
  if ("response" in authResult) return authResult.response;
  const { ctx } = authResult;

  const { id: customerId } = params;

  try {
    // Validate the customer exists and get their email
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true, email: true, portalUserId: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found." } },
        { status: 404 }
      );
    }

    // Prevent re-inviting a customer who already has a portal account
    if (customer.portalUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_ONBOARDED",
            message: "This customer already has a portal account.",
          },
        },
        { status: 409 }
      );
    }

    // Invalidate any existing PENDING invite for this customer
    await prisma.customerInvite.updateMany({
      where: { customerId, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    // Generate a new invite token
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = getExpiryDate(7);

    await prisma.customerInvite.create({
      data: {
        customerId,
        email: customer.email || "",
        token: tokenHash,
        status: "PENDING",
        invitedById: ctx.userId,
        expiresAt,
      },
    });

    const inviteUrl = buildInviteUrl(rawToken);

    return NextResponse.json({
      success: true,
      data: {
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        customerName: customer.companyName,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/customers/[id]/invite] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create invite." } },
      { status: 500 }
    );
  }
}
