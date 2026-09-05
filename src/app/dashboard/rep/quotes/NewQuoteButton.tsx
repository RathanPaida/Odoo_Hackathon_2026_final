"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuoteButton({ customerId }: { customerId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    // If no customerId provided directly, we'll prompt for one using window.prompt for now
    // In a real app, you'd open a modal with a customer selector
    const idToUse = customerId || window.prompt("Enter Customer ID to create a quote for:");
    if (!idToUse) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: idToUse }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create quote");
      }

      router.push(`/dashboard/rep/quotes/${body.data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      alert(err.message); // Simple error display
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="bg-[var(--ink)] text-[var(--paper)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Creating..." : "+ New Quote"}
    </button>
  );
}
