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
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Company Name</label>
          <input
            type="text"
            name="companyName"
            defaultValue={initialData?.companyName}
            required
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Contact Name</label>
          <input
            type="text"
            name="contactName"
            defaultValue={initialData?.contactName}
            required
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Email Address</label>
          <input
            type="email"
            name="email"
            defaultValue={initialData?.email}
            required
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Phone (Optional)</label>
          <input
            type="tel"
            name="phone"
            defaultValue={initialData?.phone || ""}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Customer Tier</label>
          <select
            name="tier"
            defaultValue={initialData?.tier || "BRONZE"}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="BRONZE" style={{ background: "#1e1b4b" }}>Bronze</option>
            <option value="SILVER" style={{ background: "#1e1b4b" }}>Silver</option>
            <option value="GOLD" style={{ background: "#1e1b4b" }}>Gold</option>
            <option value="PLATINUM" style={{ background: "#1e1b4b" }}>Platinum</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#c4b5fd", marginBottom: "0.5rem" }}>Currency</label>
          <select
            name="currency"
            defaultValue={initialData?.currency || "INR"}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 15, 35, 0.8)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              borderRadius: "0.75rem",
              color: "#f1f5f9",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="INR" style={{ background: "#1e1b4b" }}>INR</option>
            <option value="USD" style={{ background: "#1e1b4b" }}>USD</option>
            <option value="EUR" style={{ background: "#1e1b4b" }}>EUR</option>
          </select>
        </div>

        {isEdit && (
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              name="active"
              id="active"
              defaultChecked={initialData?.active !== false}
              style={{ width: "1rem", height: "1rem", accentColor: "#7c3aed", cursor: "pointer" }}
            />
            <label htmlFor="active" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#e2e8f0", cursor: "pointer" }}>
              Active Customer
            </label>
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.75rem",
        paddingTop: "1.25rem",
        borderTop: "1px solid rgba(139, 92, 246, 0.15)",
        marginTop: "0.5rem",
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "0.625rem 1.25rem",
            background: "rgba(109, 40, 217, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderRadius: "0.625rem",
            color: "#c4b5fd",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.625rem 1.25rem",
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            border: "none",
            borderRadius: "0.75rem",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px 0 rgba(109, 40, 217, 0.4)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving..." : isEdit ? "Update Customer" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
