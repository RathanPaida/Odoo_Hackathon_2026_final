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
  Layers,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Home,
  CreditCard,
  FolderTree,
  Sparkles
} from "lucide-react";
import s from "./RoleSidebar.module.css";

export type Role = "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "CUSTOMER";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users & Roles", icon: Users },
  { href: "/dashboard/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/catalog", label: "Catalog", icon: Package },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

const repNav: NavItem[] = [
  { href: "/dashboard/rep", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText },
  { href: "/dashboard/rep/customers", label: "Customers", icon: Users },
  { href: "/catalog", label: "Catalog", icon: Package },
  { href: "/dashboard/rep/customers/new", label: "New Customer", icon: UserCog },
];

const managerNav: NavItem[] = [
  { href: "/dashboard/manager", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rep/quotes", label: "Quotations", icon: FileText },
  { href: "/dashboard/rep/customers", label: "Customers", icon: Users },
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

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: adminNav,
  SALES_REP: repNav,
  SALES_MANAGER: managerNav,
  FINANCE: financeNav,
  CUSTOMER: customerNav,
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  SALES_REP: "Sales Rep",
  SALES_MANAGER: "Sales Manager",
  FINANCE: "Finance Specialist",
  CUSTOMER: "Customer Portal",
};

interface RoleSidebarProps {
  role?: Role | string;
  userName?: string;
  userEmail?: string;
  children?: React.ReactNode;
}

export function RoleSidebar({
  role = "ADMIN",
  userName = "Admin User",
  userEmail = "admin@dealflow.com",
  children
}: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: Role } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const userData = data.success ? data.data : data.user;
          if (userData?.id) {
            setCurrentUser({
              name: userData.name,
              email: userData.email,
              role: userData.role as Role,
            });
          }
        }
      } catch {
        // Fallback to props
      }
    }
    loadUser();
  }, []);

  const activeRole = currentUser?.role || role;
  const activeName = currentUser?.name || userName;
  const activeEmail = currentUser?.email || userEmail;

  const normalizedRole = (
    activeRole && NAV_BY_ROLE[activeRole as Role] ? activeRole : "ADMIN"
  ) as Role;

  const navItems = NAV_BY_ROLE[normalizedRole] || adminNav;
  const roleLabel = ROLE_LABEL[normalizedRole] || "Administrator";

  const roleClass =
    normalizedRole === "ADMIN" ? s.roleAdmin :
    normalizedRole === "SALES_REP" ? s.roleRep :
    normalizedRole === "SALES_MANAGER" ? s.roleManager :
    normalizedRole === "FINANCE" ? s.roleFinance :
    s.roleCustomer;

  const userInitials = activeName
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
    if (pathname === href) return true;
    if (href !== "/dashboard" && href !== "/dashboard/admin" && href !== "/dashboard/rep" && href !== "/dashboard/manager" && href !== "/dashboard/finance" && href !== "/dashboard/customer") {
      return pathname.startsWith(href);
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed
    }
    router.push("/login");
  };

  const sidebarNode = (
    <aside className={`${s.sidebar} ${mobileOpen ? s.sidebarOpen : ""}`}>
      {/* Brand */}
      <Link href={navItems[0]?.href || "/dashboard"} className={s.brand} onClick={() => setMobileOpen(false)}>
        <div className={s.brandLogo}>
          <Layers size={18} />
        </div>
        <div className={s.brandInfo}>
          <span className={s.brandTitle}>DealFlow360</span>
          <span className={s.brandSubtitle}>Workspace</span>
        </div>
      </Link>

      {/* Role Pill */}
      <div className={s.rolePillContainer}>
        <div className={`${s.rolePill} ${roleClass}`}>
          <span>{roleLabel}</span>
          <span className={s.roleDot} />
        </div>
      </div>

      {/* Navigation Links */}
      <div className={s.navSection}>
        <div className={s.navLabel}>Main Navigation</div>
        <ul className={s.navItems}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${s.navLink} ${active ? s.navLinkActive : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {active && <span className={s.activeIndicator} />}
                  <div className={s.navIconWrap}>
                    <Icon size={16} />
                  </div>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Section at bottom */}
      <div className={s.userSection} ref={userMenuRef}>
        <button
          type="button"
          className={s.userCard}
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          aria-expanded={userMenuOpen}
          aria-label="User profile settings"
        >
          <div className={s.userAvatar}>{userInitials}</div>
          <div className={s.userDetails}>
            <span className={s.userName}>{activeName}</span>
            <span className={s.userEmail}>{activeEmail}</span>
          </div>
          <ChevronDown
            size={15}
            className={`${s.userMenuChevron} ${userMenuOpen ? s.userMenuChevronOpen : ""}`}
          />
        </button>

        {/* Custom Dropdown Menu */}
        {userMenuOpen && (
          <div className={s.userDropdownMenu}>
            <div className={s.dropdownHeader}>
              <div className={s.dropdownHeaderName}>{activeName}</div>
              <div className={s.dropdownHeaderRole}>{roleLabel}</div>
            </div>

            <Link
              href="/dashboard/profile"
              className={s.dropdownItem}
              onClick={() => {
                setUserMenuOpen(false);
                setMobileOpen(false);
              }}
            >
              <User size={15} className={s.dropdownIcon} />
              <span>My Profile</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className={s.dropdownItem}
              onClick={() => {
                setUserMenuOpen(false);
                setMobileOpen(false);
              }}
            >
              <Settings size={15} className={s.dropdownIcon} />
              <span>Settings</span>
            </Link>

            <button
              type="button"
              className={`${s.dropdownItem} ${s.dropdownItemDanger}`}
              onClick={handleLogout}
            >
              <LogOut size={15} className={s.dropdownIcon} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={s.sidebarWrapper}>
      {/* Mobile Top Bar */}
      <div className={s.mobileTopBar}>
        <Link href={navItems[0]?.href || "/dashboard"} className={s.brand} style={{ padding: 0, border: "none" }}>
          <div className={s.brandLogo} style={{ width: "2rem", height: "2rem" }}>
            <Layers size={14} />
          </div>
          <span className={s.brandTitle} style={{ fontSize: "0.95rem" }}>DealFlow360</span>
        </Link>
        <button
          className={s.mobileToggleBtn}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation drawer"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className={s.mobileBackdrop}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {sidebarNode}

      <div className={s.mainLayout}>
        {children}
      </div>
    </div>
  );
}

export default RoleSidebar;
