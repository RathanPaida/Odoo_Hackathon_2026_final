"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Info, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import styles from "./forgot.module.css";

const TIPS = [
  "Check your spam or junk folder",
  "Make sure you're using the email tied to your workspace",
  "Codes expire after 15 minutes",
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong.");
        return;
      }
      setSuccess("A verification code has been sent to your email.");
      // Redirect to reset page after a short delay
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1500);
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
            Locked out? We'll get you back in quickly.
          </p>
          <ul className={styles.tips}>
            {TIPS.map((tip) => (
              <li key={tip} className={styles.tip}>
                <Info size={16} strokeWidth={1.75} className={styles.tipIcon} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.panelFoot}>
          Still stuck? Contact your workspace admin for help.
        </p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formInner}>
          <div className={styles.iconLarge} aria-hidden="true">
            <KeyRound size={24} strokeWidth={1.75} />
          </div>
          <h1 className={styles.title}>Reset your password</h1>
          <p className={styles.sub}>
            Enter your email and we'll send you a verification code to set a new
            password.
          </p>

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

            <button type="submit" disabled={loading} className={styles.submit}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Sending code
                </>
              ) : (
                "Send verification code"
              )}
            </button>
          </form>

          <p className={styles.alt}>
            Remember your password?{" "}
            <a href="/login" className={styles.link}>
              Sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
