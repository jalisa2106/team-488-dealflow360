import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { listPendingApprovals } from "@/lib/services/approval.service";

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "SALES_MANAGER", "FINANCE"]);

    const approvals = await listPendingApprovals(session.role, session.sub);

    return NextResponse.json({
      success: true,
      data: {
        pendingApprovalsCount: approvals.length,
        approvals,
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
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}