import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  customerTierId: z.string().optional(),
  categoryId: z.string().optional(),
  maxDiscountPercent: z.number().min(0).max(100),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const rules = await prisma.discountRule.findMany({
      include: { customerTier: true, category: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch discount rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const rule = await prisma.discountRule.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to create discount rule" }, { status: 500 });
  }
}
