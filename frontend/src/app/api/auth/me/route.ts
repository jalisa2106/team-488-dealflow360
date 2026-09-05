import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE, getUserForRole } from "@/lib/auth";
import { UserRole } from "@/lib/types";

export async function GET() {
  try {
    // 1. Check demo role cookie first for instant, zero-delay simulator response
    const cookieStore = await cookies();
    const demoRole = cookieStore.get(DEMO_ROLE_COOKIE)?.value as UserRole | undefined;
    if (demoRole) {
      const demoUser = getUserForRole(demoRole);
      return NextResponse.json({
        success: true,
        data: { user: demoUser },
        user: demoUser,
      });
    }

    // 2. Check JWT session
    const session = await getSession();
    if (session && session.sub) {
      // If session exists from JWT payload, return user instantly without hanging on offline MSSQL
      const user = {
        id: session.sub,
        email: session.email,
        name: session.name || "User",
        role: session.role as UserRole,
        active: true,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: { user },
        user,
      });
    }

    return NextResponse.json({ success: false, user: null, data: null }, { status: 401 });
  } catch (error) {
    console.error("Get session user error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
