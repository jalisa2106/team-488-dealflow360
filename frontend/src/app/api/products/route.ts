import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    await requireAuth();

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
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch products" } }, { status: 500 });
  }
}
