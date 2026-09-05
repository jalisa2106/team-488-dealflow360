import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    await requireAuth();

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
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch customers" } }, { status: 500 });
  }
}
