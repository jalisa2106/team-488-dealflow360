import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const UpdateSchema = z.object({
  minRiskScore: z.number().int().min(0).optional(),
  maxRiskScore: z.number().int().nullable().optional(),
  requiredRoles: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const rule = await prisma.approvalRule.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: rule });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to update approval rule" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    await prisma.approvalRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e.name === "UnauthorizedError") return NextResponse.json({ error: e.message }, { status: 401 });
    if (e.name === "ForbiddenError") return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Failed to delete approval rule" }, { status: 500 });
  }
}
