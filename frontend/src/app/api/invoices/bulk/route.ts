import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "FINANCE"]);

    const body = await req.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0 || action !== "MARK_PAID") {
      return NextResponse.json({ success: false, error: "Invalid request payload" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Create payment records for each invoice
      const invoices = await tx.invoice.findMany({ where: { id: { in: ids } } });
      
      for (const inv of invoices) {
        if (inv.status !== "PAID") {
          await tx.payment.create({
            data: {
              invoiceId: inv.id,
              amount: inv.amount,
              method: "BULK_UPDATE",
            },
          });
        }
      }

      await tx.invoice.updateMany({
        where: { id: { in: ids } },
        data: { status: "PAID" },
      });
    });

    return NextResponse.json({ success: true, message: "Invoices marked as paid" });
  } catch (error: any) {
    if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, error: error.message }, { status: error.name === "UnauthorizedError" ? 401 : 403 });
    }
    console.error("Bulk invoice update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update invoices" }, { status: 500 });
  }
}
