// prisma/seed.ts
// Seeds users, customers, products, and demo data for Person 1 features.
import { PrismaClient, Role, CustomerTier, BillingType } from "../src/generated/prisma";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2ID = 2;
const hashOpts = { algorithm: ARGON2ID, memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

async function hashPassword(password: string): Promise<string> {
  return hash(password, hashOpts);
}

// ─── Fixed IDs for cross-team seed alignment ──────────────────────────────────
const DEMO_CUSTOMER_1 = "cust_acme_corp";
const DEMO_CUSTOMER_2 = "cust_globex_inc";
const DEMO_CUSTOMER_3 = "cust_initech";
const DEMO_CUSTOMER_4 = "cust_umbrella";
const DEMO_CUSTOMER_5 = "cust_wayne_ent";

// ─── Users ────────────────────────────────────────────────────────────────────
const USERS: Array<{ email: string; name: string; role: Role; approvalLimitPct: number }> = [
  { email: "rep@dealflow.local", name: "Riley Rep", role: Role.SALES_REP, approvalLimitPct: 0 },
  { email: "manager@dealflow.local", name: "Morgan Manager", role: Role.SALES_MANAGER, approvalLimitPct: 25 },
  { email: "finance@dealflow.local", name: "Finley Finance", role: Role.FINANCE, approvalLimitPct: 0 },
  { email: "admin@dealflow.local", name: "Avery Admin", role: Role.ADMIN, approvalLimitPct: 100 },
  { email: "customer@dealflow.local", name: "Casey Customer", role: Role.CUSTOMER, approvalLimitPct: 0 },
];

// ─── Customers ────────────────────────────────────────────────────────────────
const CUSTOMERS = [
  { id: DEMO_CUSTOMER_1, companyName: "Acme Corporation", contactName: "John Smith", email: "john@acme.corp", phone: "+91-9876543210", tier: CustomerTier.GOLD },
  { id: DEMO_CUSTOMER_2, companyName: "Globex Inc.", contactName: "Sarah Connor", email: "sarah@globex.inc", phone: "+91-9876543211", tier: CustomerTier.SILVER },
  { id: DEMO_CUSTOMER_3, companyName: "Initech Solutions", contactName: "Peter Gibbons", email: "peter@initech.sol", phone: "+91-9876543212", tier: CustomerTier.BRONZE },
  { id: DEMO_CUSTOMER_4, companyName: "Umbrella Ltd.", contactName: "Alice Wong", email: "alice@umbrella.ltd", phone: "+91-9876543213", tier: CustomerTier.GOLD },
  { id: DEMO_CUSTOMER_5, companyName: "Wayne Enterprises", contactName: "Bruce Wayne", email: "bruce@wayne.ent", phone: "+91-9876543214", tier: CustomerTier.SILVER },
];

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // Hardware (ONE_TIME)
  { sku: "HW-LAPTOP-001", name: "Business Laptop Pro", category: "Hardware", listPrice: 85000, unitCost: 62000, taxRate: 18, minimumMargin: 15, billingType: BillingType.ONE_TIME },
  { sku: "HW-LAPTOP-002", name: "Developer Workstation", category: "Hardware", listPrice: 125000, unitCost: 92000, taxRate: 18, minimumMargin: 12, billingType: BillingType.ONE_TIME },
  { sku: "HW-MONITOR-001", name: "27\" 4K Monitor", category: "Hardware", listPrice: 32000, unitCost: 22000, taxRate: 18, minimumMargin: 20, billingType: BillingType.ONE_TIME },
  { sku: "HW-KEYBOARD-001", name: "Mechanical Keyboard", category: "Hardware", listPrice: 8500, unitCost: 4200, taxRate: 18, minimumMargin: 25, billingType: BillingType.ONE_TIME },
  { sku: "HW-MOUSE-001", name: "Wireless Ergonomic Mouse", category: "Hardware", listPrice: 3500, unitCost: 1800, taxRate: 18, minimumMargin: 30, billingType: BillingType.ONE_TIME },
  { sku: "HW-DOCK-001", name: "USB-C Docking Station", category: "Hardware", listPrice: 12000, unitCost: 7500, taxRate: 18, minimumMargin: 20, billingType: BillingType.ONE_TIME },
  { sku: "HW-HEADSET-001", name: "Noise Cancelling Headset", category: "Hardware", listPrice: 15000, unitCost: 9000, taxRate: 18, minimumMargin: 20, billingType: BillingType.ONE_TIME },
  // Services (ONE_TIME)
  { sku: "SVC-SETUP-001", name: "Hardware Setup & Config", category: "Services", listPrice: 5000, unitCost: 2000, taxRate: 18, minimumMargin: 40, billingType: BillingType.ONE_TIME },
  { sku: "SVC-INSTALL-001", name: "On-Site Installation", category: "Services", listPrice: 12000, unitCost: 6000, taxRate: 18, minimumMargin: 30, billingType: BillingType.ONE_TIME },
  { sku: "SVC-TRAINING-001", name: "Team Training Session", category: "Services", listPrice: 25000, unitCost: 8000, taxRate: 18, minimumMargin: 50, billingType: BillingType.ONE_TIME },
  // Software (RECURRING)
  { sku: "SW-CLOUD-001", name: "Cloud Workspace Suite", category: "Software", listPrice: 1500, unitCost: 400, taxRate: 18, minimumMargin: 50, billingType: BillingType.RECURRING },
  { sku: "SW-SECURITY-001", name: "Endpoint Security Pro", category: "Software", listPrice: 800, unitCost: 200, taxRate: 18, minimumMargin: 50, billingType: BillingType.RECURRING },
  { sku: "SW-BACKUP-001", name: "Cloud Backup 1TB", category: "Software", listPrice: 500, unitCost: 120, taxRate: 18, minimumMargin: 50, billingType: BillingType.RECURRING },
  { sku: "SW-COLLAB-001", name: "Team Collaboration Platform", category: "Software", listPrice: 1200, unitCost: 300, taxRate: 18, minimumMargin: 50, billingType: BillingType.RECURRING },
  { sku: "SW-CRM-001", name: "CRM Professional", category: "Software", listPrice: 2500, unitCost: 600, taxRate: 18, minimumMargin: 50, billingType: BillingType.RECURRING },
  // Support (RECURRING)
  { sku: "SUP-BASIC-001", name: "Basic Support Plan", category: "Support", listPrice: 3000, unitCost: 1200, taxRate: 18, minimumMargin: 40, billingType: BillingType.RECURRING },
  { sku: "SUP-PREM-001", name: "Premium 24/7 Support", category: "Support", listPrice: 8000, unitCost: 3500, taxRate: 18, minimumMargin: 35, billingType: BillingType.RECURRING },
  // Networking (ONE_TIME)
  { sku: "NET-ROUTER-001", name: "Enterprise Router", category: "Networking", listPrice: 45000, unitCost: 30000, taxRate: 18, minimumMargin: 18, billingType: BillingType.ONE_TIME },
  { sku: "NET-SWITCH-001", name: "48-Port Managed Switch", category: "Networking", listPrice: 28000, unitCost: 18000, taxRate: 18, minimumMargin: 20, billingType: BillingType.ONE_TIME },
  { sku: "NET-AP-001", name: "Wi-Fi 6E Access Point", category: "Networking", listPrice: 9500, unitCost: 5500, taxRate: 18, minimumMargin: 25, billingType: BillingType.ONE_TIME },
];

