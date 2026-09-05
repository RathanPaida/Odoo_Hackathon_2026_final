"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import styles from "./login.module.css";

const STAGES = [
  { name: "Sourced", note: "Inbound and outbound", state: "done" },
  { name: "Screened", note: "First call booked", state: "done" },
  { name: "Diligence", note: "Docs and references", state: "active" },
  { name: "Committed", note: "Term sheet signed", state: "next" },
];

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          router.push(`/verify?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(data?.error?.message ?? "Login failed.");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            DF
          </span>
          <span className={styles.wordmark}>DealFlow360</span>
        </div>

        <div>
          <p className={styles.pitch}>
            Every deal, from the first email to the signed term sheet.
          </p>
          <ol className={styles.ladder}>
            {STAGES.map((stage) => (
              <li
                key={stage.name}
                className={styles.stage}
                data-state={stage.state}
              >
                <span>{stage.name}</span>
                <span className={styles.stageNote}>{stage.note}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className={styles.panelFoot}>
          Trouble signing in? Ask your workspace admin to check your seat.
        </p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formInner}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.sub}>Use the email your workspace invited.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.icon} aria-hidden="true">
                  <Mail size={17} strokeWidth={1.75} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="you@firm.com"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.icon} aria-hidden="true">
                  <Lock size={17} strokeWidth={1.75} />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>
              <a href="/reset-password" className={styles.forgot}>
                Reset your password
              </a>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className={styles.submit}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Signing in
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className={styles.alt}>
            New to DealFlow360?{" "}
            <a href="/signup" className={styles.link}>
              Create an account
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          <p>Loading DealFlow360</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}