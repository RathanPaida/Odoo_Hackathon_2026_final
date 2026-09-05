// src/app/dashboard/rep/quotes/NewQuoteButton.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast, Modal, Button } from "@/components/ui";
import styles from "./quotes.module.css";

interface CustomerOption {
  id: string;
  companyName: string;
  contactName: string;
  tier: string;
}

export default function NewQuoteButton({ 
  customerId,
  initialCustomers 
}: { 
  customerId?: string;
  initialCustomers?: CustomerOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomers || []);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [search, setSearch] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (modalOpen && customers.length === 0) {
      fetch("/api/customers?limit=100&active=true")
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data?.customers) {
            setCustomers(
              res.data.customers.map((c: any) => ({
                id: c.id,
                companyName: c.companyName,
                contactName: c.contactName,
                tier: c.tier,
              }))
            );
          }
        })
        .catch(console.error);
    }
  }, [modalOpen, customers.length]);

  const handleCreateForCustomer = async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: targetId }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create quote");
      }

      setModalOpen(false);
      toast.success("Quote created", `Quote ${body.data.quoteNumber} created`);
      router.push(`/dashboard/rep/quotes/${body.data.id}`);
    } catch (err: any) {
      toast.error("Couldn't create quote", err.message);
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (customerId) {
      handleCreateForCustomer(customerId);
    } else {
      setModalOpen(true);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.tier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        className={styles.newQuoteBtn}
        onClick={handleButtonClick}
        disabled={loading}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
        New Quote
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Quotation"
        description="Select a customer to start building a new quotation"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Search Customer
            </label>
            <input
              type="text"
              placeholder="Search by company, contact, or tier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                {customers.length === 0 ? "Loading customers..." : "No customers found matching search."}
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCustomerId === c.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                      : "border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{c.companyName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.contactName}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)]">
                    {c.tier}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateForCustomer(selectedCustomerId)}
              loading={loading}
              disabled={!selectedCustomerId}
            >
              Create Quote
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}