import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// -----------------------------------------------------------------------------
// 1. Fixed Reference & Demo Data
// -----------------------------------------------------------------------------
async function seedFixedReferenceData() {
  console.log("Seeding fixed customer tiers...");
  const tiers = [
    { name: "BRONZE", defaultDiscountPercent: 5.0 },
    { name: "SILVER", defaultDiscountPercent: 10.0 },
    { name: "GOLD", defaultDiscountPercent: 15.0 },
  ];

  const tierMap: Record<string, string> = {};
  for (const t of tiers) {
    const record = await prisma.customerTier.upsert({
      where: { name: t.name },
      update: { defaultDiscountPercent: t.defaultDiscountPercent },
      create: { name: t.name, defaultDiscountPercent: t.defaultDiscountPercent },
    });
    tierMap[t.name] = record.id;
  }

  console.log("Seeding product categories...");
  const categories = ["Hardware", "Service", "Subscription"];
  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const record = await prisma.productCategory.upsert({
      where: { name: c },
      update: {},
      create: { name: c },
    });
    categoryMap[c] = record.id;
  }

  console.log("Seeding products...");
  const products = [
    {
      name: "Laptop Pro",
      sku: "LAP-PRO-001",
      categoryName: "Hardware",
      type: "HARDWARE",
      unit: "unit",
      basePrice: 120000,
      costPrice: 90000,
      taxPercent: 18,
      description: "Enterprise-grade laptop",
    },
    {
      name: "Enterprise Server",
      sku: "SRV-ENT-001",
      categoryName: "Hardware",
      type: "HARDWARE",
      unit: "unit",
      basePrice: 350000,
      costPrice: 260000,
      taxPercent: 18,
      description: "Rack server",
    },
    {
      name: "Setup Service",
      sku: "SVC-SETUP-001",
      categoryName: "Service",
      type: "SERVICE",
      unit: "unit",
      basePrice: 3000,
      costPrice: 1200,
      taxPercent: 18,
      description: "On-site setup service",
    },
    {
      name: "Implementation Service",
      sku: "SVC-IMPL-001",
      categoryName: "Service",
      type: "SERVICE",
      unit: "unit",
      basePrice: 45000,
      costPrice: 20000,
      taxPercent: 18,
      description: "Full implementation engagement",
    },
    {
      name: "Premium Support",
      sku: "SUB-SUPPORT-001",
      categoryName: "Subscription",
      type: "SUBSCRIPTION",
      unit: "unit",
      basePrice: 5000,
      costPrice: 1500,
      taxPercent: 18,
      description: "Monthly premium support plan",
    },
    {
      name: "Cloud Platform",
      sku: "SUB-CLOUD-001",
      categoryName: "Subscription",
      type: "SUBSCRIPTION",
      unit: "unit",
      basePrice: 8000,
      costPrice: 3000,
      taxPercent: 18,
      description: "Monthly cloud platform access",
    },
  ];

  const productMap: Record<string, string> = {};
  for (const p of products) {
    const record = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        categoryId: categoryMap[p.categoryName],
        type: p.type,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        taxPercent: p.taxPercent,
        description: p.description,
      },
      create: {
        name: p.name,
        sku: p.sku,
        categoryId: categoryMap[p.categoryName],
        type: p.type,
        unit: p.unit,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        taxPercent: p.taxPercent,
        description: p.description,
      },
    });
    productMap[p.sku] = record.id;
  }

  console.log("Seeding discount rules...");
  const discountRules = [
    { customerTierId: tierMap["BRONZE"], categoryId: null, maxDiscountPercent: 5, priority: 1 },
    { customerTierId: tierMap["SILVER"], categoryId: null, maxDiscountPercent: 10, priority: 1 },
    { customerTierId: tierMap["GOLD"], categoryId: null, maxDiscountPercent: 15, priority: 1 },
    { customerTierId: null, categoryId: categoryMap["Hardware"], maxDiscountPercent: 15, priority: 2 },
    { customerTierId: null, categoryId: categoryMap["Service"], maxDiscountPercent: 10, priority: 2 },
    { customerTierId: null, categoryId: categoryMap["Subscription"], maxDiscountPercent: 10, priority: 2 },
  ];

  for (const dr of discountRules) {
    const existing = await prisma.discountRule.findFirst({
      where: {
        customerTierId: dr.customerTierId,
        categoryId: dr.categoryId,
      },
    });
    if (!existing) {
      await prisma.discountRule.create({ data: dr });
    }
  }

  console.log("Seeding approval rules...");
  const approvalRules = [
    { minRiskScore: 0, maxRiskScore: 9, requiredRoles: "" },
    { minRiskScore: 10, maxRiskScore: 24, requiredRoles: "SALES_MANAGER" },
    { minRiskScore: 25, maxRiskScore: null, requiredRoles: "SALES_MANAGER,FINANCE" },
  ];

  for (const ar of approvalRules) {
    const existing = await prisma.approvalRule.findFirst({
      where: { minRiskScore: ar.minRiskScore },
    });
    if (!existing) {
      await prisma.approvalRule.create({ data: ar });
    }
  }

  console.log("Seeding warehouses...");
  const warehouses = [
    { name: "Main Warehouse", code: "MAIN", shippingBaseCost: 500 },
    { name: "East Depot", code: "EAST", shippingBaseCost: 700 },
  ];

  const warehouseMap: Record<string, string> = {};
  for (const w of warehouses) {
    const record = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, shippingBaseCost: w.shippingBaseCost },
      create: { name: w.name, code: w.code, shippingBaseCost: w.shippingBaseCost },
    });
    warehouseMap[w.code] = record.id;
  }

  console.log("Seeding inventory (60/40 laptop split)...");
  const inventoryItems = [
    { whCode: "MAIN", sku: "LAP-PRO-001", qty: 60 },
    { whCode: "EAST", sku: "LAP-PRO-001", qty: 40 },
    { whCode: "MAIN", sku: "SRV-ENT-001", qty: 15 },
    { whCode: "EAST", sku: "SRV-ENT-001", qty: 10 },
    { whCode: "MAIN", sku: "SVC-SETUP-001", qty: 9999 },
    { whCode: "MAIN", sku: "SVC-IMPL-001", qty: 9999 },
  ];

  for (const inv of inventoryItems) {
    const warehouseId = warehouseMap[inv.whCode];
    const productId = productMap[inv.sku];
    if (warehouseId && productId) {
      await prisma.inventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId,
          },
        },
        update: { quantityAvailable: inv.qty },
        create: {
          warehouseId,
          productId,
          quantityAvailable: inv.qty,
        },
      });
    }
  }

  console.log("Seeding subscription plans...");
  const subPlans = [
    { name: "Premium Support Monthly", frequency: "MONTHLY", price: 5000 },
    { name: "Cloud Platform Monthly", frequency: "MONTHLY", price: 8000 },
  ];

  for (const sp of subPlans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: sp.name },
    });
    if (!existing) {
      await prisma.subscriptionPlan.create({
        data: {
          name: sp.name,
          frequency: sp.frequency,
          price: sp.price,
          prorationEnabled: true,
          cancellationRefundEnabled: true,
        },
      });
    }
  }

  console.log("Seeding demo customers...");
  const demoCustomers = [
    { company: "Acme Corp", contact: "John Doe", email: "john@acme.com", tier: "GOLD" },
    { company: "Beta Industries", contact: "Priya Shah", email: "priya@beta-industries.com", tier: "SILVER" },
    { company: "Nova Systems", contact: "Sam Patel", email: "sam@novasystems.com", tier: "BRONZE" },
  ];

  for (const c of demoCustomers) {
    const existing = await prisma.customer.findFirst({
      where: { companyName: c.company },
    });
    if (!existing) {
      await prisma.customer.create({
        data: {
          companyName: c.company,
          contactName: c.contact,
          email: c.email,
          tierId: tierMap[c.tier],
          currency: "INR",
        },
      });
    }
  }

  console.log("Seeding product co-purchases...");
  const coPurchases = [
    { skuA: "LAP-PRO-001", skuB: "SUB-SUPPORT-001", freq: 72 },
    { skuA: "LAP-PRO-001", skuB: "SVC-SETUP-001", freq: 61 },
    { skuA: "SRV-ENT-001", skuB: "SVC-IMPL-001", freq: 84 },
    { skuA: "SRV-ENT-001", skuB: "SUB-SUPPORT-001", freq: 68 },
  ];

  for (const cp of coPurchases) {
    const pId = productMap[cp.skuA];
    const coPId = productMap[cp.skuB];
    if (pId && coPId) {
      await prisma.productCoPurchase.upsert({
        where: {
          productId_coProductId: {
            productId: pId,
            coProductId: coPId,
          },
        },
        update: { frequency: cp.freq },
        create: {
          productId: pId,
          coProductId: coPId,
          frequency: cp.freq,
        },
      });
    }
  }

  console.log("Seeding upsell rules...");
  const lapId = productMap["LAP-PRO-001"];
  const subSuppId = productMap["SUB-SUPPORT-001"];
  if (lapId && subSuppId) {
    const existing = await prisma.upsellRule.findFirst({
      where: { productId: lapId, suggestedProductId: subSuppId },
    });
    if (!existing) {
      await prisma.upsellRule.create({
        data: {
          productId: lapId,
          suggestedProductId: subSuppId,
          promotion: true,
          minMarginPercent: 10,
        },
      });
    }
  }

  return { tierMap, categoryMap, productMap };
}

