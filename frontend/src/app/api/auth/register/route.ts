import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { requireRole } from "@/lib/auth/rbac";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z
    .enum(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS", "CUSTOMER"])
    .optional()
    .default("SALES_REP"),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: role as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: newUser, message: "User registered successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error.name === "UnauthorizedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
