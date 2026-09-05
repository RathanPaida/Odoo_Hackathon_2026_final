"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import styles from "./reset.module.css";

const STEPS = [
  { num: "1", label: "Request a reset code", state: "done" },
  { num: "2", label: "Verify and set new password", state: "active" },
  { num: "3", label: "Sign in with new password", state: "next" },
];

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Reset failed.");
        return;
      }
      setSuccess("Password reset successful! Redirecting to sign in…");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
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
            Almost there — verify and choose a new password.
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
          Code expires in 15 minutes. Request a new one if needed.
        </p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formInner}>
          <div className={styles.iconLarge} aria-hidden="true">
            <ShieldCheck size={24} strokeWidth={1.75} />
          </div>
          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.sub}>
            Enter the 6-digit code sent to{" "}
            <span className={styles.emailHighlight}>{email}</span> and choose a
            new password.
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
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                className={styles.codeInput}
                placeholder="------"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                New password
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.icon} aria-hidden="true">
                  <Lock size={17} strokeWidth={1.75} />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>
              <span className={styles.hint}>At least 8 characters</span>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm" className={styles.label}>
                Confirm password
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.icon} aria-hidden="true">
                  <Lock size={17} strokeWidth={1.75} />
                </span>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {success && (
              <p className={styles.success} role="status">
                <CheckCircle2 size={16} strokeWidth={2} />
                {success}
              </p>
            )}

            {error && (
              <p className={styles.error} role="alert">
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className={styles.submit}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Resetting password
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <p className={styles.alt}>
            Didn't receive a code?{" "}
            <a href="/forgot-password" className={styles.link}>
              Request again
            </a>
            {" · "}
            <a href="/login" className={styles.link}>
              Back to sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          <p>Loading reset form</p>
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
