import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  minRiskScore: z.number().int().min(0),
  maxRiskScore: z.number().int().nullable().optional(),
  requiredRoles: z.string().min(1), // comma-separated e.g. "SALES_MANAGER,FINANCE"
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const rules = await prisma.approvalRule.findMany({
      orderBy: { minRiskScore: "asc" },
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch approval rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const rule = await prisma.approvalRule.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to create approval rule" }, { status: 500 });
  }
}
