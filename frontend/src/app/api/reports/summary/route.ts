import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

function periodStartDate(now: Date, period: string): Date {
  const d = new Date(now);
  switch (period) {
    case "last_month":
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    case "last_quarter":
      d.setMonth(d.getMonth() - 3);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    case "this_year":
      d.setMonth(0);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    default: // this_month
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
  }
}

function periodEndDate(now: Date, period: string): Date {
  if (period === "last_month") {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d; // start of this month = end of last month
  }
  return now;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "FINANCE", "SALES_MANAGER", "SALES_REP"]);

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "this_month";
    const repId = url.searchParams.get("repId") || "";
    const status = url.searchParams.get("status") || "";
    const productId = url.searchParams.get("productId") || "";

    const now = new Date();
    const startDate = periodStartDate(now, period);
    const endDate = periodEndDate(now, period);

    // Build quote where clause
    const quoteWhere: Record<string, unknown> = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (repId) quoteWhere.salesRepId = repId;
    if (status) quoteWhere.status = status;
    if (productId) {
      quoteWhere.quoteLines = { some: { productId } };
    }

    // KPI 1: Quotes created
    const quotesCreated = await prisma.quote.count({ where: quoteWhere });

    // KPI 2: Avg approval time (from ApprovalRequest.createdAt to actedAt)
    const actedApprovals = await prisma.approvalRequest.findMany({
      where: {
        actedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
        ...(repId ? { quote: { salesRepId: repId } } : {}),
      },
      select: { createdAt: true, actedAt: true },
    });
    let avgApprovalHours = 0;
    if (actedApprovals.length > 0) {
      const totalMs = actedApprovals.reduce((sum, a) => {
        return sum + (a.actedAt!.getTime() - a.createdAt.getTime());
      }, 0);
      avgApprovalHours = Math.round((totalMs / actedApprovals.length / 3600000) * 10) / 10;
    }

    // KPI 3: Top upsold product (most frequently appearing in RECURRING quote lines)
    const recurringLines = await prisma.quoteLine.groupBy({
      by: ["productId"],
      where: {
        billingType: "RECURRING",
        quote: {
          createdAt: { gte: startDate, lte: endDate },
          ...(repId ? { salesRepId: repId } : {}),
          ...(status ? { status } : {}),
        },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 1,
    });
    let topUpsoldProduct = "N/A";
    if (recurringLines.length > 0) {
      const p = await prisma.product.findUnique({
        where: { id: recurringLines[0].productId },
        select: { name: true },
      });
      topUpsoldProduct = p?.name ?? "N/A";
    }

    // Bottlenecks: per-role avg wait + pending count
    const roles = ["SALES_MANAGER", "FINANCE"];
    const bottlenecks = await Promise.all(
      roles.map(async (role) => {
        const pending = await prisma.approvalRequest.count({
          where: { role, status: "PENDING" },
        });
        const acted = await prisma.approvalRequest.findMany({
          where: {
            role,
            actedAt: { not: null },
            createdAt: { gte: startDate },
          },
          select: { createdAt: true, actedAt: true },
        });
        const avgWait =
          acted.length > 0
            ? Math.round(
                (acted.reduce(
                  (s, a) => s + (a.actedAt!.getTime() - a.createdAt.getTime()),
                  0
                ) /
                  acted.length /
                  3600000) *
                  10
              ) / 10
            : 0;
        return { role, pendingNow: pending, avgWaitHours: avgWait };
      })
    );

    return NextResponse.json({
      success: true,
      data: { quotesCreated, avgApprovalHours, topUpsoldProduct, bottlenecks },
    });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError")
      return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
