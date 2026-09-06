import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "SALES_MANAGER", "FINANCE"]);

    const users = await prisma.user.findMany({
      where: { active: true, role: { in: ["SALES_REP", "SALES_MANAGER"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError")
      return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
