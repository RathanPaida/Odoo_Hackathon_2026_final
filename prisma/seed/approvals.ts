import { PrismaClient, CustomerTier, ApprovalLevel, ProductType, Role, QuotationStatus, OrderStatus } from "../../src/generated/prisma";

export async function seedApprovals(prisma: PrismaClient) {
  console.log("🌱 [PERSON 2] Seeding Categories, Products, Governance, Warehouses & Stocks...");

  // ─── 1. Categories ───────────────────────────────────────────────────────────
  const catHardware = await prisma.category.upsert({
    where: { id: "cat-hardware-1111" },
    create: {
      id: "cat-hardware-1111",
      name: "Hardware",
      description: "Laptops, workstations, and physical devices",
    },
    update: {
      name: "Hardware",
      description: "Laptops, workstations, and physical devices",
    },
  });

  const catServices = await prisma.category.upsert({
    where: { id: "cat-services-2222" },
    create: {
      id: "cat-services-2222",
      name: "Services",
      description: "Professional implementation, onboarding, and consulting",
    },
    update: {
      name: "Services",
      description: "Professional implementation, onboarding, and consulting",
    },
  });

  const catSoftware = await prisma.category.upsert({
    where: { id: "cat-software-3333" },
    create: {
      id: "cat-software-3333",
      name: "Software",
      description: "SaaS subscriptions and software platform licenses",
    },
    update: {
      name: "Software",
      description: "SaaS subscriptions and software platform licenses",
    },
  });

  // ─── 2. Shared Products (Fixed agreed UUIDs) ──────────────────────────────────
  const prodLaptop = await prisma.product.upsert({
    where: { id: "p1111111-1111-1111-1111-111111111111" },
    create: {
      id: "p1111111-1111-1111-1111-111111111111",
      name: "Enterprise Laptop X15",
      description: "High performance workstation with 32GB RAM & 1TB SSD",
      categoryId: catHardware.id,
      productType: ProductType.ONE_TIME,
      basePrice: 1200.0,
      costPrice: 900.0,
      taxRate: 8.0,
      minimumMargin: 15.0,
      active: true,
    },
    update: {
      name: "Enterprise Laptop X15",
      basePrice: 1200.0,
      costPrice: 900.0,
      minimumMargin: 15.0,
    },
  });

  const prodService = await prisma.product.upsert({
    where: { id: "p2222222-2222-2222-2222-222222222222" },
    create: {
      id: "p2222222-2222-2222-2222-222222222222",
      name: "Setup & Migration Service",
      description: "Onsite configuration, data migration, and staff training",
      categoryId: catServices.id,
      productType: ProductType.ONE_TIME,
      basePrice: 500.0,
      costPrice: 200.0,
      taxRate: 5.0,
      minimumMargin: 25.0,
      active: true,
    },
    update: {
      name: "Setup & Migration Service",
      basePrice: 500.0,
      costPrice: 200.0,
      minimumMargin: 25.0,
    },
  });

  const prodCloud = await prisma.product.upsert({
    where: { id: "p3333333-3333-3333-3333-333333333333" },
    create: {
      id: "p3333333-3333-3333-3333-333333333333",
      name: "Cloud Ops Subscription Pro",
      description: "24/7 self-healing operations and dedicated support tier",
      categoryId: catSoftware.id,
      productType: ProductType.SUBSCRIPTION,
      basePrice: 150.0,
      costPrice: 50.0,
      taxRate: 0.0,
      minimumMargin: 30.0,
      active: true,
    },
    update: {
      name: "Cloud Ops Subscription Pro",
      basePrice: 150.0,
      costPrice: 50.0,
      minimumMargin: 30.0,
    },
  });

  // ─── 3. Customer Tier Ceilings (Section 13) ──────────────────────────────────
  await prisma.discountTier.upsert({
    where: { customerTier: CustomerTier.GOLD },
    create: { customerTier: CustomerTier.GOLD, maximumDiscount: 15.0, active: true },
    update: { maximumDiscount: 15.0 },
  });

  await prisma.discountTier.upsert({
    where: { customerTier: CustomerTier.SILVER },
    create: { customerTier: CustomerTier.SILVER, maximumDiscount: 10.0, active: true },
    update: { maximumDiscount: 10.0 },
  });

  await prisma.discountTier.upsert({
    where: { customerTier: CustomerTier.BRONZE },
    create: { customerTier: CustomerTier.BRONZE, maximumDiscount: 5.0, active: true },
    update: { maximumDiscount: 5.0 },
  });

  // ─── 4. Category Discount Ceilings (Section 13) ──────────────────────────────
  await prisma.categoryDiscountRule.upsert({
    where: { categoryId: catHardware.id },
    create: { categoryId: catHardware.id, maximumDiscount: 15.0, active: true },
    update: { maximumDiscount: 15.0 },
  });

  await prisma.categoryDiscountRule.upsert({
    where: { categoryId: catServices.id },
    create: { categoryId: catServices.id, maximumDiscount: 10.0, active: true },
    update: { maximumDiscount: 10.0 },
  });

  await prisma.categoryDiscountRule.upsert({
    where: { categoryId: catSoftware.id },
    create: { categoryId: catSoftware.id, maximumDiscount: 20.0, active: true },
    update: { maximumDiscount: 20.0 },
  });

  // ─── 5. Approval Rules (Section 13) ──────────────────────────────────────────
  await prisma.approvalRule.deleteMany({});
  await prisma.approvalRule.createMany({
    data: [
      {
        minimumRiskScore: 0.0,
        maximumRiskScore: 0.0,
        requiredApprovalLevel: ApprovalLevel.NONE,
        active: true,
      },
      {
        minimumRiskScore: 0.01,
        maximumRiskScore: 25.0,
        requiredApprovalLevel: ApprovalLevel.MANAGER,
        active: true,
      },
      {
        minimumRiskScore: 25.01,
        maximumRiskScore: 1000.0,
        requiredApprovalLevel: ApprovalLevel.FINANCE,
        active: true,
      },
    ],
  });

  // ─── 6. Multi-Warehouses (Section 15) ────────────────────────────────────────
  const whEast = await prisma.warehouse.upsert({
    where: { id: "wh-east-1111" },
    create: {
      id: "wh-east-1111",
      name: "New York Regional Hub",
      latitude: 40.7128,
      longitude: -74.006,
      shippingBaseCost: 15.0,
      priority: 1,
      active: true,
    },
    update: {
      name: "New York Regional Hub",
      latitude: 40.7128,
      longitude: -74.006,
      shippingBaseCost: 15.0,
      priority: 1,
    },
  });

  const whCentral = await prisma.warehouse.upsert({
    where: { id: "wh-central-2222" },
    create: {
      id: "wh-central-2222",
      name: "Chicago Central Depot",
      latitude: 41.8781,
      longitude: -87.6298,
      shippingBaseCost: 25.0,
      priority: 2,
      active: true,
    },
    update: {
      name: "Chicago Central Depot",
      latitude: 41.8781,
      longitude: -87.6298,
      shippingBaseCost: 25.0,
      priority: 2,
    },
  });

  const whWest = await prisma.warehouse.upsert({
    where: { id: "wh-west-3333" },
    create: {
      id: "wh-west-3333",
      name: "San Francisco Pacific Center",
      latitude: 37.7749,
      longitude: -122.4194,
      shippingBaseCost: 35.0,
      priority: 3,
      active: true,
    },
    update: {
      name: "San Francisco Pacific Center",
      latitude: 37.7749,
      longitude: -122.4194,
      shippingBaseCost: 35.0,
      priority: 3,
    },
  });

  // ─── 7. Stock Levels & Usable Quantities ──────────────────────────────────────
  // NY has 5 Laptops available, 0 reserved
  await prisma.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: whEast.id, productId: prodLaptop.id } },
    create: { warehouseId: whEast.id, productId: prodLaptop.id, availableQuantity: 5, reservedQuantity: 0, reorderLevel: 2 },
    update: { availableQuantity: 5, reservedQuantity: 0 },
  });

  // Chicago has 10 Laptops available, 0 reserved
  await prisma.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: whCentral.id, productId: prodLaptop.id } },
    create: { warehouseId: whCentral.id, productId: prodLaptop.id, availableQuantity: 10, reservedQuantity: 0, reorderLevel: 5 },
    update: { availableQuantity: 10, reservedQuantity: 0 },
  });

  // SF has 20 Laptops available, 0 reserved
  await prisma.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: whWest.id, productId: prodLaptop.id } },
    create: { warehouseId: whWest.id, productId: prodLaptop.id, availableQuantity: 20, reservedQuantity: 0, reorderLevel: 5 },
    update: { availableQuantity: 20, reservedQuantity: 0 },
  });

  // Services & Cloud are digital/on-demand (virtual infinite stock or 999)
  await prisma.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: whEast.id, productId: prodService.id } },
    create: { warehouseId: whEast.id, productId: prodService.id, availableQuantity: 100, reservedQuantity: 0, reorderLevel: 10 },
    update: { availableQuantity: 100 },
  });

  // ─── 8. Demo Customers & Demo Quotation (Section 13 Worked Example) ───────────
  const customerGold = await prisma.customer.upsert({
    where: { email: "purchasing@acme.com" },
    create: {
      id: "c1111111-1111-1111-1111-111111111111",
      companyName: "Acme Corporation",
      contactName: "Sarah Jenkins",
      email: "purchasing@acme.com",
      phone: "+1-555-0100",
      customerTier: CustomerTier.GOLD,
      currency: "USD",
      active: true,
    },
    update: {
      companyName: "Acme Corporation",
      customerTier: CustomerTier.GOLD,
    },
  });

  const demoRep = await prisma.user.findFirst({
    where: { role: Role.SALES_REP },
  });

  const repId = demoRep?.id ?? "00000000-0000-0000-0000-000000000001";

  // Demo Quotation: Laptop at 12% discount (allowed 15%, excess 0), Service at 18% discount (allowed 10%, excess 8%)
  const demoQuote = await prisma.quotation.upsert({
    where: { quotationNumber: "QUOTE-2026-DEMO1" },
    create: {
      id: "q1111111-1111-1111-1111-111111111111",
      quotationNumber: "QUOTE-2026-DEMO1",
      customerId: customerGold.id,
      salesRepId: repId,
      status: QuotationStatus.PENDING_APPROVAL,
      currency: "USD",
      subtotal: 1700.0,
      discountAmount: 234.0,
      taxAmount: 110.0,
      totalAmount: 1576.0,
      totalCost: 1100.0,
      marginAmount: 476.0,
      marginPercentage: 30.2,
      riskScore: 25.5,
    },
    update: {
      status: QuotationStatus.PENDING_APPROVAL,
      riskScore: 25.5,
    },
  });

  await prisma.quotationLine.deleteMany({ where: { quotationId: demoQuote.id } });
  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: demoQuote.id,
        productId: prodLaptop.id,
        quantity: 1,
        unitPrice: 1200.0,
        costPrice: 900.0,
        discountPercentage: 12.0, // <= 15% ceiling -> 0 excess
        discountAmount: 144.0,
        taxPercentage: 8.0,
        taxAmount: 84.48,
        lineSubtotal: 1200.0,
        lineTotal: 1056.0,
        lineMargin: 156.0,
      },
      {
        quotationId: demoQuote.id,
        productId: prodService.id,
        quantity: 1,
        unitPrice: 500.0,
        costPrice: 200.0,
        discountPercentage: 18.0, // > 10% ceiling -> 8 excess points!
        discountAmount: 90.0,
        taxPercentage: 5.0,
        taxAmount: 20.5,
        lineSubtotal: 500.0,
        lineTotal: 410.0,
        lineMargin: 210.0,
      },
    ],
  });

  // Demo Approval Request and append-only audit action
  const approvalReq = await prisma.approvalRequest.create({
    data: {
      quotationId: demoQuote.id,
      level: ApprovalLevel.FINANCE,
      status: "PENDING_APPROVAL",
      assignedRole: Role.FINANCE,
      riskScore: 25.5,
      reason: "Setup & Migration Service discount (18%) exceeds Services category ceiling (10%) by 8.0%",
    },
  });

  await prisma.approvalAction.create({
    data: {
      approvalRequestId: approvalReq.id,
      actorId: repId,
      action: "APPROVE",
      reason: "Initial evaluation automatically triggered approval request based on blended risk rule.",
    },
  });

  // Demo Order ready for fulfillment test: 8 Laptops (NY only has 5 -> splits across NY and Chicago!)
  const demoOrder = await prisma.order.upsert({
    where: { orderNumber: "ORD-2026-DEMO1" },
    create: {
      id: "ord11111-1111-1111-1111-111111111111",
      orderNumber: "ORD-2026-DEMO1",
      quotationId: demoQuote.id,
      customerId: customerGold.id,
      status: OrderStatus.CONFIRMED,
      subtotal: 9600.0,
      taxAmount: 768.0,
      totalAmount: 10368.0,
      currency: "USD",
    },
    update: {
      status: OrderStatus.CONFIRMED,
    },
  });

  await prisma.orderLine.deleteMany({ where: { orderId: demoOrder.id } });
  await prisma.orderLine.create({
    data: {
      id: "ol-laptop-demo1",
      orderId: demoOrder.id,
      productId: prodLaptop.id,
      quantity: 8, // Triggers multi-warehouse split: 5 from NY (closer), 3 from Chicago!
      unitPrice: 1200.0,
      taxAmount: 768.0,
      totalAmount: 10368.0,
      productType: ProductType.ONE_TIME,
    },
  });

  console.log("✅ [PERSON 2] Approvals, Catalog, Governance & Warehouse seed completed successfully.");
}
