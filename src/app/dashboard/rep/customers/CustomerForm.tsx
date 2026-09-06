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
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Company Name</label>
          <input
            type="text"
            name="companyName"
            defaultValue={initialData?.companyName}
            required
            placeholder="e.g. Acme Corporation"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Contact Name</label>
          <input
            type="text"
            name="contactName"
            defaultValue={initialData?.contactName}
            required
            placeholder="e.g. Jane Doe"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Email Address</label>
          <input
            type="email"
            name="email"
            defaultValue={initialData?.email}
            required
            placeholder="contact@example.com"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Phone (Optional)</label>
          <input
            type="tel"
            name="phone"
            defaultValue={initialData?.phone || ""}
            placeholder="+1 (555) 000-0000"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Customer Tier</label>
          <select
            name="tier"
            defaultValue={initialData?.tier || "BRONZE"}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="BRONZE" style={{ background: "#111111", color: "#ffffff" }}>Bronze (Standard Tier)</option>
            <option value="SILVER" style={{ background: "#111111", color: "#ffffff" }}>Silver (Preferred)</option>
            <option value="GOLD" style={{ background: "#111111", color: "#ffffff" }}>Gold (High Volume)</option>
            <option value="PLATINUM" style={{ background: "#111111", color: "#ffffff" }}>Platinum (Enterprise)</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>Currency</label>
          <select
            name="currency"
            defaultValue={initialData?.currency || "INR"}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.75rem",
              color: "#ffffff",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="INR" style={{ background: "#111111", color: "#ffffff" }}>INR (₹)</option>
            <option value="USD" style={{ background: "#111111", color: "#ffffff" }}>USD ($)</option>
            <option value="EUR" style={{ background: "#111111", color: "#ffffff" }}>EUR (€)</option>
          </select>
        </div>

        {isEdit && (
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.625rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              name="active"
              id="active"
              defaultChecked={initialData?.active !== false}
              style={{ width: "1.125rem", height: "1.125rem", accentColor: "#ffffff", cursor: "pointer" }}
            />
            <label htmlFor="active" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#ffffff", cursor: "pointer" }}>
              Active Customer Account
            </label>
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.75rem",
        paddingTop: "1.25rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        marginTop: "0.5rem",
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "0.625rem 1.25rem",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "0.625rem",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.625rem 1.25rem",
            background: "#ffffff",
            border: "none",
            borderRadius: "0.75rem",
            color: "#000000",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px 0 rgba(255, 255, 255, 0.22)",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {loading ? "Saving..." : isEdit ? "Update Customer" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
