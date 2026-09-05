import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"]);

    return NextResponse.json({
      success: true,
      data: {
        discountThresholds: {
          repMaxDiscount: 15,
          managerMaxDiscount: 30,
          vpMaxDiscount: 50,
        },
        updatedAt: new Date().toISOString(),
        user: session.email,
      },
    });
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
