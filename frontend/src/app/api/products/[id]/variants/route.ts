import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const CreateSchema = z.object({
  attributeName: z.string().min(1),
  value: z.string().min(1),
  extraPrice: z.number().min(0).default(0),
  sku: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"]);
    const { id: productId } = await params;
    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ attributeName: "asc" }, { value: "asc" }],
    });
    return NextResponse.json({ success: true, data: variants });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id: productId } = await params;
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const variant = await prisma.productVariant.create({
      data: { productId, ...parsed.data },
    });
    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}
