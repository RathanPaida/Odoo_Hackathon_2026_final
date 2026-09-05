"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerTier } from "@/generated/prisma";

type Customer = {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  tier: CustomerTier;
  currency: string;
  active: boolean;
};

export default function CustomerForm({ initialData }: { initialData?: Customer }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!initialData?.id;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get("companyName"),
      contactName: formData.get("contactName"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      tier: formData.get("tier"),
      currency: formData.get("currency"),
      active: formData.get("active") === "on",
    };

    const url = isEdit ? `/api/customers/${initialData.id}` : "/api/customers";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Something went wrong.");
      }

      router.push("/dashboard/rep/customers");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Company Name</label>
          <input
            type="text"
            name="companyName"
            defaultValue={initialData?.companyName}
            required
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Contact Name</label>
          <input
            type="text"
            name="contactName"
            defaultValue={initialData?.contactName}
            required
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={initialData?.email}
            required
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Phone</label>
          <input
            type="tel"
            name="phone"
            defaultValue={initialData?.phone || ""}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Customer Tier</label>
          <select
            name="tier"
            defaultValue={initialData?.tier || "BRONZE"}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          >
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink)]">Currency</label>
          <select
            name="currency"
            defaultValue={initialData?.currency || "INR"}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {isEdit && (
          <div className="space-y-2 md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              id="active"
              defaultChecked={initialData?.active !== false}
              className="rounded border-[var(--border)] text-[var(--ink)] focus:ring-[var(--ink)]"
            />
            <label htmlFor="active" className="text-sm font-medium text-[var(--ink)]">
              Active Customer
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-md text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--ink)] text-[var(--paper)] px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving..." : isEdit ? "Update Customer" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
