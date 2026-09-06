import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  shippingBaseCost: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "OPERATIONS", "SALES_MANAGER"]);
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventories: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: warehouses });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "OPERATIONS"]);
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const warehouse = await prisma.warehouse.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
