import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { generateInviteToken } from "@/lib/auth/invite-token";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["ADMIN", "SALES_REP", "SALES_MANAGER"]);

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: "Customer does not have an email address set" },
        { status: 400 }
      );
    }

    // Revoke previous pending invites
    await prisma.customerInvite.updateMany({
      where: {
        customerId: customer.id,
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
      },
    });

    // Generate new token
    const { token, hash } = generateInviteToken();

    // 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invite
    await prisma.customerInvite.create({
      data: {
        customerId: customer.id,
        email: customer.email,
        token: hash,
        invitedById: session.sub,
        expiresAt,
      },
    });

    // The raw token goes in the URL, not the hash.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrlOrigin(req);
    const inviteUrl = `${baseUrl}/onboard/${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: "Invite generated successfully",
    });
  } catch (error: any) {
    console.error("Invite generation error:", error);
    if (error.name === "UnauthorizedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function requestUrlOrigin(req: NextRequest) {
  return `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}
