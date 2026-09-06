import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const UpdateSchema = z.object({
  attributeName: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  extraPrice: z.number().min(0).optional(),
  sku: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { variantId } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const variant = await prisma.productVariant.update({ where: { id: variantId }, data: parsed.data });
    return NextResponse.json({ success: true, data: variant });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { variantId } = await params;
    await prisma.productVariant.delete({ where: { id: variantId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
