import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

import { calculateProration } from "@/lib/engines/billing.engine";
import { writeAuditLog } from "@/lib/services/audit.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN", "FINANCE", "SALES_MANAGER"]);
    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        order: {
          include: {
            invoices: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        billingSchedules: {
          where: { status: "PENDING" },
          orderBy: { billingDate: "asc" },
          take: 1,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Subscription is already cancelled" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startedAt = subscription.startedAt;

    // Compute period end = next billing date from the pending schedule (or estimate)
    const nextBillingSchedule = subscription.billingSchedules[0];
    const periodEnd = nextBillingSchedule
      ? new Date(nextBillingSchedule.billingDate)
      : (() => {
          const d = new Date(startedAt);
          const freq = subscription.subscriptionPlan.frequency;
          if (freq === "MONTHLY") d.setMonth(d.getMonth() + 1);
          else if (freq === "QUARTERLY") d.setMonth(d.getMonth() + 3);
          else d.setFullYear(d.getFullYear() + 1);
          return d;
        })();

    // Compute proration credit (negative = credit to customer)
    const proration = calculateProration({
      planPricePerPeriod: Number(subscription.subscriptionPlan.price),
      periodStartDate: startedAt,
      periodEndDate: periodEnd,
      changeDate: now,
      quantityDelta: -Number(subscription.quantity), // full cancellation
    });

    // If credit amount > 0 and there's an invoice, create a CreditNote
    let creditNote = null;
    const creditAmount = Math.abs(proration.proratedAmount);

    if (creditAmount > 0 && subscription.order?.invoices?.[0]) {
      const invoice = subscription.order.invoices[0];
      creditNote = await prisma.creditNote.create({
        data: {
          invoiceId: invoice.id,
          amount: creditAmount,
          reason: `Prorated refund for cancellation on ${now.toISOString().split("T")[0]} (${proration.daysRemaining} days remaining in cycle)`,
        },
      });
    }

    // Cancel the subscription
    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Cancel any pending billing schedules
    await prisma.billingSchedule.updateMany({
      where: { subscriptionId: id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // Audit log
    await writeAuditLog({
      entityType: "SUBSCRIPTION",
      entityId: id,
      action: "SUBSCRIPTION_CANCELLED",
      actorId: (session as unknown as { id: string }).id,
      before: { status: subscription.status },
      after: {
        status: "CANCELLED",
        creditAmount: creditNote ? creditAmount : 0,
        creditNoteId: creditNote?.id ?? null,
      },
      reason: "Admin/Finance cancellation",
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription: updated,
        creditNote,
        proration: {
          daysRemaining: proration.daysRemaining,
          creditAmount,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Cancel subscription error:", error);
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError")
      return NextResponse.json({ success: false, error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError")
      return NextResponse.json({ success: false, error: e.message }, { status: 403 });
    return NextResponse.json(
      { success: false, error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
