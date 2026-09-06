import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

faker.seed(360360); // deterministic-ish but varied output

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

let quoteSeq = Math.floor(Math.random() * 8000) + 1000;
let orderSeq = Math.floor(Math.random() * 8000) + 1000;
let invoiceSeq = Math.floor(Math.random() * 8000) + 1000;
function nextQuoteNumber() {
  quoteSeq += 1;
  return `Q-2026-${Date.now().toString().slice(-4)}${quoteSeq}`;
}
function nextOrderNumber() {
  orderSeq += 1;
  return `ORD-2026-${Date.now().toString().slice(-4)}${orderSeq}`;
}
function nextInvoiceNumber() {
  invoiceSeq += 1;
  return `INV-2026-${Date.now().toString().slice(-4)}${invoiceSeq}`;
}

// -----------------------------------------------------------------------------
// 1. Users (every role, active + inactive)
// -----------------------------------------------------------------------------
async function seedUsers() {
  console.log("Seeding users (all roles, incl. inactive)...");

  const users = [
    { email: "admin@dealflow.com", name: "Admin User", role: "ADMIN", password: "admin360", active: true },
    { email: "priyanka.mehta@dealflow.com", name: "Priyanka Mehta", role: "ADMIN", password: "AdminPass123!", active: true },

    { email: "sales@demo.com", name: "Sales Rep", role: "SALES_REP", password: "DemoPass123!", active: true },
    { email: "sales@dealflow.com", name: "Sarah Sales", role: "SALES_REP", password: "sales360", active: true },
    { email: "arjun.nair@dealflow.com", name: "Arjun Nair", role: "SALES_REP", password: "SalesPass123!", active: true },
    { email: "megha.iyer@dealflow.com", name: "Megha Iyer", role: "SALES_REP", password: "SalesPass123!", active: true },
    { email: "rohit.verma@dealflow.com", name: "Rohit Verma", role: "SALES_REP", password: "SalesPass123!", active: false }, // offboarded rep, historical quotes only

    { email: "manager@demo.com", name: "Mike Manager", role: "SALES_MANAGER", password: "DemoPass123!", active: true },
    { email: "manager@dealflow.com", name: "Mike Manager", role: "SALES_MANAGER", password: "manager360", active: true },
    { email: "kavita.rao@dealflow.com", name: "Kavita Rao", role: "SALES_MANAGER", password: "MgrPass123!", active: true },

    { email: "finance@demo.com", name: "Fiona Finance", role: "FINANCE", password: "DemoPass123!", active: true },
    { email: "finance@dealflow.com", name: "Fiona Finance", role: "FINANCE", password: "finance360", active: true },
    { email: "deepak.joshi@dealflow.com", name: "Deepak Joshi", role: "FINANCE", password: "FinPass123!", active: true },

    { email: "ops@demo.com", name: "Oliver Ops", role: "OPERATIONS", password: "DemoPass123!", active: true },
    { email: "sunita.pillai@dealflow.com", name: "Sunita Pillai", role: "OPERATIONS", password: "OpsPass123!", active: true },
  ];

  const userMap: Record<string, string> = {};
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, active: u.active, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, active: u.active, passwordHash },
    });
    userMap[u.email] = record.id;
  }

  return userMap;
}

