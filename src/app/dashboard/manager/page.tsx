"use client";

import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, CardTitle } from "@/components/ui";
import Link from "next/link";
import { CheckSquare, ShieldCheck, Package, Truck, ArrowRight } from "lucide-react";

const tiles = [
  {
    href: "/approvals",
    icon: CheckSquare,
    accent: "primary" as const,
    title: "Approval Queue",
    description:
      "Review and decide on quotations flagged by the blended risk engine with line-by-line discount breakdown.",
    cta: "Open Queue",
    footer: "Multi-level governance with append-only audit trail",
  },
  {
    href: "/governance",
    icon: ShieldCheck,
    accent: "negotiating" as const,
    title: "Discount Governance",
    description:
      "Maintain customer-tier ceilings, category discount limits, and test live calculations in the simulator.",
    cta: "Configure",
    footer: "Gold / Silver / Bronze tiers and category caps",
  },
  {
    href: "/catalog",
    icon: Package,
    accent: "info" as const,
    title: "Product Catalog",
    description:
      "Browse catalog products, define base and cost pricing, target margins, and category structures.",
    cta: "Manage",
    footer: "One-Time & Subscription offerings",
  },
  {
    href: "/fulfillment",
    icon: Truck,
    accent: "approved" as const,
    title: "Warehouse & Fulfillment",
    description:
      "Monitor multi-warehouse inventory levels, fulfillment split allocations, and manage backorders.",
    cta: "View Split Engine",
    footer: "Greedy multi-warehouse allocation with manual override",
  },
];

const accentBg: Record<typeof tiles[number]["accent"], string> = {
  primary: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
  negotiating: "bg-[var(--status-negotiating-bg)] text-[var(--status-negotiating-fg)] border-[var(--status-negotiating-bd)]/40",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info-fg)] border-[var(--status-info-bd)]/40",
  approved: "bg-[var(--status-approved-bg)] text-[var(--status-approved-fg)] border-[var(--status-approved-bd)]/40",
};

export default function ManagerDashboardPage() {
  return (
    <main className="surface-page min-h-screen flex flex-col">
      <NavigationHeader />

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <header className="mb-8">
          <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
            Management Console
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] mt-1">
            Welcome back, Sales Manager
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Sales Manager Workspace — discount governance, quote approval queues, and catalog oversight.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group"
              >
                <Card tone="paper" className="p-6 h-full flex flex-col justify-between hover:border-[var(--primary)]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl border ${accentBg[tile.accent]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        {tile.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <CardTitle className="text-xl mb-1">{tile.title}</CardTitle>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      {tile.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--paper-border)] text-xs text-[var(--muted-foreground)]">
                    {tile.footer}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}