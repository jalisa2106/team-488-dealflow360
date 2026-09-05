import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"]);

    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ success: true, data: products });
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch products" } },
      { status: 500 }
    );
  }
}
