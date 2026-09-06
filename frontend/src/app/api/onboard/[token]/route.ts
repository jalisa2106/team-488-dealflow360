import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/invite-token";
import { hashPassword } from "@/lib/auth/hash";
import { writeAuditLog } from "@/lib/services/audit.service";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const hashed = hashToken(params.token);

    const invite = await prisma.customerInvite.findUnique({
      where: { token: hashed },
      include: { customer: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invite is ${invite.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      await prisma.customerInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: invite.email,
        companyName: invite.customer.companyName,
        contactName: invite.customer.contactName,
      },
    });
  } catch (error) {
    console.error("GET onboard token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const OnboardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const hashed = hashToken(params.token);

    const invite = await prisma.customerInvite.findUnique({
      where: { token: hashed },
      include: { customer: true },
    });

    if (!invite || invite.status !== "PENDING" || new Date() > invite.expiresAt) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = OnboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, password } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Run in transaction: create user, update customer, mark invite accepted
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invite.email,
          passwordHash,
          name,
          role: "CUSTOMER",
        },
      });

      await tx.customer.update({
        where: { id: invite.customerId },
        data: { portalUserId: user.id },
      });

      await tx.customerInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      return user;
    });

    // Log the event
    await writeAuditLog({
      entityType: "CUSTOMER_ONBOARDING",
      entityId: invite.customerId,
      action: "CUSTOMER_REGISTERED",
      actorId: newUser.id,
      after: { email: newUser.email, name: newUser.name },
    });

    return NextResponse.json({ success: true, message: "Onboarding complete" });
  } catch (error) {
    console.error("POST onboard token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
