"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import styles from "./verify.module.css";

const STEPS = [
  { num: "1", label: "Create your account", state: "done" },
  { num: "2", label: "Verify your email", state: "active" },
  { num: "3", label: "Start building deals", state: "next" },
];

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
            One last step before you're in.
          </p>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li
                key={step.num}
                className={styles.step}
                data-state={step.state}
              >
                <span className={styles.stepNum}>{step.num}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className={styles.panelFoot}>
          Didn't get the email? Check your spam folder or contact support.
        </p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formInner}>
          <div className={styles.iconLarge} aria-hidden="true">
            <ShieldCheck size={24} strokeWidth={1.75} />
          </div>
          <h1 className={styles.title}>Verify your email</h1>
          <p className={styles.sub}>
            We sent a 6-digit code to{" "}
            <span className={styles.emailHighlight}>{email}</span>.
            Enter it below to continue.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="code" className={styles.label}>
                Verification code
              </label>
              <input
                id="code"
                type="text"
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                className={styles.codeInput}
                placeholder="------"
              />
            </div>

            {error && (
              <p className={styles.error} role="alert">
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || code.length !== 6}
              className={styles.submit}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Verifying
                </>
              ) : (
                "Verify and continue"
              )}
            </button>
          </form>

          <p className={styles.alt}>
            Wrong email?{" "}
            <a href="/signup" className={styles.link}>
              Sign up again
            </a>
            {" · "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={styles.link}
            >
              Back to sign in
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          <p>Loading verification</p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
