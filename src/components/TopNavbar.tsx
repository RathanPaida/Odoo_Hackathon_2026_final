// src/components/TopNavbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role, NAV_BY_ROLE, ROLE_LABEL, NavItem as RoleSidebarNavItem } from "@/components/navbar/RoleSidebar";
import {
  LayoutDashboard,
  FileText,
  Users,
  CheckSquare,
  Truck,
  Receipt,
  BarChart3,
  Package,
  Home,
  CreditCard,
  ShieldCheck,
  Layers,
  UserCog,
  FolderTree,
  Sparkles,
} from "lucide-react";
import s from "./TopNavbar.module.css";

// Map icons for top navigation (reuse same icons as sidebar)
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  FileText,
  Users,
  CheckSquare,
  Truck,
  Receipt,
  BarChart3,
  Package,
  Home,
  CreditCard,
  ShieldCheck,
  Layers,
  UserCog,
  FolderTree,
  Sparkles,
};

interface TopNavbarProps {
  role?: Role | string;
}

export function TopNavbar({ role = "ADMIN" }: TopNavbarProps) {
  const pathname = usePathname();
  const normalizedRole = (role && NAV_BY_ROLE[role as Role]) ? (role as Role) : "ADMIN";
  const navItems: RoleSidebarNavItem[] = NAV_BY_ROLE[normalizedRole] ?? [];
  const roleLabel = ROLE_LABEL[normalizedRole] ?? "Administrator";

  const isActive = (href: string) => {
    if (pathname === href) return true;
    return pathname.startsWith(href);
  };

  return (
    <nav className={s.topNav} aria-label={`Top navigation for ${roleLabel}`}> 
      <ul className={s.navList}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className={s.navItem}>
              <Link href={item.href} className={active ? `${s.navLink} ${s.active}` : s.navLink}>
                <span className={s.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default TopNavbar;
