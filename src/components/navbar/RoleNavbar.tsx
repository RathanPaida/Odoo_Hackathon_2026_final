"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  ShieldCheck,
  CheckSquare,
  Truck,
  Receipt,
  BarChart3,
  UserCog,
  Package,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  CreditCard,
  Menu,
  X,
  Home,
  Layers,
  Building2,
  FileBarChart
} from "lucide-react";
import s from "./RoleNavbar.module.css";

export type Role = "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "CUSTOMER";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/categories", label: "Categories", icon: Layers },
  { href: "/catalog", label: "Catalog", icon: Package },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

const repNav: NavItem[] = [
  { href: "/dashboard/rep", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText },
  { href: "/dashboard/rep/customer", label: "Customers", icon: Users },
  { href: "/catalog", label: "Catalog", icon: Package },
  { href: "/dashboard/rep/customer/new", label: "New Customer", icon: UserCog },
];

const managerNav: NavItem[] = [
  { href: "/dashboard/manager", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText },
  { href: "/dashboard/rep/customer", label: "Customers", icon: Users },
  { href: "/approvals", label: "Approval Queue", icon: CheckSquare },
  { href: "/governance", label: "Governance", icon: ShieldCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/catalog", label: "Catalog", icon: Package },
];

const financeNav: NavItem[] = [
  { href: "/dashboard/finance", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/fulfillment", label: "Fulfillment", icon: Truck },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt },
  { href: "/governance", label: "Governance", icon: ShieldCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

const customerNav: NavItem[] = [
  { href: "/dashboard/customer", label: "My Portal", icon: Home },
  { href: "/dashboard/customer/quotations", label: "Quotations", icon: FileText },
  { href: "/dashboard/customer/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/customer/support", label: "Support", icon: ShieldCheck },
];

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: adminNav,
  SALES_REP: repNav,
  SALES_MANAGER: managerNav,
  FINANCE: financeNav,
  CUSTOMER: customerNav,
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  SALES_REP: "Sales Rep",
  SALES_MANAGER: "Sales Manager",
  FINANCE: "Finance",
  CUSTOMER: "Customer",
};

interface RoleNavbarProps {
  role: Role;
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
}

export function RoleNavbar({ role, userName = "User", userEmail = "user@dealflow.com", notificationCount = 0 }: RoleNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = NAV_BY_ROLE[role] || [];
  const roleLabel = ROLE_LABEL[role];

  const roleBadgeClass = 
    role === "ADMIN" ? s.roleBadgeAdmin :
    role === "SALES_REP" ? s.roleBadgeRep :
    role === "SALES_MANAGER" ? s.roleBadgeManager :
    role === "FINANCE" ? s.roleBadgeFinance :
    s.roleBadgeCustomer;

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className={s.navbar}>
      <div className={s.container}>
        <Link href={navItems[0]?.href || "/dashboard"} className={s.brand}>
          <div className={s.brandLogo}>
            <Layers size={18} />
          </div>
          <div className={s.brandText}>
            <span className={s.brandName}>DealFlow360</span>
            <span className={s.brandTagline}>Sales Intelligence</span>
          </div>
          <span className={`${s.roleBadge} ${roleBadgeClass}`}>{roleLabel}</span>
        </Link>

        <nav className={s.navLinks}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.navLink} ${active ? s.navLinkActive : ""}`}
              >
                <span className={s.navLinkIcon}>
                  <Icon size={15} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={s.rightActions}>
          <button className={s.iconBtn} aria-label="Notifications">
            <Bell size={16} />
            {notificationCount > 0 && <span className={s.notificationDot} />}
          </button>

          <div className={s.userMenu} ref={userMenuRef}>
            <button
              className={s.userMenuTrigger}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
            >
              <div className={s.userAvatar}>{userInitials}</div>
              <div className={s.userInfo}>
                <span className={s.userName}>{userName}</span>
                <span className={s.userRole}>{roleLabel}</span>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: "#a78bfa",
                  transition: "transform 0.2s ease",
                  transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)"
                }}
              />
            </button>

            {userMenuOpen && (
              <div className={s.userMenuPanel}>
                <div className={s.userMenuHeader}>
                  <div className={s.userMenuHeaderName}>{userName}</div>
                  <div className={s.userMenuHeaderEmail}>{userEmail}</div>
                </div>

                <Link href="/dashboard/profile" className={s.userMenuItem} onClick={() => setUserMenuOpen(false)}>
                  <User size={16} className={s.userMenuItemIcon} />
                  My Profile
                </Link>

                <Link href="/dashboard/settings" className={s.userMenuItem} onClick={() => setUserMenuOpen(false)}>
                  <Settings size={16} className={s.userMenuItemIcon} />
                  Settings
                </Link>

                <div className={s.userMenuDivider} />

                <button className={`${s.userMenuItem} ${s.userMenuDanger}`} onClick={handleLogout}>
                  <LogOut size={16} className={s.userMenuItemIcon} />
                  Sign out
                </button>
              </div>
            )}
          </div>

          <button
            className={s.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={s.mobileMenuPanel}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.mobileNavLink} ${active ? s.mobileNavLinkActive : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
