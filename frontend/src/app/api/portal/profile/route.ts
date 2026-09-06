import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/get-auth-session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: { portalUserId: session.sub },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: { portalUserId: session.sub },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { contactName, email } = body;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        contactName: contactName !== undefined ? contactName : customer.contactName,
        email: email !== undefined ? email : customer.email,
      },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
