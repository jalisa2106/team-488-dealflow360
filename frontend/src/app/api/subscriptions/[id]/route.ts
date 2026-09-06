import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        quoteLine: { include: { product: true } },
        order: {
          include: {
            invoices: { orderBy: { createdAt: "desc" } },
            quote: { include: { customer: true } },
          },
        },
        billingSchedules: { orderBy: { billingDate: "asc" } },
      },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch subscription" }, { status: 500 });
  }
}
