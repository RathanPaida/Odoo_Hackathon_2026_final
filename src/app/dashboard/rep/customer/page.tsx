"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronRight,
  Building2,
  Mail,
  Phone
} from "lucide-react";
import s from "./customer.module.css";

export default function RepCustomerPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const customers = [
    {
      id: "cust-001",
      name: "Acme Corporation",
      email: "contact@acme.com",
      phone: "+1 (555) 123-4567",
      tier: "GOLD",
      status: "ACTIVE",
      quotesCount: 12,
      totalValue: "$145,200"
    },
    {
      id: "cust-002",
      name: "TechStart Inc",
      email: "info@techstart.io",
      phone: "+1 (555) 234-5678",
      tier: "SILVER",
      status: "ACTIVE",
      quotesCount: 8,
      totalValue: "$67,500"
    },
    {
      id: "cust-003",
      name: "Global Solutions Ltd",
      email: "sales@globalsolutions.com",
      phone: "+1 (555) 345-6789",
      tier: "PLATINUM",
      status: "ACTIVE",
      quotesCount: 24,
      totalValue: "$312,800"
    },
    {
      id: "cust-004",
      name: "Nexus Dynamics",
      email: "nexus@dynamics.co",
      phone: "+1 (555) 456-7890",
      tier: "GOLD",
      status: "ACTIVE",
      quotesCount: 6,
      totalValue: "$89,400"
    },
    {
      id: "cust-005",
      name: "Quantum Industries",
      email: "contact@quantum.ind",
      phone: "+1 (555) 567-8901",
      tier: "BRONZE",
      status: "INACTIVE",
      quotesCount: 2,
      totalValue: "$12,300"
    },
    {
      id: "cust-006",
      name: "Stellar Systems",
      email: "hello@stellarsystems.io",
      phone: "+1 (555) 678-9012",
      tier: "SILVER",
      status: "ACTIVE",
      quotesCount: 15,
      totalValue: "$178,600"
    }
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <main className={s.page}>
      <div className={s.container}>
        <div className={`${s.header} ${s.animateFadeIn}`}>
          <div className={s.headerContent}>
            <div className={s.headerIcon}>
              <Users size={14} />
              Customer Management
            </div>
            <h1 className={s.title}>Your Customers</h1>
            <p className={s.subtitle}>
              Manage your customer portfolio, view their quotations, and track account activity.
            </p>
          </div>
          <div className={s.headerActions}>
            <Link href="/dashboard/rep/customer/new" className={s.primaryBtn}>
              <UserPlus size={16} />
              Add New Customer
            </Link>
          </div>
        </div>

        <div className={`${s.statsGrid} ${s.animateFadeIn}`} style={{animationDelay: '0.05s'}}>
          <div className={s.statCard}>
            <div className={s.statLabel}>Total Customers</div>
            <div className={s.statValue}>47</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Active Quotes</div>
            <div className={s.statValue} style={{color: '#c4b5fd'}}>23</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Pipeline Value</div>
            <div className={s.statValue} style={{color: '#34d399'}}>$892K</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>New This Month</div>
            <div className={s.statValue}>5</div>
          </div>
        </div>

        <div className={`${s.card} ${s.animateFadeIn}`} style={{animationDelay: '0.1s'}}>
          <div className={s.searchBar}>
            <div className={s.searchWrapper}>
              <Search size={16} className={s.searchIcon} />
              <input
                type="text"
                placeholder="Search customers by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={s.searchInput}
              />
            </div>
          </div>

          <div className={s.tableCard}>
            <div className={s.tableWrapper}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Quotes</th>
                    <th>Total Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className={s.customerInfo}>
                          <div className={s.customerAvatar}>
                            {getInitials(customer.name)}
                          </div>
                          <div className={s.customerDetails}>
                            <span className={s.customerName}>{customer.name}</span>
                            <span className={s.customerEmail}>{customer.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${s.tierBadge} ${s[`tier${customer.tier.charAt(0) + customer.tier.slice(1).toLowerCase()}`]}`}>
                          {customer.tier}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.statusBadge} ${customer.status === "ACTIVE" ? s.badgeActive : s.badgeInactive}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className={s.cellMuted}>{customer.quotesCount}</td>
                      <td className={s.cellPrimary}>{customer.totalValue}</td>
                      <td>
                        <a href={`/dashboard/rep/customer/${customer.id}`} className={s.actionLink}>
                          View <ChevronRight size={14} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredCustomers.length === 0 && (
            <div className={s.emptyState}>
              <div className={s.emptyStateIcon}>
                <Building2 size={24} />
              </div>
              <p className={s.emptyStateText}>No customers found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