// -----------------------------------------------------------------------------
// 2. Reference data: tiers, categories, products, variants, price lists
// -----------------------------------------------------------------------------
async function seedCatalog() {
  console.log("Seeding customer tiers...");
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
      create: t,
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

  console.log("Seeding products (incl. an inactive/discontinued SKU)...");
  const products = [
    { name: "Laptop Pro 14", sku: "LAP-PRO-001", categoryName: "Hardware", type: "HARDWARE", basePrice: 120000, costPrice: 90000, taxPercent: 18, description: "Enterprise-grade laptop, 14-inch, i7/32GB.", active: true },
    { name: "Laptop Air 13", sku: "LAP-AIR-002", categoryName: "Hardware", type: "HARDWARE", basePrice: 78000, costPrice: 58000, taxPercent: 18, description: "Lightweight laptop for field teams.", active: true },
    { name: "Enterprise Server R740", sku: "SRV-ENT-001", categoryName: "Hardware", type: "HARDWARE", basePrice: 350000, costPrice: 260000, taxPercent: 18, description: "2U rack server, dual Xeon.", active: true },
    { name: "Network Switch 48-Port", sku: "NWK-SW-001", categoryName: "Hardware", type: "HARDWARE", basePrice: 42000, costPrice: 31000, taxPercent: 18, description: "Managed L3 switch, 48-port PoE+.", active: true },
    { name: "Legacy Desktop Tower", sku: "DSK-LEG-001", categoryName: "Hardware", type: "HARDWARE", basePrice: 55000, costPrice: 44000, taxPercent: 18, description: "Discontinued desktop line.", active: false },

    { name: "Setup & Deployment Service", sku: "SVC-SETUP-001", categoryName: "Service", type: "SERVICE", basePrice: 3000, costPrice: 1200, taxPercent: 18, description: "On-site setup service, per device.", active: true },
    { name: "Implementation Service", sku: "SVC-IMPL-001", categoryName: "Service", type: "SERVICE", basePrice: 45000, costPrice: 20000, taxPercent: 18, description: "Full implementation engagement, 4 weeks.", active: true },
    { name: "Staff Training Workshop", sku: "SVC-TRAIN-001", categoryName: "Service", type: "SERVICE", basePrice: 15000, costPrice: 6000, taxPercent: 18, description: "Half-day admin/user training, on-site or remote.", active: true },
    { name: "Data Migration Service", sku: "SVC-MIGR-001", categoryName: "Service", type: "SERVICE", basePrice: 60000, costPrice: 32000, taxPercent: 18, description: "Legacy data migration & validation.", active: true },

    { name: "Premium Support Plan", sku: "SUB-SUPPORT-001", categoryName: "Subscription", type: "SUBSCRIPTION", basePrice: 5000, costPrice: 1500, taxPercent: 18, description: "24x7 premium support, monthly.", active: true },
    { name: "Cloud Platform Access", sku: "SUB-CLOUD-001", categoryName: "Subscription", type: "SUBSCRIPTION", basePrice: 8000, costPrice: 3000, taxPercent: 18, description: "Managed cloud platform, monthly.", active: true },
    { name: "Advanced Analytics Add-on", sku: "SUB-ANLY-001", categoryName: "Subscription", type: "SUBSCRIPTION", basePrice: 12000, costPrice: 4000, taxPercent: 18, description: "Analytics & reporting add-on, quarterly.", active: true },
  ];

  const productMap: Record<string, string> = {};
  for (const p of products) {
    const record = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name, categoryId: categoryMap[p.categoryName], type: p.type, basePrice: p.basePrice,
        costPrice: p.costPrice, taxPercent: p.taxPercent, description: p.description, active: p.active,
      },
      create: {
        name: p.name, sku: p.sku, categoryId: categoryMap[p.categoryName], type: p.type, unit: "unit",
        basePrice: p.basePrice, costPrice: p.costPrice, taxPercent: p.taxPercent, description: p.description, active: p.active,
      },
    });
    productMap[p.sku] = record.id;
  }

  console.log("Seeding product variants (color/RAM options)...");
  const variants = [
    { sku: "LAP-PRO-001-16GB", productSku: "LAP-PRO-001", attributeName: "RAM", value: "16GB", extraPrice: 0 },
    { sku: "LAP-PRO-001-32GB", productSku: "LAP-PRO-001", attributeName: "RAM", value: "32GB", extraPrice: 9000 },
    { sku: "LAP-PRO-001-64GB", productSku: "LAP-PRO-001", attributeName: "RAM", value: "64GB", extraPrice: 22000 },
    { sku: "LAP-PRO-001-SLV", productSku: "LAP-PRO-001", attributeName: "Color", value: "Silver", extraPrice: 0 },
    { sku: "LAP-PRO-001-SPC", productSku: "LAP-PRO-001", attributeName: "Color", value: "Space Grey", extraPrice: 1500 },
    { sku: "LAP-AIR-002-256", productSku: "LAP-AIR-002", attributeName: "Storage", value: "256GB SSD", extraPrice: 0 },
    { sku: "LAP-AIR-002-512", productSku: "LAP-AIR-002", attributeName: "Storage", value: "512GB SSD", extraPrice: 6500 },
    { sku: null, productSku: "SRV-ENT-001", attributeName: "Warranty", value: "5-Year Extended", extraPrice: 25000 },
  ];
  for (const v of variants) {
    const productId = productMap[v.productSku];
    if (!productId) continue;
    if (v.sku) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { attributeName: v.attributeName, value: v.value, extraPrice: v.extraPrice },
        create: { productId, attributeName: v.attributeName, value: v.value, extraPrice: v.extraPrice, sku: v.sku },
      });
    } else {
      const existing = await prisma.productVariant.findFirst({ where: { productId, attributeName: v.attributeName, value: v.value } });
      if (!existing) {
        await prisma.productVariant.create({ data: { productId, attributeName: v.attributeName, value: v.value, extraPrice: v.extraPrice } });
      }
    }
  }

  console.log("Seeding price lists (standard + APAC export)...");
  const priceListDefs = [
    { name: "Standard India Price List", currency: "INR", active: true },
    { name: "APAC Export Price List", currency: "USD", active: true },
    { name: "Legacy 2025 Price List", currency: "INR", active: false },
  ];
  const priceListMap: Record<string, string> = {};
  for (const pl of priceListDefs) {
    let record = await prisma.priceList.findFirst({ where: { name: pl.name } });
    if (!record) {
      record = await prisma.priceList.create({ data: pl });
    } else {
      record = await prisma.priceList.update({ where: { id: record.id }, data: { currency: pl.currency, active: pl.active } });
    }
    priceListMap[pl.name] = record.id;
  }

  for (const sku of Object.keys(productMap)) {
    const productId = productMap[sku];
    await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: priceListMap["Standard India Price List"], productId } },
      update: {},
      create: { priceListId: priceListMap["Standard India Price List"], productId, price: products.find(p => p.sku === sku)!.basePrice },
    });
  }
  // APAC list only covers hardware, at a USD-converted rate — demonstrates a partially-populated price list
  for (const sku of ["LAP-PRO-001", "LAP-AIR-002", "SRV-ENT-001", "NWK-SW-001"]) {
    const productId = productMap[sku];
    const inr = products.find(p => p.sku === sku)!.basePrice;
    await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: priceListMap["APAC Export Price List"], productId } },
      update: {},
      create: { priceListId: priceListMap["APAC Export Price List"], productId, price: round2(inr / 83) },
    });
  }

  console.log("Seeding discount rules (tier-based + category-based)...");
  const discountRules = [
    { customerTierId: tierMap["BRONZE"], categoryId: null, maxDiscountPercent: 5, priority: 1, active: true },
    { customerTierId: tierMap["SILVER"], categoryId: null, maxDiscountPercent: 10, priority: 1, active: true },
    { customerTierId: tierMap["GOLD"], categoryId: null, maxDiscountPercent: 15, priority: 1, active: true },
    { customerTierId: null, categoryId: categoryMap["Hardware"], maxDiscountPercent: 15, priority: 2, active: true },
    { customerTierId: null, categoryId: categoryMap["Service"], maxDiscountPercent: 10, priority: 2, active: true },
    { customerTierId: null, categoryId: categoryMap["Subscription"], maxDiscountPercent: 10, priority: 2, active: true },
    { customerTierId: null, categoryId: null, maxDiscountPercent: 3, priority: 3, active: false }, // retired blanket rule, kept for audit history
  ];
  for (const dr of discountRules) {
    const existing = await prisma.discountRule.findFirst({ where: { customerTierId: dr.customerTierId, categoryId: dr.categoryId, priority: dr.priority } });
    if (!existing) await prisma.discountRule.create({ data: dr });
  }

  console.log("Seeding approval rules (risk tiers)...");
  const approvalRules = [
    { minRiskScore: 0, maxRiskScore: 9, requiredRoles: "" },
    { minRiskScore: 10, maxRiskScore: 24, requiredRoles: "SALES_MANAGER" },
    { minRiskScore: 25, maxRiskScore: null as number | null, requiredRoles: "SALES_MANAGER,FINANCE" },
  ];
  for (const ar of approvalRules) {
    const existing = await prisma.approvalRule.findFirst({ where: { minRiskScore: ar.minRiskScore } });
    if (!existing) await prisma.approvalRule.create({ data: ar });
  }

  console.log("Seeding warehouses...");
  const warehouses = [
    { name: "Main Warehouse - Vadodara", code: "MAIN", shippingBaseCost: 500, active: true },
    { name: "East Depot - Kolkata", code: "EAST", shippingBaseCost: 700, active: true },
    { name: "South Hub - Chennai", code: "SOUTH", shippingBaseCost: 650, active: true },
    { name: "North Overflow - Retired", code: "NORTH-OLD", shippingBaseCost: 800, active: false },
  ];
  const warehouseMap: Record<string, string> = {};
  for (const w of warehouses) {
    const record = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, shippingBaseCost: w.shippingBaseCost, active: w.active },
      create: w,
    });
    warehouseMap[w.code] = record.id;
  }

  console.log("Seeding inventory (including a low-stock and a zero-stock line to trigger BACKORDERED states)...");
  const inventoryItems = [
    { whCode: "MAIN", sku: "LAP-PRO-001", qty: 42 },
    { whCode: "EAST", sku: "LAP-PRO-001", qty: 18 },
    { whCode: "SOUTH", sku: "LAP-PRO-001", qty: 0 }, // zero stock at this hub
    { whCode: "MAIN", sku: "LAP-AIR-002", qty: 65 },
    { whCode: "EAST", sku: "LAP-AIR-002", qty: 30 },
    { whCode: "MAIN", sku: "SRV-ENT-001", qty: 12 },
    { whCode: "EAST", sku: "SRV-ENT-001", qty: 3 }, // low stock
    { whCode: "SOUTH", sku: "SRV-ENT-001", qty: 6 },
    { whCode: "MAIN", sku: "NWK-SW-001", qty: 54 },
    { whCode: "SOUTH", sku: "NWK-SW-001", qty: 21 },
    { whCode: "MAIN", sku: "SVC-SETUP-001", qty: 9999 },
    { whCode: "MAIN", sku: "SVC-IMPL-001", qty: 9999 },
    { whCode: "MAIN", sku: "SVC-TRAIN-001", qty: 9999 },
    { whCode: "MAIN", sku: "SVC-MIGR-001", qty: 9999 },
  ];
  for (const inv of inventoryItems) {
    const warehouseId = warehouseMap[inv.whCode];
    const productId = productMap[inv.sku];
    if (warehouseId && productId) {
      await prisma.inventory.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        update: { quantityAvailable: inv.qty },
        create: { warehouseId, productId, quantityAvailable: inv.qty },
      });
    }
  }

  console.log("Seeding subscription plans (monthly/quarterly/yearly, one retired)...");
  const subPlanDefs = [
    { name: "Premium Support Monthly", frequency: "MONTHLY", price: 5000, prorationEnabled: true, cancellationRefundEnabled: true, active: true },
    { name: "Cloud Platform Monthly", frequency: "MONTHLY", price: 8000, prorationEnabled: true, cancellationRefundEnabled: true, active: true },
    { name: "Advanced Analytics Quarterly", frequency: "QUARTERLY", price: 34000, prorationEnabled: true, cancellationRefundEnabled: false, active: true },
    { name: "Cloud Platform Annual (Legacy)", frequency: "YEARLY", price: 84000, prorationEnabled: false, cancellationRefundEnabled: false, active: false },
  ];
  const subPlanMap: Record<string, string> = {};
  for (const sp of subPlanDefs) {
    let record = await prisma.subscriptionPlan.findFirst({ where: { name: sp.name } });
    if (!record) record = await prisma.subscriptionPlan.create({ data: sp });
    subPlanMap[sp.name] = record.id;
  }

  console.log("Seeding product co-purchases & upsell rules...");
  const coPurchases = [
    { a: "LAP-PRO-001", b: "SUB-SUPPORT-001", freq: 72 },
    { a: "LAP-PRO-001", b: "SVC-SETUP-001", freq: 61 },
    { a: "SRV-ENT-001", b: "SVC-IMPL-001", freq: 84 },
    { a: "SRV-ENT-001", b: "SUB-SUPPORT-001", freq: 68 },
    { a: "LAP-AIR-002", b: "SUB-SUPPORT-001", freq: 44 },
    { a: "NWK-SW-001", b: "SVC-SETUP-001", freq: 39 },
  ];
  for (const cp of coPurchases) {
    const productId = productMap[cp.a];
    const coProductId = productMap[cp.b];
    if (productId && coProductId) {
      await prisma.productCoPurchase.upsert({
        where: { productId_coProductId: { productId, coProductId } },
        update: { frequency: cp.freq },
        create: { productId, coProductId, frequency: cp.freq },
      });
    }
  }

  const upsellRules = [
    { p: "LAP-PRO-001", s: "SUB-SUPPORT-001", promotion: true, minMargin: 10, active: true },
    { p: "SRV-ENT-001", s: "SVC-IMPL-001", promotion: false, minMargin: 15, active: true },
    { p: "LAP-AIR-002", s: "SUB-CLOUD-001", promotion: true, minMargin: 8, active: true },
    { p: "NWK-SW-001", s: "SVC-SETUP-001", promotion: false, minMargin: 5, active: false }, // disabled rule kept for history
  ];
  for (const ur of upsellRules) {
    const productId = productMap[ur.p];
    const suggestedProductId = productMap[ur.s];
    if (productId && suggestedProductId) {
      const existing = await prisma.upsellRule.findFirst({ where: { productId, suggestedProductId } });
      if (!existing) {
        await prisma.upsellRule.create({ data: { productId, suggestedProductId, promotion: ur.promotion, minMarginPercent: ur.minMargin, active: ur.active } });
      }
    }
  }

  return { tierMap, categoryMap, productMap, warehouseMap, subPlanMap, products };
}