// -----------------------------------------------------------------------------
// 2. Demo User Accounts
// -----------------------------------------------------------------------------
async function seedDemoAccounts() {
  console.log("Seeding demo accounts...");
  const demoUsers = [
    { email: "admin@dealflow.com", name: "Admin User", role: "ADMIN", password: "admin360" },
    { email: "sales@demo.com", name: "Sales Rep", role: "SALES_REP", password: "DemoPass123!" },
    { email: "sales@dealflow.com", name: "Sarah Sales", role: "SALES_REP", password: "sales360" },
    { email: "manager@demo.com", name: "Mike Manager", role: "SALES_MANAGER", password: "DemoPass123!" },
    { email: "manager@dealflow.com", name: "Mike Manager", role: "SALES_MANAGER", password: "manager360" },
    { email: "finance@demo.com", name: "Fiona Finance", role: "FINANCE", password: "DemoPass123!" },
    { email: "finance@dealflow.com", name: "Fiona Finance", role: "FINANCE", password: "finance360" },
  ];

  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
      },
    });
  }
}

// -----------------------------------------------------------------------------
// 3. Bulk Filler Data (Optional for pagination/filtering tests)
// -----------------------------------------------------------------------------
async function seedBulkFillerData(tierMap: Record<string, string>) {
  console.log("Seeding bulk filler customers and data...");
  const tierKeys = Object.keys(tierMap);

  for (let i = 0; i < 20; i++) {
    const company = faker.company.name();
    const existing = await prisma.customer.findFirst({
      where: { companyName: company },
    });
    if (!existing) {
      const randomTier = faker.helpers.arrayElement(tierKeys);
      await prisma.customer.create({
        data: {
          companyName: company,
          contactName: faker.person.fullName(),
          email: faker.internet.email(),
          tierId: tierMap[randomTier],
          currency: "INR",
          active: true,
        },
      });
    }
  }
}

// -----------------------------------------------------------------------------
// Main execution
// -----------------------------------------------------------------------------
async function main() {
  const { tierMap } = await seedFixedReferenceData();
  await seedDemoAccounts();

  if (process.env.SEED_BULK_DATA === "true") {
    await seedBulkFillerData(tierMap);
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
