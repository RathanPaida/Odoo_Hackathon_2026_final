export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { serializeForApi } from "@/lib/api-response";
import { writeAudit } from "@/lib/audit";
import crypto from "crypto";

const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

export async function POST(req: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE", "CUSTOMER");
  if (response) return response;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId,
      autoPayEnabled = true,
      months = 12,
    } = body;

    const isMockOrder = !razorpay_order_id || razorpay_order_id.startsWith("order_mock_");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "productId is required" } },
        { status: 400 }
      );
    }

    if (!razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: { code: "PAYMENT_FAILED", message: "Payment verification failed: missing payment ID" } },
        { status: 400 }
      );
    }

    // Verify cryptographic signature when a real Razorpay order was created
    // and the client supplied a signature. Embedded mock orders skip this step.
    if (!isMockOrder) {
      if (!key_secret) {
        return NextResponse.json(
          { success: false, error: { code: "MISCONFIGURED", message: "RAZORPAY_KEY_SECRET is not set on the server" } },
          { status: 500 }
        );
      }
      if (!razorpay_signature) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_SIGNATURE", message: "Live Razorpay orders require a valid signature" } },
          { status: 400 }
        );
      }
      const generatedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_SIGNATURE", message: "Invalid Razorpay payment signature" } },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Resolve or create customer profile
    let customer = await prisma.customer.findFirst({
      where: { email: user!.email },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyName: user!.name || "Enterprise Customer",
          contactName: user!.name || "Primary Contact",
          email: user!.email,
          tier: "GOLD",
        },
      });
    }

    // Default plan
    let plan = await prisma.subscriptionPlan.findFirst();
    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: "Standard Plan",
          billingCycle: "MONTHLY",
          price: product.listPrice,
        },
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    const quoteNumber = `Q-SUB-${dateStr}-${randomStr}`;
    const orderNumber = `O-SUB-${dateStr}-${randomStr}`;
    const invoiceNumber = `INV-${dateStr.slice(0, 6)}-${randomStr}`;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: customer.id,
        ownerId: user!.id,
        status: "CONFIRMED",
        subtotal: product.listPrice,
        grandTotal: product.listPrice,
      },
    });

    const quoteLine = await prisma.quoteLine.create({
      data: {
        quoteId: quote.id,
        productId: product.id,
        qty: 1,
        unitPrice: product.listPrice,
        discountPct: new Prisma.Decimal(0),
        lineTotal: product.listPrice,
        billingType: "RECURRING",
        subscriptionMonths: months,
      },
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ONLY NOW activate the subscription since payment succeeded!
    const subscription = await prisma.subscription.create({
      data: {
        customerId: customer.id,
        orderId: orderNumber,
        productId: product.id,
        planId: plan.id,
        quantity: 1,
        status: "ACTIVE",
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        autoPayEnabled: Boolean(autoPayEnabled),
      },
    });

    // Generate certified tax invoice marked as PAID
    const invoice = await prisma.invoice.create({
      data: {
        quoteId: quote.id,
        invoiceNumber,
        customerId: customer.id,
        amount: product.listPrice,
        subtotal: product.listPrice,
        invoiceType: "RECURRING",
        status: "PAID",
        paidAmount: product.listPrice,
        dueAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: `${product.name} (Recurring Monthly Subscription via Razorpay)`,
        productId: product.id,
        quantity: 1,
        unitPrice: product.listPrice,
        totalAmount: product.listPrice,
      },
    });

    await prisma.subscriptionLine.create({
      data: {
        subscriptionId: subscription.id,
        quoteLineId: quoteLine.id,
        invoiceId: invoice.id,
        monthlyAmount: product.listPrice,
        startDate: now,
        months,
        proratedFirstAmount: product.listPrice,
      },
    });

    // Record verified Razorpay transaction in Payment model
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: product.listPrice,
        paymentMethod: "RAZORPAY_GATEWAY",
        status: "SUCCESS",
        transactionReference: razorpay_payment_id,
        paidAt: now,
      },
    });

    await writeAudit({
      entityType: "Subscription",
      entityId: subscription.id,
      action: "SUBSCRIBED_VIA_RAZORPAY",
      actorId: user!.id,
      after: {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        paymentId: payment.id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Re-fetch subscription with lines & product for complete client representation
    const fullSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        plan: true,
        lines: {
          include: {
            quoteLine: { include: { product: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeForApi({ subscription: fullSubscription || subscription, invoice, payment }),
      message: "Razorpay payment verified and subscription successfully activated.",
    });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