// -----------------------------------------------------------------------------
// 3. Customers, portal users & invites
// -----------------------------------------------------------------------------
async function seedCustomers(tierMap: Record<string, string>, userMap: Record<string, string>) {
  console.log("Seeding named demo customers (with portal users)...");

  interface NamedCustomer {
    company: string;
    contact: string | null;
    email: string | null;
    tier: string | null;
    active: boolean;
    portal: boolean;
  }

  const namedCustomers: NamedCustomer[] = [
    { company: "Acme Corp", contact: "John Doe", email: "john@acme.com", tier: "GOLD", active: true, portal: true },
    { company: "Beta Industries", contact: "Priya Shah", email: "priya@beta-industries.com", tier: "SILVER", active: true, portal: true },
    { company: "Nova Systems", contact: "Sam Patel", email: "sam@novasystems.com", tier: "BRONZE", active: true, portal: true },
    { company: "Zenith Manufacturing", contact: "Karan Malhotra", email: "karan@zenithmfg.com", tier: "GOLD", active: true, portal: false },
    { company: "Riverbank Logistics", contact: "Anita Desai", email: "anita@riverbanklog.com", tier: "SILVER", active: true, portal: false },
    { company: "Skyline Retailers", contact: null, email: null, tier: null, active: true, portal: false }, // minimal-data customer: no tier, no contact, no email
    { company: "Legacy Textiles Pvt Ltd", contact: "Ramesh Kulkarni", email: "ramesh@legacytextiles.com", tier: "BRONZE", active: false, portal: false }, // inactive/churned account
  ];

  const customerMap: Record<string, string> = {};
  for (const c of namedCustomers) {
    let portalUserId: string | undefined;
    if (c.portal && c.email) {
      const passwordHash = await hashPassword("Customer123!");
      const portalUser = await prisma.user.upsert({
        where: { email: c.email },
        update: { name: c.contact ?? c.company, role: "CUSTOMER", passwordHash },
        create: { email: c.email, name: c.contact ?? c.company, role: "CUSTOMER", passwordHash },
      });
      portalUserId = portalUser.id;
    }

    const existing = await prisma.customer.findFirst({ where: { companyName: c.company } });
    const data = {
      companyName: c.company,
      contactName: c.contact,
      email: c.email,
      tierId: c.tier ? tierMap[c.tier] : null,
      currency: "INR",
      active: c.active,
      portalUserId: portalUserId ?? null,
    };
    const record = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data })
      : await prisma.customer.create({ data });
    customerMap[c.company] = record.id;
  }

  console.log("Seeding bulk filler customers (varied tiers, currencies, some inactive)...");
  const tierKeys = Object.keys(tierMap);
  const currencies = ["INR", "USD", "EUR"];
  const bulkCompanyIds: string[] = [];
  for (let i = 0; i < 18; i++) {
    const company = faker.company.name();
    const existing = await prisma.customer.findFirst({ where: { companyName: company } });
    if (existing) {
      bulkCompanyIds.push(existing.id);
      continue;
    }
    const record = await prisma.customer.create({
      data: {
        companyName: company,
        contactName: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        tierId: tierMap[pick(tierKeys)],
        currency: pick(currencies),
        active: Math.random() > 0.15, // ~15% inactive to populate "inactive customers" filter
      },
    });
    bulkCompanyIds.push(record.id);
    customerMap[`__bulk_${i}`] = record.id;
  }

  console.log("Seeding customer invites (pending, accepted, expired, revoked)...");
  const inviterId = userMap["admin@dealflow.com"];
  const inviteScenarios: Array<{ company: string; status: string }> = [
    { company: "Zenith Manufacturing", status: "PENDING" },
    { company: "Riverbank Logistics", status: "PENDING" },
    { company: "Acme Corp", status: "ACCEPTED" },
    { company: "Beta Industries", status: "ACCEPTED" },
    { company: "Skyline Retailers", status: "EXPIRED" },
    { company: "Legacy Textiles Pvt Ltd", status: "REVOKED" },
  ];
  for (const inv of inviteScenarios) {
    const customerId = customerMap[inv.company];
    if (!customerId) continue;
    const token = faker.string.uuid();
    const existing = await prisma.customerInvite.findFirst({ where: { customerId, status: inv.status } });
    if (existing) continue;
    const base = {
      customerId,
      email: faker.internet.email().toLowerCase(),
      token,
      status: inv.status,
      invitedById: inviterId,
      expiresAt: inv.status === "EXPIRED" ? daysAgo(10) : daysFromNow(14),
      acceptedAt: inv.status === "ACCEPTED" ? daysAgo(3) : null,
      createdAt: daysAgo(20),
    };
    await prisma.customerInvite.create({ data: base });
  }

  return { customerMap, bulkCompanyIds };
}

// -----------------------------------------------------------------------------
// 4. Quotes + full downstream lifecycle (lines, approvals, negotiation,
//    deal health, alerts, orders, fulfillment, billing, invoices, audit, notif)
// -----------------------------------------------------------------------------

interface Ctx {
  tierMap: Record<string, string>;
  productMap: Record<string, string>;
  products: Array<{ sku: string; basePrice: number; costPrice: number; taxPercent: number }>;
  warehouseMap: Record<string, string>;
  subPlanMap: Record<string, string>;
  customerMap: Record<string, string>;
  userMap: Record<string, string>;
}

const SALES_REPS = ["sales@demo.com", "sales@dealflow.com", "arjun.nair@dealflow.com", "megha.iyer@dealflow.com", "rohit.verma@dealflow.com"];
const MANAGERS = ["manager@demo.com", "manager@dealflow.com", "kavita.rao@dealflow.com"];
const FINANCE_USERS = ["finance@demo.com", "finance@dealflow.com", "deepak.joshi@dealflow.com"];
const ADMINS = ["admin@dealflow.com", "priyanka.mehta@dealflow.com"];

function buildLine(ctx: Ctx, sku: string, quantity: number, discountPercent: number, billingType: "ONE_TIME" | "RECURRING", subscriptionPlanId?: string) {
  const p = ctx.products.find((x) => x.sku === sku)!;
  const unitPrice = p.basePrice;
  const gross = unitPrice * quantity;
  const discountAmount = round2(gross * (discountPercent / 100));
  const lineTotal = round2(gross - discountAmount);
  const costTotal = p.costPrice * quantity;
  const marginAmount = round2(lineTotal - costTotal);
  return {
    productId: ctx.productMap[sku],
    quantity,
    unitPrice,
    discountPercent,
    discountAmount,
    lineTotal,
    marginAmount,
    billingType,
    subscriptionPlanId: subscriptionPlanId ?? null,
  };
}

async function createQuoteWithLines(
  ctx: Ctx,
  opts: {
    customerId: string;
    salesRepEmail: string;
    status: string;
    lines: ReturnType<typeof buildLine>[];
    riskScore: number;
    riskLevel: string;
    createdDaysAgo: number;
  }
) {
  const subtotal = round2(opts.lines.reduce((s, l) => s + l.unitPrice * Number(l.quantity), 0));
  const discountAmount = round2(opts.lines.reduce((s, l) => s + l.discountAmount, 0));
  const total = round2(subtotal - discountAmount);
  const marginAmount = round2(opts.lines.reduce((s, l) => s + l.marginAmount, 0));
  const marginPercent = total > 0 ? round2((marginAmount / total) * 100) : 0;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: nextQuoteNumber(),
      customerId: opts.customerId,
      salesRepId: ctx.userMap[opts.salesRepEmail],
      status: opts.status,
      subtotal,
      discountAmount,
      total,
      marginAmount,
      marginPercent,
      riskScore: opts.riskScore,
      riskLevel: opts.riskLevel,
      createdAt: daysAgo(opts.createdDaysAgo),
      updatedAt: daysAgo(Math.max(0, opts.createdDaysAgo - 1)),
      quoteLines: { create: opts.lines },
    },
    include: { quoteLines: true },
  });
  return quote;
}

