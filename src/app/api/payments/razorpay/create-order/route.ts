export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import Razorpay from "razorpay";

const serverKeyId = process.env.RAZORPAY_KEY_ID || "";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || serverKeyId;

// True only when *real* Razorpay credentials are configured. The defaults
// below intentionally fail so we never silently hit Razorpay with placeholder
// data.
const HAS_REAL_KEYS =
  Boolean(serverKeyId) &&
  Boolean(key_secret) &&
  !serverKeyId.includes("Mock") &&
  !serverKeyId.includes("PLACEHOLDER");

export async function POST(req: NextRequest) {
  const { user, response } = await requireRole("ADMIN", "FINANCE", "CUSTOMER");
  if (response) return response;

  try {
    const body = await req.json().catch(() => ({}));
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "productId is required" } },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    // Convert amount in INR paise for Razorpay
    const amountInPaise = Math.round(Number(product.listPrice) * 100);
    const receipt = `rcpt_${Date.now().toString().slice(-8)}`;

    let razorpayOrderId = `order_mock_${Date.now()}`;
    let mode: "live" | "test" = "test";

    // If active Razorpay client can connect or mock cleanly
    if (HAS_REAL_KEYS) {
      try {
        const rzp = new Razorpay({ key_id: serverKeyId, key_secret });
        const order = await rzp.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt,
          notes: {
            productId: product.id,
            productName: product.name,
            userId: user!.id,
            userEmail: user!.email,
          },
        });
        razorpayOrderId = order.id;
        mode = serverKeyId.startsWith("rzp_live_") ? "live" : "test";
      } catch (rzpErr) {
        console.warn(
          "Razorpay API order creation failed, falling back to embedded checkout:",
          rzpErr
        );
        razorpayOrderId = `order_mock_${Date.now()}`;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        keyId: publicKeyId,
        mode,
        isMock: !HAS_REAL_KEYS || razorpayOrderId.startsWith("order_mock_"),
        product: {
          id: product.id,
          name: product.name,
          listPrice: Number(product.listPrice),
          category: product.category,
        },
        user: {
          name: user!.name,
          email: user!.email,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
