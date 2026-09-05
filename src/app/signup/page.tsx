"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Signup failed.");
        return;
      }
      
      if (data.requiresVerification) {
        router.push(`/verify?email=${encodeURIComponent(form.email)}`);
        return;
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!login.ok) {
        router.push("/login");
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
        <h1 className="text-2xl font-semibold mb-1">Create account</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">Join DealFlow360</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">At least 8 characters.</p>
          </div>

          {error && (
            <div className="rounded-md border border-[var(--destructive)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Have an account?{" "}
          <a href="/login" className="text-[var(--primary)] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