async function seedQuotesAndDownstream(ctx: Ctx) {
  console.log("Seeding quotes across the full status lifecycle...");
  const customerNames = Object.keys(ctx.customerMap);
  const gold = ctx.customerMap["Acme Corp"];
  const silver = ctx.customerMap["Beta Industries"];
  const bronze = ctx.customerMap["Nova Systems"];
  const noTier = ctx.customerMap["Skyline Retailers"];
  const inactiveCust = ctx.customerMap["Legacy Textiles Pvt Ltd"];

  const allQuotes: Array<{ quote: Awaited<ReturnType<typeof createQuoteWithLines>>; scenario: string }> = [];

  // --- DRAFT: brand-new, untouched quotes ---
  allQuotes.push({
    scenario: "draft-simple",
    quote: await createQuoteWithLines(ctx, {
      customerId: bronze,
      salesRepEmail: "sales@dealflow.com",
      status: "DRAFT",
      riskScore: 4,
      riskLevel: "LOW",
      createdDaysAgo: 1,
      lines: [buildLine(ctx, "LAP-AIR-002", 3, 3, "ONE_TIME")],
    }),
  });
  allQuotes.push({
    scenario: "draft-notier-customer",
    quote: await createQuoteWithLines(ctx, {
      customerId: noTier,
      salesRepEmail: "megha.iyer@dealflow.com",
      status: "DRAFT",
      riskScore: 0,
      riskLevel: "LOW",
      createdDaysAgo: 0,
      lines: [buildLine(ctx, "SVC-TRAIN-001", 1, 0, "ONE_TIME")],
    }),
  });

  // --- PENDING_APPROVAL: risk high enough to require manager, or manager+finance ---
  const pendingMgr = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 16,
    riskLevel: "MEDIUM",
    createdDaysAgo: 3,
    lines: [buildLine(ctx, "SRV-ENT-001", 2, 12, "ONE_TIME"), buildLine(ctx, "SVC-IMPL-001", 1, 5, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "pending-manager-only", quote: pendingMgr });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingMgr.id, step: 1, role: "SALES_MANAGER", status: "PENDING", createdAt: daysAgo(3) },
  });

  const pendingBoth = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "sales@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 31,
    riskLevel: "HIGH",
    createdDaysAgo: 5,
    lines: [buildLine(ctx, "SRV-ENT-001", 4, 22, "ONE_TIME"), buildLine(ctx, "SUB-SUPPORT-001", 4, 10, "RECURRING", ctx.subPlanMap["Premium Support Monthly"])],
  });
  allQuotes.push({ scenario: "pending-manager-and-finance", quote: pendingBoth });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingBoth.id, step: 1, role: "SALES_MANAGER", status: "APPROVED", reviewerId: ctx.userMap["kavita.rao@dealflow.com"], reason: "Strategic account, discount justified.", createdAt: daysAgo(5), actedAt: daysAgo(4) },
  });
  const financeStep = await prisma.approvalRequest.create({
    data: { quoteId: pendingBoth.id, step: 2, role: "FINANCE", status: "PENDING", createdAt: daysAgo(4) },
  });
  await prisma.approvalAction.create({
    data: { approvalRequestId: financeStep.id, actorId: ctx.userMap["kavita.rao@dealflow.com"], action: "ESCALATED_TO_FINANCE", reason: "Discount exceeds manager authority.", createdAt: daysAgo(4) },
  });

  // Additional realistic Pending Approvals
  const pendingDiscountOverage = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "megha.iyer@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 24,
    riskLevel: "HIGH",
    createdDaysAgo: 2,
    lines: [buildLine(ctx, "LAP-PRO-001", 15, 25, "ONE_TIME"), buildLine(ctx, "SVC-SETUP-001", 15, 10, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "pending-discount-overage", quote: pendingDiscountOverage });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingDiscountOverage.id, step: 1, role: "SALES_MANAGER", status: "PENDING", createdAt: daysAgo(2) },
  });

  const pendingMarginFloor = await createQuoteWithLines(ctx, {
    customerId: ctx.customerMap["Zenith Manufacturing"] || gold,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 36,
    riskLevel: "CRITICAL",
    createdDaysAgo: 4,
    lines: [buildLine(ctx, "SRV-ENT-001", 8, 30, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "pending-margin-floor", quote: pendingMarginFloor });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingMarginFloor.id, step: 1, role: "FINANCE", status: "PENDING", createdAt: daysAgo(4) },
  });

  const pendingStrategicBundle = await createQuoteWithLines(ctx, {
    customerId: bronze,
    salesRepEmail: "sales@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 18,
    riskLevel: "MEDIUM",
    createdDaysAgo: 1,
    lines: [
      buildLine(ctx, "NWK-SW-001", 10, 15, "ONE_TIME"),
      buildLine(ctx, "SVC-TRAIN-001", 2, 20, "ONE_TIME"),
      buildLine(ctx, "SUB-CLOUD-001", 10, 10, "RECURRING", ctx.subPlanMap["Cloud Platform Monthly"]),
    ],
  });
  allQuotes.push({ scenario: "pending-strategic-bundle", quote: pendingStrategicBundle });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingStrategicBundle.id, step: 1, role: "SALES_MANAGER", status: "PENDING", createdAt: daysAgo(1) },
  });

  const pendingCustomTerms = await createQuoteWithLines(ctx, {
    customerId: ctx.customerMap["Riverbank Logistics"] || silver,
    salesRepEmail: "rohit.verma@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 28,
    riskLevel: "HIGH",
    createdDaysAgo: 6,
    lines: [buildLine(ctx, "LAP-AIR-002", 25, 18, "ONE_TIME"), buildLine(ctx, "SUB-SUPPORT-001", 25, 12, "RECURRING", ctx.subPlanMap["Premium Support Monthly"])],
  });
  allQuotes.push({ scenario: "pending-custom-terms", quote: pendingCustomTerms });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingCustomTerms.id, step: 1, role: "SALES_MANAGER", status: "APPROVED", reviewerId: ctx.userMap["manager@dealflow.com"], reason: "Approved manager tier.", createdAt: daysAgo(6), actedAt: daysAgo(5) },
  });
  await prisma.approvalRequest.create({
    data: { quoteId: pendingCustomTerms.id, step: 2, role: "FINANCE", status: "PENDING", createdAt: daysAgo(5) },
  });

  // --- APPROVED ---
  const approved = await createQuoteWithLines(ctx, {
    customerId: bronze,
    salesRepEmail: "sales@dealflow.com",
    status: "APPROVED",
    riskScore: 12,
    riskLevel: "MEDIUM",
    createdDaysAgo: 10,
    lines: [buildLine(ctx, "LAP-PRO-001", 5, 8, "ONE_TIME"), buildLine(ctx, "SVC-SETUP-001", 5, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "approved-not-yet-ordered", quote: approved });
  const approvedReq = await prisma.approvalRequest.create({
    data: { quoteId: approved.id, step: 1, role: "SALES_MANAGER", status: "APPROVED", reviewerId: ctx.userMap["manager@dealflow.com"], reason: "Within standard tier discount.", createdAt: daysAgo(10), actedAt: daysAgo(9) },
  });
  await prisma.approvalAction.create({
    data: { approvalRequestId: approvedReq.id, actorId: ctx.userMap["manager@dealflow.com"], action: "APPROVED", reason: "Looks good.", createdAt: daysAgo(9) },
  });

  // --- REJECTED ---
  const rejected = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "REJECTED",
    riskScore: 38,
    riskLevel: "CRITICAL",
    createdDaysAgo: 14,
    lines: [buildLine(ctx, "SRV-ENT-001", 6, 28, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "rejected-margin-too-thin", quote: rejected });
  const rejectedReq = await prisma.approvalRequest.create({
    data: { quoteId: rejected.id, step: 1, role: "FINANCE", status: "REJECTED", reviewerId: ctx.userMap["deepak.joshi@dealflow.com"], reason: "Margin falls below the 8% floor.", createdAt: daysAgo(14), actedAt: daysAgo(12) },
  });
  await prisma.approvalAction.create({
    data: { approvalRequestId: rejectedReq.id, actorId: ctx.userMap["deepak.joshi@dealflow.com"], action: "REJECTED", reason: "Discount must be reduced to at least 18%.", createdAt: daysAgo(12) },
  });

  // --- REVISION_REQUESTED example on a separate quote still PENDING_APPROVAL ---
  const revisionRequested = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "megha.iyer@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 21,
    riskLevel: "HIGH",
    createdDaysAgo: 6,
    lines: [buildLine(ctx, "LAP-PRO-001", 10, 18, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "revision-requested", quote: revisionRequested });
  await prisma.approvalRequest.create({
    data: { quoteId: revisionRequested.id, step: 1, role: "SALES_MANAGER", status: "REVISION_REQUESTED", reviewerId: ctx.userMap["manager@dealflow.com"], reason: "Please add a support add-on before resubmitting.", createdAt: daysAgo(6), actedAt: daysAgo(5) },
  });

  // --- CRITICAL DEALS & DISCOUNT ANOMALIES ---
  const criticalDiscountAnomaly = await createQuoteWithLines(ctx, {
    customerId: ctx.customerMap["Zenith Manufacturing"] || gold,
    salesRepEmail: "sales@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 46,
    riskLevel: "CRITICAL",
    createdDaysAgo: 8,
    lines: [buildLine(ctx, "LAP-PRO-001", 20, 32, "ONE_TIME"), buildLine(ctx, "SRV-ENT-001", 5, 28, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "critical-discount-anomaly", quote: criticalDiscountAnomaly });
  await prisma.approvalRequest.create({
    data: { quoteId: criticalDiscountAnomaly.id, step: 1, role: "FINANCE", status: "PENDING", createdAt: daysAgo(8) },
  });

  const criticalStalledDeal = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "UNDER_NEGOTIATION",
    riskScore: 42,
    riskLevel: "CRITICAL",
    createdDaysAgo: 16,
    lines: [buildLine(ctx, "SRV-ENT-001", 10, 26, "ONE_TIME"), buildLine(ctx, "SVC-IMPL-001", 3, 20, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "critical-stalled-negotiation", quote: criticalStalledDeal });

  const discountAnomalyQuote = await createQuoteWithLines(ctx, {
    customerId: noTier,
    salesRepEmail: "megha.iyer@dealflow.com",
    status: "PENDING_APPROVAL",
    riskScore: 32,
    riskLevel: "HIGH",
    createdDaysAgo: 5,
    lines: [buildLine(ctx, "NWK-SW-001", 25, 28, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "high-discount-anomaly", quote: discountAnomalyQuote });
  await prisma.approvalRequest.create({
    data: { quoteId: discountAnomalyQuote.id, step: 1, role: "SALES_MANAGER", status: "PENDING", createdAt: daysAgo(5) },
  });

  // --- UNDER_NEGOTIATION (with negotiation thread & per-line messages) ---
  const negotiating = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "sales@dealflow.com",
    status: "UNDER_NEGOTIATION",
    riskScore: 14,
    riskLevel: "MEDIUM",
    createdDaysAgo: 8,
    lines: [buildLine(ctx, "LAP-PRO-001", 8, 12, "ONE_TIME"), buildLine(ctx, "SUB-CLOUD-001", 8, 5, "RECURRING", ctx.subPlanMap["Cloud Platform Monthly"])],
  });
  allQuotes.push({ scenario: "under-negotiation", quote: negotiating });
  const negotiation = await prisma.negotiation.create({
    data: { quoteId: negotiating.id, customerId: gold, status: "OPEN", proposedDiscount: 18, message: "Can you match the 18% we get from your competitor?", createdAt: daysAgo(4) },
  });
  await prisma.negotiationMessage.createMany({
    data: [
      { negotiationId: negotiation.id, quoteLineId: negotiating.quoteLines[0].id, authorRole: "CUSTOMER", message: "We'd like 18% off the laptops given the volume.", createdAt: daysAgo(4) },
      { negotiationId: negotiation.id, quoteLineId: negotiating.quoteLines[0].id, authorRole: "SALES_REP", message: "I can offer 15% if we lock a 12-month cloud commitment.", createdAt: daysAgo(3) },
      { negotiationId: negotiation.id, quoteLineId: null, authorRole: "CUSTOMER", message: "That works, please send the revised numbers.", createdAt: daysAgo(2) },
    ],
  });

  // A second, SUBMITTED negotiation on a different quote, and one REJECTED/ACCEPTED for variety
  const negotiating2 = await createQuoteWithLines(ctx, {
    customerId: bronze,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "UNDER_NEGOTIATION",
    riskScore: 9,
    riskLevel: "LOW",
    createdDaysAgo: 2,
    lines: [buildLine(ctx, "LAP-AIR-002", 4, 4, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "negotiation-submitted", quote: negotiating2 });
  const negotiation2 = await prisma.negotiation.create({
    data: { quoteId: negotiating2.id, customerId: bronze, status: "SUBMITTED", proposedDiscount: 8, message: "Requesting a bit more off given repeat business.", createdAt: daysAgo(1) },
  });
  await prisma.negotiationMessage.create({
    data: { negotiationId: negotiation2.id, quoteLineId: negotiating2.quoteLines[0].id, authorRole: "CUSTOMER", message: "Any chance of 8% instead of 4%?", createdAt: daysAgo(1) },
  });

  // --- CONFIRMED / FULFILLING / COMPLETED quotes each get an Order chain ---
  const confirmed = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "sales@dealflow.com",
    status: "CONFIRMED",
    riskScore: 6,
    riskLevel: "LOW",
    createdDaysAgo: 12,
    lines: [buildLine(ctx, "NWK-SW-001", 6, 6, "ONE_TIME"), buildLine(ctx, "SVC-SETUP-001", 6, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "confirmed-order-pending", quote: confirmed });

  const fulfilling = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "megha.iyer@dealflow.com",
    status: "FULFILLING",
    riskScore: 11,
    riskLevel: "MEDIUM",
    createdDaysAgo: 18,
    lines: [buildLine(ctx, "LAP-PRO-001", 20, 10, "ONE_TIME"), buildLine(ctx, "SRV-ENT-001", 3, 10, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "fulfilling-partial", quote: fulfilling });

  const completed1 = await createQuoteWithLines(ctx, {
    customerId: bronze,
    salesRepEmail: "sales@dealflow.com",
    status: "COMPLETED",
    riskScore: 3,
    riskLevel: "LOW",
    createdDaysAgo: 45,
    lines: [buildLine(ctx, "LAP-AIR-002", 10, 5, "ONE_TIME"), buildLine(ctx, "SUB-SUPPORT-001", 10, 0, "RECURRING", ctx.subPlanMap["Premium Support Monthly"])],
  });
  allQuotes.push({ scenario: "completed-fully-paid", quote: completed1 });

  const completed2 = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "arjun.nair@dealflow.com",
    status: "COMPLETED",
    riskScore: 8,
    riskLevel: "LOW",
    createdDaysAgo: 70,
    lines: [buildLine(ctx, "SRV-ENT-001", 2, 15, "ONE_TIME"), buildLine(ctx, "SVC-IMPL-001", 1, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "completed-with-credit-note", quote: completed2 });

  // --- CANCELLED quote (no order at all) & one cancelled after order existed ---
  const cancelledEarly = await createQuoteWithLines(ctx, {
    customerId: inactiveCust,
    salesRepEmail: "rohit.verma@dealflow.com",
    status: "CANCELLED",
    riskScore: 5,
    riskLevel: "LOW",
    createdDaysAgo: 60,
    lines: [buildLine(ctx, "DSK-LEG-001", 4, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "cancelled-before-order", quote: cancelledEarly });

  // --- Orders for confirmed/fulfilling/completed quotes ---
  const confirmedOrder = await prisma.order.create({
    data: { quoteId: confirmed.id, orderNumber: nextOrderNumber(), status: "CONFIRMED", createdAt: daysAgo(11) },
  });
  const fulfillingOrder = await prisma.order.create({
    data: { quoteId: fulfilling.id, orderNumber: nextOrderNumber(), status: "PARTIALLY_FULFILLED", createdAt: daysAgo(17) },
  });
  const completedOrder1 = await prisma.order.create({
    data: { quoteId: completed1.id, orderNumber: nextOrderNumber(), status: "FULFILLED", createdAt: daysAgo(44) },
  });
  const completedOrder2 = await prisma.order.create({
    data: { quoteId: completed2.id, orderNumber: nextOrderNumber(), status: "FULFILLED", createdAt: daysAgo(69) },
  });
  // A standalone cancelled order (quote was confirmed then the deal fell through)
  const cancelledOrderQuote = await createQuoteWithLines(ctx, {
    customerId: gold,
    salesRepEmail: "sales@dealflow.com",
    status: "CANCELLED",
    riskScore: 7,
    riskLevel: "LOW",
    createdDaysAgo: 25,
    lines: [buildLine(ctx, "NWK-SW-001", 2, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "cancelled-after-order-created", quote: cancelledOrderQuote });
  const cancelledOrder = await prisma.order.create({
    data: { quoteId: cancelledOrderQuote.id, orderNumber: nextOrderNumber(), status: "CANCELLED", createdAt: daysAgo(24) },
  });
  // A pending order awaiting confirmation (no fulfillment yet)
  const pendingOrderQuote = await createQuoteWithLines(ctx, {
    customerId: bronze,
    salesRepEmail: "megha.iyer@dealflow.com",
    status: "CONFIRMED",
    riskScore: 4,
    riskLevel: "LOW",
    createdDaysAgo: 2,
    lines: [buildLine(ctx, "SVC-TRAIN-001", 2, 0, "ONE_TIME")],
  });
  allQuotes.push({ scenario: "pending-order", quote: pendingOrderQuote });
  const pendingOrder = await prisma.order.create({
    data: { quoteId: pendingOrderQuote.id, orderNumber: nextOrderNumber(), status: "PENDING", createdAt: daysAgo(1) },
  });

  console.log("Seeding fulfillment allocations across multiple warehouses...");
  const mainWh = ctx.warehouseMap["MAIN"];
  const eastWh = ctx.warehouseMap["EAST"];
  const southWh = ctx.warehouseMap["SOUTH"];

  await prisma.fulfillmentAllocation.createMany({
    data: [
      { orderId: confirmedOrder.id, warehouseId: mainWh, productId: ctx.productMap["NWK-SW-001"], quantity: 6, shippingCost: 500, createdAt: daysAgo(11) },
      { orderId: fulfillingOrder.id, warehouseId: mainWh, productId: ctx.productMap["LAP-PRO-001"], quantity: 14, shippingCost: 500, createdAt: daysAgo(16) },
      { orderId: fulfillingOrder.id, warehouseId: eastWh, productId: ctx.productMap["LAP-PRO-001"], quantity: 6, shippingCost: 700, createdAt: daysAgo(15) }, // split shipment across warehouses
      { orderId: fulfillingOrder.id, warehouseId: mainWh, productId: ctx.productMap["SRV-ENT-001"], quantity: 3, shippingCost: 500, createdAt: daysAgo(15) },
      { orderId: completedOrder1.id, warehouseId: eastWh, productId: ctx.productMap["LAP-AIR-002"], quantity: 10, shippingCost: 700, createdAt: daysAgo(43) },
      { orderId: completedOrder2.id, warehouseId: southWh, productId: ctx.productMap["SRV-ENT-001"], quantity: 2, shippingCost: 650, createdAt: daysAgo(68) },
    ],
  });

  // --- Subscriptions + billing schedules for RECURRING lines ---
  console.log("Seeding subscriptions & billing schedules (active + cancelled)...");
  const activeSub = await prisma.subscription.create({
    data: {
      quoteLineId: completed1.quoteLines.find((l) => l.billingType === "RECURRING")!.id,
      orderId: completedOrder1.id,
      subscriptionPlanId: ctx.subPlanMap["Premium Support Monthly"],
      quantity: 10,
      status: "ACTIVE",
      startedAt: daysAgo(44),
    },
  });
  await prisma.billingSchedule.createMany({
    data: [
      { subscriptionId: activeSub.id, billingDate: daysAgo(44), amount: 50000, status: "PAID", createdAt: daysAgo(44) },
      { subscriptionId: activeSub.id, billingDate: daysAgo(14), amount: 50000, status: "PAID", createdAt: daysAgo(14) },
      { subscriptionId: activeSub.id, billingDate: daysFromNow(16), amount: 50000, status: "PENDING", createdAt: daysAgo(1) },
    ],
  });

  const cancelledSubQuote = await createQuoteWithLines(ctx, {
    customerId: silver,
    salesRepEmail: "sales@dealflow.com",
    status: "COMPLETED",
    riskScore: 5,
    riskLevel: "LOW",
    createdDaysAgo: 100,
    lines: [buildLine(ctx, "SUB-CLOUD-001", 3, 0, "RECURRING", ctx.subPlanMap["Cloud Platform Monthly"])],
  });
  allQuotes.push({ scenario: "subscription-cancelled", quote: cancelledSubQuote });
  const cancelledSubOrder = await prisma.order.create({
    data: { quoteId: cancelledSubQuote.id, orderNumber: nextOrderNumber(), status: "FULFILLED", createdAt: daysAgo(99) },
  });
  const cancelledSub = await prisma.subscription.create({
    data: {
      quoteLineId: cancelledSubQuote.quoteLines[0].id,
      orderId: cancelledSubOrder.id,
      subscriptionPlanId: ctx.subPlanMap["Cloud Platform Monthly"],
      quantity: 3,
      status: "CANCELLED",
      startedAt: daysAgo(99),
      endDate: daysAgo(20),
    },
  });
  await prisma.billingSchedule.createMany({
    data: [
      { subscriptionId: cancelledSub.id, billingDate: daysAgo(69), amount: 24000, status: "PAID", createdAt: daysAgo(69) },
      { subscriptionId: cancelledSub.id, billingDate: daysAgo(39), amount: 24000, status: "PAID", createdAt: daysAgo(39) },
      { subscriptionId: cancelledSub.id, billingDate: daysAgo(20), amount: 24000, status: "BILLED", createdAt: daysAgo(20) }, // billed right before cancellation, not yet paid
    ],
  });

  // A subscription not tied to any order/quoteLine (manually provisioned) — exercises nullable FKs
  const standaloneSub = await prisma.subscription.create({
    data: {
      subscriptionPlanId: ctx.subPlanMap["Advanced Analytics Quarterly"],
      quantity: 1,
      status: "ACTIVE",
      startedAt: daysAgo(30),
    },
  });
  await prisma.billingSchedule.create({
    data: { subscriptionId: standaloneSub.id, billingDate: daysFromNow(60), amount: 34000, status: "PENDING", createdAt: daysAgo(30) },
  });

  // --- Invoices, payments, credit notes ---
  console.log("Seeding invoices, payments & credit notes (draft/issued/paid/cancelled)...");
  await prisma.invoice.create({
    data: { orderId: pendingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: pendingOrderQuote.total, status: "DRAFT", createdAt: daysAgo(1) },
  });

  // Additional unpaid draft invoice
  const draftInvoice2 = await prisma.invoice.create({
    data: { orderId: confirmedOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 48500, status: "DRAFT", dueDate: daysFromNow(30), createdAt: daysAgo(2) },
  });

  const issuedInvoice = await prisma.invoice.create({
    data: { orderId: confirmedOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: confirmed.total, status: "ISSUED", dueDate: daysFromNow(20), createdAt: daysAgo(10) },
  });
  await prisma.payment.create({
    data: { invoiceId: issuedInvoice.id, amount: round2(Number(confirmed.total) * 0.5), method: "BANK_TRANSFER", recordedAt: daysAgo(5) },
  }); // partial payment against an issued invoice

  // Multiple new unpaid / issued invoices
  const unpaidIssued1 = await prisma.invoice.create({
    data: { orderId: fulfillingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 92400, status: "ISSUED", dueDate: daysFromNow(15), createdAt: daysAgo(5) },
  });
  const unpaidIssued2 = await prisma.invoice.create({
    data: { orderId: confirmedOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 142000, status: "ISSUED", dueDate: daysAgo(4), createdAt: daysAgo(34) }, // overdue!
  });
  const unpaidIssued3 = await prisma.invoice.create({
    data: { orderId: fulfillingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "RECURRING", amount: 35000, status: "ISSUED", dueDate: daysFromNow(7), createdAt: daysAgo(3) },
  });
  const unpaidIssued4 = await prisma.invoice.create({
    data: { orderId: pendingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 67800, status: "ISSUED", dueDate: daysFromNow(25), createdAt: daysAgo(4) },
  });
  const unpaidIssued5 = await prisma.invoice.create({
    data: { orderId: fulfillingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 18500, status: "ISSUED", dueDate: daysAgo(10), createdAt: daysAgo(40) }, // overdue!
  });
  const unpaidDraft3 = await prisma.invoice.create({
    data: { orderId: pendingOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: 23400, status: "DRAFT", dueDate: daysFromNow(45), createdAt: daysAgo(0) },
  });

  const paidInvoice1 = await prisma.invoice.create({
    data: { orderId: completedOrder1.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: completed1.total, status: "PAID", dueDate: daysAgo(20), createdAt: daysAgo(43) },
  });
  await prisma.payment.create({
    data: { invoiceId: paidInvoice1.id, amount: completed1.total, method: "CREDIT_CARD", recordedAt: daysAgo(30) },
  });

  const paidInvoice2 = await prisma.invoice.create({
    data: { orderId: completedOrder2.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: completed2.total, status: "PAID", dueDate: daysAgo(45), createdAt: daysAgo(68) },
  });
  await prisma.payment.create({
    data: { invoiceId: paidInvoice2.id, amount: completed2.total, method: "BANK_TRANSFER", recordedAt: daysAgo(50) },
  });
  await prisma.creditNote.create({
    data: { invoiceId: paidInvoice2.id, amount: round2(Number(completed2.total) * 0.05), reason: "Server delivered with a minor cosmetic defect; goodwill credit issued.", createdAt: daysAgo(40) },
  });

  await prisma.invoice.create({
    data: { orderId: cancelledOrder.id, invoiceNumber: nextInvoiceNumber(), type: "ONE_TIME", amount: cancelledOrderQuote.total, status: "CANCELLED", createdAt: daysAgo(24) },
  });

  // Recurring invoice example tied to the subscription order
  const recurringInvoice = await prisma.invoice.create({
    data: { orderId: completedOrder1.id, invoiceNumber: nextInvoiceNumber(), type: "RECURRING", amount: 50000, status: "PAID", dueDate: daysAgo(15), createdAt: daysAgo(16) },
  });
  await prisma.payment.create({
    data: { invoiceId: recurringInvoice.id, amount: 50000, method: "AUTO_DEBIT", recordedAt: daysAgo(14) },
  });

  // --- Deal health events (one per quote, mixed levels; multiple for one quote to show history) ---
  console.log("Seeding deal health events...");
  await prisma.dealHealthEvent.createMany({
    data: [
      { quoteId: pendingMgr.id, score: 14, level: "WATCH", reasons: JSON.stringify([{ signal: "APPROVAL_DELAY", severity: "MEDIUM", message: "Stalled in manager approval for 3 days", points: 10 }]), createdAt: daysAgo(1) },
      { quoteId: pendingBoth.id, score: 26, level: "AT_RISK", reasons: JSON.stringify([{ signal: "APPROVAL_DELAY", severity: "HIGH", message: "Stalled 5 days awaiting finance approval", points: 15 }, { signal: "DISCOUNT_ANOMALY", severity: "MEDIUM", message: "Discount 22% exceeds standard tier policy", points: 11 }]), createdAt: daysAgo(1) },
      { quoteId: pendingDiscountOverage.id, score: 28, level: "AT_RISK", reasons: JSON.stringify([{ signal: "DISCOUNT_ANOMALY", severity: "HIGH", message: "Requested discount is 12% above sales rep historical average", points: 15 }, { signal: "APPROVAL_DELAY", severity: "MEDIUM", message: "Pending sales manager sign-off", points: 13 }]), createdAt: daysAgo(1) },
      { quoteId: pendingMarginFloor.id, score: 38, level: "CRITICAL", reasons: JSON.stringify([{ signal: "MARGIN", severity: "CRITICAL", message: "Deal margin 7.4% is below 15% floor", points: 20 }, { signal: "APPROVAL_DELAY", severity: "HIGH", message: "Escalated to finance for 4 days without action", points: 18 }]), createdAt: daysAgo(1) },
      { quoteId: pendingCustomTerms.id, score: 24, level: "AT_RISK", reasons: JSON.stringify([{ signal: "APPROVAL_DELAY", severity: "HIGH", message: "Awaiting Finance VP review for Net-90 terms", points: 14 }, { signal: "INVENTORY_DELIVERY", severity: "MEDIUM", message: "High volume (25 units) requires multi-warehouse split", points: 10 }]), createdAt: daysAgo(1) },
      { quoteId: revisionRequested.id, score: 22, level: "AT_RISK", reasons: JSON.stringify([{ signal: "STALL", severity: "HIGH", message: "Quote returned for revision 5 days ago; no customer response", points: 15 }, { signal: "NEGOTIATION_CHURN", severity: "MEDIUM", message: "Support add-on missing from requested revision", points: 7 }]), createdAt: daysAgo(1) },
      { quoteId: rejected.id, score: 42, level: "CRITICAL", reasons: JSON.stringify([{ signal: "STALL", severity: "CRITICAL", message: "Rejected by finance; margin below policy floor", points: 25 }, { signal: "NEGOTIATION_CHURN", severity: "HIGH", message: "No customer response in 12 days", points: 17 }]), createdAt: daysAgo(2) },
      { quoteId: negotiating.id, score: 21, level: "AT_RISK", reasons: JSON.stringify([{ signal: "NEGOTIATION_CHURN", severity: "HIGH", message: "3 negotiation counter-offers back and forth", points: 12 }, { signal: "DISCOUNT_ANOMALY", severity: "MEDIUM", message: "Customer counter-offer exceeds tier baseline by 8%", points: 9 }]), createdAt: daysAgo(1) },
      { quoteId: negotiating2.id, score: 9, level: "HEALTHY", reasons: JSON.stringify([]), createdAt: daysAgo(0) },
      { quoteId: fulfilling.id, score: 14, level: "WATCH", reasons: JSON.stringify([{ signal: "INVENTORY_DELIVERY", severity: "MEDIUM", message: "Partial fulfillment shipment delayed at East Depot", points: 14 }]), createdAt: daysAgo(1) },
      { quoteId: approved.id, score: 3, level: "HEALTHY", reasons: JSON.stringify([]), createdAt: daysAgo(9) },
      { quoteId: criticalDiscountAnomaly.id, score: 48, level: "CRITICAL", reasons: JSON.stringify([{ signal: "DISCOUNT_ANOMALY", severity: "CRITICAL", message: "Requested discount (32%) is 21% higher than rep average", points: 25 }, { signal: "MARGIN", severity: "HIGH", message: "Gross margin 8.1% below 15% threshold", points: 15 }, { signal: "APPROVAL_DELAY", severity: "HIGH", message: "Awaiting Finance VP sign-off for 8 days", points: 8 }]), createdAt: daysAgo(1) },
      { quoteId: criticalStalledDeal.id, score: 45, level: "CRITICAL", reasons: JSON.stringify([{ signal: "STALL", severity: "CRITICAL", message: "Deal idle for 16 days without negotiation progress", points: 25 }, { signal: "NEGOTIATION_CHURN", severity: "HIGH", message: "4 counter-proposals exchanged with price deadlock", points: 12 }, { signal: "INVENTORY_DELIVERY", severity: "MEDIUM", message: "Requested server configuration on backorder", points: 8 }]), createdAt: daysAgo(1) },
      { quoteId: discountAnomalyQuote.id, score: 32, level: "AT_RISK", reasons: JSON.stringify([{ signal: "DISCOUNT_ANOMALY", severity: "HIGH", message: "28% discount given on non-tiered account (standard cap 5%)", points: 20 }, { signal: "APPROVAL_DELAY", severity: "MEDIUM", message: "Stalled in sales manager review queue for 5 days", points: 12 }]), createdAt: daysAgo(1) },
      { quoteId: pendingStrategicBundle.id, score: 11, level: "WATCH", reasons: JSON.stringify([{ signal: "APPROVAL_DELAY", severity: "LOW", message: "New bundle submission pending manager check", points: 11 }]), createdAt: daysAgo(0) },
      // history: event showing previous state
      { quoteId: pendingMgr.id, score: 6, level: "HEALTHY", reasons: JSON.stringify([]), createdAt: daysAgo(3) },
    ],
  });

  // --- Alerts (quote-scoped and system-wide, ack + unack) ---
  console.log("Seeding alerts...");
  await prisma.alert.createMany({
    data: [
      { quoteId: criticalDiscountAnomaly.id, type: "DISCOUNT_ANOMALY", severity: "CRITICAL", message: "High-value quote Q-2026 contains 32% discount, triggering an anomaly flag.", acknowledged: false, createdAt: daysAgo(1) },
      { quoteId: criticalStalledDeal.id, type: "DEAL_STALLED", severity: "HIGH", message: "Deal with Beta Industries has been idle for over 14 days.", acknowledged: false, createdAt: daysAgo(2) },
      { quoteId: discountAnomalyQuote.id, type: "DISCOUNT_ANOMALY", severity: "HIGH", message: "Discount exceeds non-tiered customer policy limits by 23 points.", acknowledged: false, createdAt: daysAgo(1) },
      { quoteId: rejected.id, type: "MARGIN_BELOW_FLOOR", severity: "HIGH", message: "Quote margin fell to 6.2%, below the 8% policy floor.", acknowledged: true, createdAt: daysAgo(12) },
      { quoteId: pendingBoth.id, type: "APPROVAL_STALLED", severity: "MEDIUM", message: "Quote has been pending finance approval for 4 days.", acknowledged: false, createdAt: daysAgo(1) },
      { quoteId: negotiating.id, type: "DISCOUNT_ANOMALY", severity: "MEDIUM", message: "Customer counter-offer exceeds tier default discount by 8pts.", acknowledged: false, createdAt: daysAgo(2) },
      { quoteId: fulfilling.id, type: "DELIVERY_SLIPPED", severity: "HIGH", message: "Partial shipment from East Depot delayed by carrier.", acknowledged: false, createdAt: daysAgo(1) },
      { quoteId: null, type: "INVENTORY_LOW", severity: "MEDIUM", message: "Enterprise Server R740 stock at East Depot is critically low (3 units).", acknowledged: false, createdAt: daysAgo(1) },
      { quoteId: null, type: "INVENTORY_OUT", severity: "HIGH", message: "Laptop Pro 14 is out of stock at South Hub.", acknowledged: true, createdAt: daysAgo(3) },
    ],
  });

  // --- Audit logs across entity types ---
  console.log("Seeding audit logs...");
  await prisma.auditLog.createMany({
    data: [
      { entityType: "Quote", entityId: approved.id, action: "STATUS_CHANGE", actorId: ctx.userMap["manager@dealflow.com"], beforeData: JSON.stringify({ status: "PENDING_APPROVAL" }), afterData: JSON.stringify({ status: "APPROVED" }), reason: "Within standard tier discount.", createdAt: daysAgo(9) },
      { entityType: "Quote", entityId: rejected.id, action: "STATUS_CHANGE", actorId: ctx.userMap["deepak.joshi@dealflow.com"], beforeData: JSON.stringify({ status: "PENDING_APPROVAL" }), afterData: JSON.stringify({ status: "REJECTED" }), reason: "Margin below floor.", createdAt: daysAgo(12) },
      { entityType: "Order", entityId: fulfillingOrder.id, action: "MARK_FULFILLING", actorId: ctx.userMap["sunita.pillai@dealflow.com"], beforeData: JSON.stringify({ status: "CONFIRMED" }), afterData: JSON.stringify({ status: "PARTIALLY_FULFILLED" }), reason: null, createdAt: daysAgo(15) },
      { entityType: "Invoice", entityId: paidInvoice1.id, action: "MARK_PAID", actorId: ctx.userMap["deepak.joshi@dealflow.com"], beforeData: JSON.stringify({ status: "ISSUED" }), afterData: JSON.stringify({ status: "PAID" }), reason: null, createdAt: daysAgo(30) },
      { entityType: "Product", entityId: ctx.productMap["NWK-SW-001"], action: "BULK_UPDATE", actorId: ctx.userMap["admin@dealflow.com"], beforeData: JSON.stringify({ taxPercent: 12 }), afterData: JSON.stringify({ taxPercent: 18 }), reason: "GST rate correction.", createdAt: daysAgo(40) },
      { entityType: "Inventory", entityId: ctx.productMap["SRV-ENT-001"], action: "STOCK_ADJUSTED", actorId: ctx.userMap["sunita.pillai@dealflow.com"], beforeData: JSON.stringify({ quantityAvailable: 8 }), afterData: JSON.stringify({ quantityAvailable: 3 }), reason: "Physical count reconciliation.", createdAt: daysAgo(2) },
      { entityType: "Customer", entityId: gold, action: "CUSTOMER_REGISTERED", actorId: null, beforeData: null, afterData: JSON.stringify({ companyName: "Acme Corp" }), reason: "Self-registered via onboarding portal.", createdAt: daysAgo(200) },
    ],
  });

  // --- Notifications (read + unread, per-role, incl. broadcast with null recipient) ---
  console.log("Seeding notifications...");
  await prisma.notification.createMany({
    data: [
      { recipientId: ctx.userMap["manager@dealflow.com"], type: "APPROVAL_REQUIRED", message: `Quote ${pendingMgr.quoteNumber} needs your approval.`, read: false, createdAt: daysAgo(3) },
      { recipientId: ctx.userMap["deepak.joshi@dealflow.com"], type: "APPROVAL_REQUIRED", message: `Quote ${pendingBoth.quoteNumber} needs finance approval.`, read: false, createdAt: daysAgo(4) },
      { recipientId: ctx.userMap["sales@dealflow.com"], type: "QUOTE_REJECTED", message: `Quote ${rejected.quoteNumber} was rejected: margin below floor.`, read: true, createdAt: daysAgo(12) },
      { recipientId: ctx.userMap["megha.iyer@dealflow.com"], type: "REVISION_REQUESTED", message: `Quote ${revisionRequested.quoteNumber} needs revisions before resubmission.`, read: false, createdAt: daysAgo(5) },
      { recipientId: ctx.userMap["sunita.pillai@dealflow.com"], type: "ORDER_READY_TO_FULFILL", message: `Order ${confirmedOrder.orderNumber} is ready for fulfillment.`, read: false, createdAt: daysAgo(11) },
      { recipientId: ctx.userMap["deepak.joshi@dealflow.com"], type: "INVOICE_PAID", message: `Invoice ${paidInvoice1.invoiceNumber} was paid in full.`, read: true, createdAt: daysAgo(30) },
      { recipientId: ctx.userMap["sales@dealflow.com"], type: "SUBSCRIPTION_CANCELLED", message: "Cloud Platform subscription for Beta Industries was cancelled.", read: false, createdAt: daysAgo(20) },
      { recipientId: null, type: "SYSTEM_MAINTENANCE", message: "Scheduled maintenance this weekend, 11 PM–2 AM IST.", read: false, createdAt: daysAgo(2) }, // broadcast, no single recipient
      { recipientId: ctx.userMap["admin@dealflow.com"], type: "INVENTORY_OUT", message: "Laptop Pro 14 is out of stock at South Hub.", read: false, createdAt: daysAgo(3) },
    ],
  });

  return allQuotes;
}

// -----------------------------------------------------------------------------
// 5. Bulk filler quotes for pagination / list / analytics screens
// -----------------------------------------------------------------------------
async function seedBulkQuotes(ctx: Ctx, bulkCompanyIds: string[]) {
  console.log("Seeding bulk filler quotes for pagination & analytics coverage...");
  const statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "UNDER_NEGOTIATION", "CONFIRMED", "FULFILLING", "COMPLETED", "CANCELLED"];
  const skus = Object.keys(ctx.productMap).filter((s) => s !== "DSK-LEG-001");
  const repEmails = SALES_REPS;

  for (let i = 0; i < 35; i++) {
    const customerId = pick(bulkCompanyIds);
    const status = statuses[i % statuses.length]; // ensures every status appears repeatedly
    const rep = pick(repEmails);
    const numLines = 1 + Math.floor(Math.random() * 3);
    const lines = Array.from({ length: numLines }).map(() => {
      const billingType = Math.random() > 0.75 ? "RECURRING" : "ONE_TIME";
      const subscriptionPlanId = billingType === "RECURRING" ? pick(Object.values(ctx.subPlanMap)) : undefined;
      return buildLine(ctx, pick(skus), 1 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 20), billingType, subscriptionPlanId);
    });
    const riskScore = Math.floor(Math.random() * 45);
    const riskLevel = riskScore >= 35 ? "CRITICAL" : riskScore >= 20 ? "HIGH" : riskScore >= 10 ? "MEDIUM" : "LOW";

    await createQuoteWithLines(ctx, {
      customerId,
      salesRepEmail: rep,
      status,
      riskScore,
      riskLevel,
      createdDaysAgo: Math.floor(Math.random() * 120),
      lines,
    });
  }
}

// -----------------------------------------------------------------------------
// Main execution
// -----------------------------------------------------------------------------
async function main() {
  const userMap = await seedUsers();
  const { tierMap, productMap, warehouseMap, subPlanMap, products } = await seedCatalog();
  const { customerMap, bulkCompanyIds } = await seedCustomers(tierMap, userMap);

  const ctx: Ctx = { tierMap, productMap, products, warehouseMap, subPlanMap, customerMap, userMap };

  await seedQuotesAndDownstream(ctx);
  await seedBulkQuotes(ctx, bulkCompanyIds);

  console.log("✅ Seed completed successfully — every model populated with varied, industry-realistic states.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });