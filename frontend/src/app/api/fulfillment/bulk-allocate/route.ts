import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "OPERATIONS", "SALES_MANAGER"]);

    const body = await req.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0 || action !== "MARK_FULFILLING") {
      return NextResponse.json({ success: false, error: "Invalid request payload" }, { status: 400 });
    }

    await prisma.order.updateMany({
      where: { id: { in: ids }, status: "CONFIRMED" },
      data: { status: "FULFILLING" },
    });

    return NextResponse.json({ success: true, message: "Orders marked as fulfilling" });
  } catch (error: any) {
    if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, error: error.message }, { status: error.name === "UnauthorizedError" ? 401 : 403 });
    }
    console.error("Bulk fulfillment update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update orders" }, { status: 500 });
  }
}
