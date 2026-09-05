"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import styles from "./signup.module.css";

const FEATURES = [
  { bold: "Pipeline tracking", text: "from first contact to close" },
  { bold: "Smart approvals", text: "with discount governance" },
  { bold: "Warehouse allocation", text: "across multiple locations" },
  { bold: "Customer portal", text: "for transparent negotiations" },
];

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
            Your entire deal pipeline, managed end to end.
          </p>
          <ul className={styles.checklist}>
            {FEATURES.map((f) => (
              <li key={f.bold} className={styles.checkItem}>
                <CheckCircle2 size={18} strokeWidth={1.75} className={styles.checkIcon} />
                <span>
                  <strong>{f.bold}</strong> — {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.panelFoot}>
          By creating an account you agree to our Terms of Service.
        </p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formInner}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.sub}>Get started with DealFlow360 in seconds.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Full name
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.icon} aria-hidden="true">
                  <User size={17} strokeWidth={1.75} />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={styles.input}
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Work email
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
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
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
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>
              <span className={styles.hint}>At least 8 characters</span>
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
                  Creating account
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className={styles.alt}>
            Already have an account?{" "}
            <a href="/login" className={styles.link}>
              Sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
