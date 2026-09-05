"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

interface AppHeaderProps {
  user: {
    name: string;
    email: string;
    role: "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "ADMIN" | "CUSTOMER" | string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  SALES_REP: "Sales Rep",
  SALES_MANAGER: "Sales Manager",
  FINANCE: "Finance",
  ADMIN: "Admin",
  CUSTOMER: "Customer",
};

const ROLE_BADGES: Record<string, string> = {
  SALES_REP: "badge-role-rep",
  SALES_MANAGER: "badge-role-manager",
  FINANCE: "badge-role-finance",
  ADMIN: "badge-role-admin",
  CUSTOMER: "badge-role-customer",
};

export default function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed with redirect regardless
    }
    router.push("/login");
    router.refresh();
  }

  // Determine navigation items by role
  const getNavLinks = () => {
    switch (user.role) {
      case "SALES_REP":
        return [
          { label: "Dashboard", href: "/dashboard/rep" },
          { label: "Quotations", href: "/dashboard/rep/quotes" },
          { label: "Customers", href: "/dashboard/rep/customers" },
        ];
      case "SALES_MANAGER":
        return [
          { label: "Dashboard", href: "/dashboard/manager" },
          { label: "Approval Queue", href: "/dashboard/rep/quotes?status=PENDING_APPROVAL" },
          { label: "Quotations", href: "/dashboard/rep/quotes" },
          { label: "Customers", href: "/dashboard/rep/customers" },
        ];
      case "FINANCE":
        return [
          { label: "Dashboard", href: "/dashboard/finance" },
          { label: "Quotations", href: "/dashboard/rep/quotes" },
          { label: "Fulfillment", href: "/dashboard/finance" },
        ];
      case "ADMIN":
        return [
          { label: "Dashboard", href: "/dashboard/admin" },
          { label: "Users & Roles", href: "/dashboard/admin/users" },
          { label: "Quotations", href: "/dashboard/rep/quotes" },
          { label: "Customers", href: "/dashboard/rep/customers" },
        ];
      case "CUSTOMER":
        return [
          { label: "Dashboard", href: "/dashboard/customer" },
        ];
      default:
        return [{ label: "Dashboard", href: "/dashboard" }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-[#0e1319] text-white border-b border-white/10 shadow-sm">
      <div className="flex items-center gap-8">
        {/* Brand */}
        <Link href={`/dashboard`} className="flex items-center gap-3 no-underline group">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-[#1f3bd8] text-white font-bold text-xs tracking-tight font-heading group-hover:scale-105 transition-transform">
            DF
          </span>
          <span className="font-heading font-semibold text-base tracking-tight text-white">
            DealFlow360
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/dashboard/rep/quotes?status=PENDING_APPROVAL"
                ? pathname.includes("quotes") && pathname.includes("status=PENDING_APPROVAL")
                : pathname === link.href || (link.href !== "/dashboard/rep" && link.href !== "/dashboard" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 text-white font-medium shadow-xs"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-xs font-medium text-white leading-tight">{user.name}</div>
            <div className="text-[11px] text-white/50">{user.email}</div>
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              ROLE_BADGES[user.role] ?? "bg-white/20 text-white"
            }`}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <LogOut size={13} strokeWidth={2} />
          )}
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
