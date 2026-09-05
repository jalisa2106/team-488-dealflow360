import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { requireRole } from "@/lib/require-role";
import { z } from "zod";

/**
 * Admin-only user creation endpoint.
 *
 * Self-registration for internal roles (SALES_REP, ADMIN, etc.) is intentionally
 * locked to ADMIN callers. Customers are created exclusively via the invite flow:
 *   POST /api/customers/[id]/invite  →  GET/POST /api/onboard/[token]
 *
 * If you need a quick seed login during development, ask an ADMIN to create the
 * user or run the seed script directly.
 */
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z
    .enum(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"])
    .optional()
    .default("SALES_REP"),
});

export async function POST(req: NextRequest) {
  // Only ADMIN users may create internal staff accounts via this endpoint.
  const authResult = await requireRole(req, ["ADMIN"]);
  if ("response" in authResult) return authResult.response;

  try {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
