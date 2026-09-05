"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ShieldCheck,
  CheckSquare,
  Truck,
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  Receipt,
  BarChart3,
  UserCog,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const baseNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep", label: "Rep dashboard", icon: LayoutDashboard, roles: ["SALES_REP"] },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText, roles: ["SALES_REP", "SALES_MANAGER", "ADMIN"] },
  { href: "/dashboard/rep/customers", label: "Customers", icon: Users, roles: ["SALES_REP", "SALES_MANAGER", "ADMIN"] },
  { href: "/dashboard/manager", label: "Manager dashboard", icon: LayoutDashboard, roles: ["SALES_MANAGER"] },
  { href: "/dashboard/finance", label: "Finance dashboard", icon: LayoutDashboard, roles: ["FINANCE"] },
  { href: "/catalog", label: "Catalog", icon: Package, roles: ["SALES_REP", "SALES_MANAGER", "FINANCE", "ADMIN"] },
  { href: "/governance", label: "Discount governance", icon: ShieldCheck, roles: ["SALES_MANAGER", "FINANCE", "ADMIN"] },
  { href: "/approvals", label: "Approval queue", icon: CheckSquare, roles: ["SALES_MANAGER", "FINANCE", "ADMIN"] },
  { href: "/fulfillment", label: "Fulfillment", icon: Truck, roles: ["FINANCE", "ADMIN"] },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt, roles: ["FINANCE", "ADMIN"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["SALES_MANAGER", "FINANCE", "ADMIN"] },
  { href: "/dashboard/admin", label: "Admin", icon: UserCog, roles: ["ADMIN"] },
];

export function NavigationHeader({ role }: { role?: string }) {
  const pathname = usePathname();

  const visibleItems = baseNav.filter((item) => {
    if (!item.roles) return true;
    if (!role) return true;
    return item.roles.includes(role);
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] shadow-sm shadow-black/30">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              DealFlow<span className="text-[var(--primary-hover)]">360</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--primary)]/15 text-[var(--primary-hover)] border border-[var(--primary)]/30"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[var(--primary-hover)]" : "text-[var(--muted-foreground)]"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
