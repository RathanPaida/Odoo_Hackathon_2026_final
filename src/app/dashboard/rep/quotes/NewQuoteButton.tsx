"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";

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
      toast.error("Couldn’t create quote", err.message);
      setLoading(false);
    }
  };

  return (
    <Button variant="primary" onClick={handleCreate} loading={loading}>
      New quote
    </Button>
  );
}