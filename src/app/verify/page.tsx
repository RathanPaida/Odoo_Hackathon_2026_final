"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyForm() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Verification failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1">Verify Email</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Enter the 6-digit code sent to {email}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-1.5">Verification Code</label>
            <input
              id="code"
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)] tracking-widest text-center"
              placeholder="123456"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[var(--destructive)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
