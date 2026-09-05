import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"]);

    const customers = await prisma.customer.findMany({
      include: {
        tier: true,
      },
      orderBy: {
        companyName: "asc",
      },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    if (error.name === "UnauthorizedError") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: error.message } },
        { status: 401 }
      );
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch customers" } },
      { status: 500 }
    );
  }
}
