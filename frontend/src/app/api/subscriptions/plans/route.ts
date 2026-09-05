import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });

    const body = await req.json();
    const { name, frequency, price } = body;

    if (!name || !frequency || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        frequency,
        price,
        prorationEnabled: true,
        cancellationRefundEnabled: true,
        active: true,
      }
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create subscription plan" },
      { status: 500 }
    );
  }
}
