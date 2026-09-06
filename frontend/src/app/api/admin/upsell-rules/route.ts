import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  productId: z.string().uuid(),
  suggestedProductId: z.string().uuid(),
  promotion: z.boolean().default(false),
  minMarginPercent: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const rules = await prisma.upsellRule.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        suggestedProduct: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch upsell rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const rule = await prisma.upsellRule.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to create upsell rule" }, { status: 500 });
  }
}
