import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import Link from "next/link";
import { CheckSquare, ShieldCheck, Package, Truck, ArrowRight } from "lucide-react";
import styles from "../dashboard.module.css";

const tiles = [
  {
    href: "/approvals",
    icon: CheckSquare,
    title: "Approval Queue",
    description:
      "Review and decide on quotations flagged by the blended risk engine with line-by-line discount breakdown.",
    cta: "Open Queue",
    footer: "Multi-level governance with append-only audit trail",
  },
  {
    href: "/governance",
    icon: ShieldCheck,
    title: "Discount Governance",
    description:
      "Maintain customer-tier ceilings, category discount limits, and test live calculations in the simulator.",
    cta: "Configure",
    footer: "Gold / Silver / Bronze tiers and category caps",
  },
  {
    href: "/catalog",
    icon: Package,
    title: "Product Catalog",
    description:
      "Browse catalog products, define base and cost pricing, target margins, and category structures.",
    cta: "Manage",
    footer: "One-Time & Subscription offerings",
  },
  {
    href: "/fulfillment",
    icon: Truck,
    title: "Warehouse & Fulfillment",
    description:
      "Monitor multi-warehouse inventory levels, fulfillment split allocations, and manage backorders.",
    cta: "View Split Engine",
    footer: "Greedy multi-warehouse allocation with manual override",
  },
];

export default function ManagerDashboardPage() {
  return (
    <RoleSidebar role="SALES_MANAGER">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Management Console</h1>
              <p className={styles.subtitle}>Sales Manager Workspace — discount governance, quote approval queues, and catalog oversight.</p>
            </div>
          </header>

          <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className={styles.navLink}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${styles.card}`} style={{ background: "rgba(109, 40, 217, 0.2)", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                      <Icon className="h-6 w-6" style={{ color: "#c4b5fd" }} />
                    </div>
                    <span className={styles.actionLink}>
                      {tile.cta} <ArrowRight className="h-3.5 w-3.5 inline" />
                    </span>
                  </div>
                  <h2 className={styles.navTitle}>{tile.title}</h2>
                  <p className={styles.navDescription}>{tile.description}</p>
                  <div className="mt-4 pt-4 border-t border-[rgba(139,92,246,0.15)] text-xs" style={{ color: "#64748b" }}>
                    {tile.footer}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}