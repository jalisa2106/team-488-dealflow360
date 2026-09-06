import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  shippingBaseCost: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "OPERATIONS"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const warehouse = await prisma.warehouse.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to update warehouse" }, { status: 500 });
  }
}
