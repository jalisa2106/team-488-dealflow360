import { NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  try {
    await clearSessionCookie();

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Explicitly overwrite response cookie header to force immediate deletion in browser
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
