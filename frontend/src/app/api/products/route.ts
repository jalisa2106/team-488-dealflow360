import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "SALES_REP", "SALES_MANAGER", "FINANCE", "OPERATIONS"]);

    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    if (error.name === "UnauthorizedError") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: error.message } },
        { status: 401 }
      );
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch products" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "OPERATIONS"]);

    const body = await req.json();
    const { name, categoryId, type, unit, basePrice, costPrice, taxPercent, description } = body;
    let { sku } = body;

    if (!name || !categoryId || !type || basePrice == null) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!sku) {
      const { generateSKU } = await import("@/lib/sku");
      
      const category = await prisma.productCategory.findUnique({ where: { id: categoryId } });
      const catName = category ? category.name : "GEN";
      
      // Keep checking and incrementing counter to find a unique SKU
      let counter = 1;
      let uniqueSkuFound = false;
      
      while (!uniqueSkuFound) {
        sku = generateSKU(catName, type, name, counter);
        const existing = await prisma.product.findUnique({ where: { sku } });
        if (!existing) {
          uniqueSkuFound = true;
        } else {
          counter++;
        }
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku,
        categoryId,
        type,
        unit: unit || 'unit',
        basePrice,
        costPrice: costPrice || 0,
        taxPercent: taxPercent || 0,
        description,
      },
    });

    return NextResponse.json({ success: true, data: newProduct });
  } catch (error: any) {
    if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, error: error.message }, { status: error.name === "UnauthorizedError" ? 401 : 403 });
    }
    console.error("Product creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
