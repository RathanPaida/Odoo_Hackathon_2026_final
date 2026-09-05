// src/app/dashboard/rep/quotes/NewQuoteButton.tsx  - 
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import styles from "./quotes.module.css";

export default function NewQuoteButton({ customerId }: { customerId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    const idToUse =
      customerId ||
      window.prompt("Enter Customer ID to create a quote for:");
    if (!idToUse) return;

    setLoading(true);

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
      toast.error("Couldn't create quote", err.message);
      setLoading(false);
    }
  };

  return (
    <button
      className={styles.newQuoteBtn}
      onClick={handleCreate}
      disabled={loading}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
      New Quote
    </button>
  );
}