import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            quote: {
              include: {
                customer: true,
                salesRep: true,
                quoteLines: {
                  include: { product: true },
                },
              },
            },
            fulfillmentAllocations: {
              include: { warehouse: true, product: true },
            },
          },
        },
        payments: { orderBy: { recordedAt: "desc" } },
        creditNotes: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireRole(["ADMIN", "FINANCE", "SALES_MANAGER"]);
    const { invoiceId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "MARK_PAID";
    const method = body.method || "BANK_TRANSFER";

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (action === "MARK_PAID") {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: invoice.amount,
            method,
            recordedAt: new Date(),
          },
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID" },
        });
      });

      return NextResponse.json({ success: true, message: "Payment recorded successfully" });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