// ─── Discount Rules ───────────────────────────────────────────────────────────
const DISCOUNT_RULES = [
  // BRONZE — low discounts allowed
  { customerTier: CustomerTier.BRONZE, productCategory: "Hardware", maxAutoApprovePct: 5, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.BRONZE, productCategory: "Services", maxAutoApprovePct: 5, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.BRONZE, productCategory: "Software", maxAutoApprovePct: 5, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.BRONZE, productCategory: "Support", maxAutoApprovePct: 5, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.BRONZE, productCategory: "Networking", maxAutoApprovePct: 5, requiredRole: Role.SALES_MANAGER },
  // SILVER
  { customerTier: CustomerTier.SILVER, productCategory: "Hardware", maxAutoApprovePct: 10, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.SILVER, productCategory: "Services", maxAutoApprovePct: 8, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.SILVER, productCategory: "Software", maxAutoApprovePct: 10, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.SILVER, productCategory: "Support", maxAutoApprovePct: 10, requiredRole: Role.SALES_MANAGER },
  { customerTier: CustomerTier.SILVER, productCategory: "Networking", maxAutoApprovePct: 10, requiredRole: Role.SALES_MANAGER },
  // GOLD — generous discounts
  { customerTier: CustomerTier.GOLD, productCategory: "Hardware", maxAutoApprovePct: 15, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.GOLD, productCategory: "Services", maxAutoApprovePct: 10, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.GOLD, productCategory: "Software", maxAutoApprovePct: 15, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.GOLD, productCategory: "Support", maxAutoApprovePct: 15, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.GOLD, productCategory: "Networking", maxAutoApprovePct: 15, requiredRole: Role.FINANCE },
  // PLATINUM
  { customerTier: CustomerTier.PLATINUM, productCategory: "Hardware", maxAutoApprovePct: 20, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.PLATINUM, productCategory: "Services", maxAutoApprovePct: 15, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.PLATINUM, productCategory: "Software", maxAutoApprovePct: 20, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.PLATINUM, productCategory: "Support", maxAutoApprovePct: 20, requiredRole: Role.FINANCE },
  { customerTier: CustomerTier.PLATINUM, productCategory: "Networking", maxAutoApprovePct: 20, requiredRole: Role.FINANCE },
];

