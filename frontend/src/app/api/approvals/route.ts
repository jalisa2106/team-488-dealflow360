import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "SALES_MANAGER", "FINANCE"]);

    return NextResponse.json({
      success: true,
      data: {
        pendingApprovalsCount: 4,
        approvals: [
          { id: "app_101", quoteId: "Q-2026-004", requestedBy: "Sarah Rep", amount: 145000, discountPct: 22, status: "PENDING" },
          { id: "app_102", quoteId: "Q-2026-009", requestedBy: "John Rep", amount: 89000, discountPct: 18, status: "PENDING" },
        ],
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
