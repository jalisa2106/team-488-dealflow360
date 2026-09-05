import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserRole } from "@/lib/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" }, user: null, data: null },
        { status: 401 }
      );
    }

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
  } catch (error) {
    console.error("Get session user error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
