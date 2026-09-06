import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { serializeForApi } from "@/lib/api-response";
import { CustomerBillingClient } from "./CustomerBillingClient";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  let customer = await prisma.customer.findFirst({
    where: { email: user.email },
  });

  if (!customer && user.name) {
    customer = await prisma.customer.findFirst({
      where: { companyName: { contains: user.name, mode: "insensitive" } },
    });
  }

  // If customer record doesn't exist yet, ensure one is created
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyName: user.name || "Enterprise Customer",
        contactName: user.name || "Primary Contact",
        email: user.email,
        tier: "GOLD",
      },
    });
  }

  // Fetch all invoices for customer, or linked through customer's quotes
  const invoicesList = await prisma.invoice.findMany({
    where: {
      OR: [
        { customerId: customer.id },
        { quote: { customerId: customer.id } },
      ],
    },
    include: {
      lines: true,
      quote: {
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  // Fetch all subscriptions for this customer (both ACTIVE and CANCELLED so customer can manage/reactivate)
  const subscriptionsList = await prisma.subscription.findMany({
    where: {
      customerId: customer.id,
    },
    include: {
      plan: true,
      lines: {
        include: {
          quoteLine: { include: { product: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch catalog recurring products for direct subscription buying
  const recurringProductsList = await prisma.product.findMany({
    where: { billingType: "RECURRING" },
    orderBy: { listPrice: "asc" },
  });

  const invoices = serializeForApi(invoicesList) as any[];
  const subscriptions = serializeForApi(subscriptionsList) as any[];
  const recurringProducts = serializeForApi(recurringProductsList) as any[];

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Invoices &amp; Billing</h1>
              <p className={styles.subtitle}>
                Track your account invoices, recurring plans, and certified tax receipts
              </p>
            </div>
          </header>

          <CustomerBillingClient
            invoices={invoices}
            subscriptions={subscriptions}
            recurringProducts={recurringProducts}
          />
        </div>
      </main>
    </RoleSidebar>
  );
}
