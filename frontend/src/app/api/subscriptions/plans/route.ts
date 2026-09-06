import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "SALES_MANAGER"]);

    const body = await req.json();
    const { name, frequency, price, prorationEnabled, cancellationRefundEnabled } = body;

    if (!name || price == null) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        frequency,
        price,
        prorationEnabled,
        cancellationRefundEnabled,
      },
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    console.error("Failed to create subscription plan:", error);
    if (error.name === "UnauthorizedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