// ─── Warehouses ───────────────────────────────────────────────────────────────
const WAREHOUSES = [
  { code: "WH-NORTH", name: "North Region Warehouse", region: "North India" },
  { code: "WH-SOUTH", name: "South Region Warehouse", region: "South India" },
  { code: "WH-WEST", name: "West Region Warehouse", region: "West India" },
];

// ─── Upsell Rules ─────────────────────────────────────────────────────────────
// These pair products: when the trigger is in cart, recommend the target
const UPSELL_PAIRS = [
  // Laptop → Mouse, Keyboard, Monitor, Dock, Security
  { triggerCategory: "Hardware", recommendSku: "HW-MOUSE-001", kind: "CROSS_SELL" as const, priority: 1 },
  { triggerCategory: "Hardware", recommendSku: "HW-KEYBOARD-001", kind: "CROSS_SELL" as const, priority: 2 },
  { triggerCategory: "Hardware", recommendSku: "HW-MONITOR-001", kind: "UPSELL" as const, priority: 3 },
  { triggerCategory: "Hardware", recommendSku: "SVC-SETUP-001", kind: "CROSS_SELL" as const, priority: 4 },
  { triggerCategory: "Hardware", recommendSku: "SW-SECURITY-001", kind: "CROSS_SELL" as const, priority: 5 },
  { triggerCategory: "Software", recommendSku: "SUP-PREM-001", kind: "UPSELL" as const, priority: 1 },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Users ──
  const passwordHash = await hashPassword("password123");
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, approvalLimitPct: u.approvalLimitPct, emailVerified: true },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        approvalLimitPct: u.approvalLimitPct,
        passwordHash,
        emailVerified: true,
      },
    });
    console.log(`  ✓ User: ${u.email.padEnd(28)} ${u.role}`);
  }

  console.log(`\nSeeded ${USERS.length} users. Password for all: password123`);

  // Run Person 2 seed
  const { seedApprovals } = await import("./seed/approvals");
  await seedApprovals(prisma);
  // ── Customers ──
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { email: c.email },
      update: { companyName: c.companyName, contactName: c.contactName, phone: c.phone, tier: c.tier },
      create: c,
    });
    console.log(`  ✓ Customer: ${c.companyName.padEnd(22)} ${c.tier}`);
  }

  // ── Products ──
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, category: p.category, listPrice: p.listPrice, unitCost: p.unitCost, taxRate: p.taxRate, minimumMargin: p.minimumMargin, billingType: p.billingType },
      create: p,
    });
    console.log(`  ✓ Product: ${p.sku.padEnd(20)} ₹${p.listPrice.toLocaleString().padEnd(10)} ${p.category}`);
  }

  // ── Discount Rules ──
  for (const r of DISCOUNT_RULES) {
    await prisma.discountRule.upsert({
      where: { customerTier_productCategory: { customerTier: r.customerTier, productCategory: r.productCategory } },
      update: { maxAutoApprovePct: r.maxAutoApprovePct, requiredRole: r.requiredRole },
      create: r,
    });
  }
  console.log(`  ✓ Discount rules: ${DISCOUNT_RULES.length} tier×category combos`);

  // ── Warehouses ──
  for (const w of WAREHOUSES) {
    const wh = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, region: w.region },
      create: w,
    });

    // Stock each warehouse with all products (uneven quantities for demo)
    const allProducts = await prisma.product.findMany();
    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      // Make stock deliberately uneven
      let qty = 0;
      if (w.code === "WH-NORTH") qty = i % 3 === 0 ? 50 : (i % 3 === 1 ? 10 : 1);
      if (w.code === "WH-SOUTH") qty = i % 3 === 0 ? 5 : (i % 3 === 1 ? 30 : 0);
      if (w.code === "WH-WEST") qty = i % 3 === 0 ? 0 : (i % 3 === 1 ? 15 : 25);

      if (qty > 0) {
        await prisma.stock.upsert({
          where: { warehouseId_productId: { warehouseId: wh.id, productId: product.id } },
          update: { qtyOnHand: qty },
          create: { warehouseId: wh.id, productId: product.id, qtyOnHand: qty },
        });
      }
    }
    console.log(`  ✓ Warehouse: ${w.name}`);
  }

  // ── Upsell Rules ──
  for (const u of UPSELL_PAIRS) {
    const recProduct = await prisma.product.findUnique({ where: { sku: u.recommendSku } });
    if (!recProduct) continue;
    await prisma.upsellRule.create({
      data: {
        triggerCategory: u.triggerCategory,
        recommendedProductId: recProduct.id,
        kind: u.kind,
        priority: u.priority,
      },
    });
  }
  console.log(`  ✓ Upsell rules: ${UPSELL_PAIRS.length}`);

  // ── Default Price List ──
  const allProducts = await prisma.product.findMany();
  const priceList = await prisma.priceList.upsert({
    where: { id: "default-price-list" },
    update: { name: "Standard Price List" },
    create: { id: "default-price-list", name: "Standard Price List", currency: "INR" },
  });
  for (const p of allProducts) {
    await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: priceList.id, productId: p.id } },
      update: { price: p.listPrice },
      create: { priceListId: priceList.id, productId: p.id, price: p.listPrice },
    });
  }
  console.log(`  ✓ Price list: Standard (${allProducts.length} items)`);

  console.log(`\n✅ Seeded successfully!`);
  console.log(`   ${USERS.length} users (password: password123)`);
  console.log(`   ${CUSTOMERS.length} customers`);
  console.log(`   ${PRODUCTS.length} products`);
  console.log(`   ${DISCOUNT_RULES.length} discount rules`);
  console.log(`   ${WAREHOUSES.length} warehouses with stock`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
