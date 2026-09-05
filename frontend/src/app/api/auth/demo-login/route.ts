import { NextRequest, NextResponse } from "next/server";
import { UserRole, DEMO_USERS } from "@/lib/types";
import { DEMO_ROLE_COOKIE } from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role as UserRole;

    if (!role || !DEMO_USERS[role]) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: "Unknown role specified." } },
        { status: 400 }
      );
    }

    const user = DEMO_USERS[role];
    const redirectUrl = role === "CUSTOMER" ? "/portal/quotation" : "/dashboard";

    // Set signed JWT session cookie
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user,
        redirectUrl,
      },
    });

    // Also set demo_role cookie for client-side quick-switching compatibility
    response.cookies.set(DEMO_ROLE_COOKIE, role, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Demo login error:", err);
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid request body" } },
      { status: 400 }
    );
  }
}
