"use client";

import { useEffect, useState } from "react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Percent, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Key
} from "lucide-react";
import styles from "../dashboard.module.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
    approvalLimitPct?: string | number;
    createdAt?: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isDummy = (email?: string) => {
    if (!email) return true;
    const normalized = email.toLowerCase().trim();
    return (
      normalized.endsWith(".local") ||
      normalized.endsWith("@dealflow.local") ||
      normalized.endsWith("@dealflow.com") ||
      normalized.endsWith("@example.com") ||
      normalized.endsWith("@test.com") ||
      normalized.endsWith("@dummy.com") ||
      normalized.endsWith(".corp") ||
      normalized.endsWith(".sol") ||
      normalized.endsWith(".ent") ||
      normalized.endsWith(".ltd") ||
      normalized.endsWith(".inc")
    );
  };

  const userIsDummy = isDummy(profile?.email);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const userData = data.success ? data.data : data.user;
          if (userData?.id) {
            setProfile(userData);
            setName(userData.name || "");
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setOtpMessage(null);
    try {
      const res = await fetch("/api/auth/me/send-otp", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        setOtpMessage(data.message || "Verification code sent to your email.");
      } else {
        setOtpMessage(data.error?.message || "Failed to send verification code.");
      }
    } catch {
      setOtpMessage("Network error sending verification code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (newPassword && !currentPassword) {
      setMessage({ text: "Current password is required to set a new password.", type: "error" });
      return;
    }

    if (newPassword && !userIsDummy && (!otp || !otp.trim())) {
      setMessage({ text: "Please enter the 6-digit verification code (OTP) sent to your email.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload: any = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        if (!userIsDummy) {
          payload.otp = otp.trim();
        }
      }

      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Profile updated successfully!", type: "success" });
        const userData = data.success ? data.data : data.user;
        setProfile(userData);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtp("");
        setOtpSent(false);
        setOtpMessage(null);
      } else {
        setMessage({ text: data.error?.message || "Failed to update profile.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleSidebar role={profile?.role} userName={profile?.name} userEmail={profile?.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>User Profile</h1>
              <p className={styles.subtitle}>Manage your account information and authentication credentials</p>
            </div>
          </header>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm border ${
                message.type === "success"
                  ? "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]"
                  : "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ maxWidth: "72rem" }}>
            {/* Overview Card */}
            <div className={styles.card} style={{ padding: "2rem", height: "fit-content" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingBottom: "1.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div
                  style={{
                    width: "5rem",
                    height: "5rem",
                    borderRadius: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#000000",
                    background: "#ffffff",
                    boxShadow: "0 8px 24px rgba(255, 255, 255, 0.15)",
                    marginBottom: "1rem",
                  }}
                >
                  {profile?.name
                    ? profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "U"}
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.5rem 0" }}>{profile?.name || "Loading..."}</h2>
                <span style={{
                  fontSize: "0.75rem",
                  padding: "0.3rem 0.85rem",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}>
                  {profile?.role?.replace("_", " ") || "USER"}
                </span>
              </div>

              <div style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#cccccc" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#888888" }}>
                    <Mail size={16} color="#888888" /> Email
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: 500 }}>{profile?.email}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#cccccc" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#888888" }}>
                    <Shield size={16} color="#888888" /> Role
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: 500 }}>{profile?.role}</span>
                </div>

                {profile?.approvalLimitPct !== undefined && profile.role === "SALES_MANAGER" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#cccccc" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#888888" }}>
                      <Percent size={16} color="#888888" /> Approval Limit
                    </span>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{Number(profile.approvalLimitPct)}%</span>
                  </div>
                )}

                {profile?.createdAt && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#cccccc" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#888888" }}>
                      <Calendar size={16} color="#888888" /> Member Since
                    </span>
                    <span style={{ color: "#ffffff", fontWeight: 500 }}>
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <div className={`${styles.card} lg:col-span-2`} style={{ padding: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.75rem" }}>
                <User size={20} color="#ffffff" />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Account Settings
                </h2>
              </div>

              <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", marginBottom: "0.5rem" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      background: "#161616",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", marginBottom: "0.5rem" }}>
                    Email Address (Read-only)
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#888888",
                      fontSize: "0.875rem",
                      cursor: "not-allowed",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ paddingTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    <Key size={16} color="#ffffff" />
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                      Change Password (Optional)
                    </h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", marginBottom: "0.5rem" }}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.75rem",
                          background: "#161616",
                          border: "1px solid rgba(255, 255, 255, 0.18)",
                          color: "#ffffff",
                          fontSize: "0.875rem",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", marginBottom: "0.5rem" }}>
                          New Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            background: "#161616",
                            border: "1px solid rgba(255, 255, 255, 0.18)",
                            color: "#ffffff",
                            fontSize: "0.875rem",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", marginBottom: "0.5rem" }}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.75rem",
                            background: "#161616",
                            border: "1px solid rgba(255, 255, 255, 0.18)",
                            color: "#ffffff",
                            fontSize: "0.875rem",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    {/* OTP verification for real/non-dummy emails */}
                    {newPassword && (
                      <div style={{
                        marginTop: "0.5rem",
                        padding: "1.25rem",
                        borderRadius: "0.75rem",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.875rem",
                      }}>
                        {userIsDummy ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", color: "#aaaaaa", fontSize: "0.8125rem" }}>
                            <CheckCircle2 size={16} color="#ffffff" />
                            <span>
                              <strong>OTP Bypassed:</strong> Dummy/local email ({profile?.email}) does not require email verification.
                            </span>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ffffff", marginBottom: "0.25rem" }}>
                                  Email Verification Code (OTP) *
                                </label>
                                <p style={{ fontSize: "0.8125rem", color: "#888888", margin: 0 }}>
                                  A 6-digit code will be sent to <strong>{profile?.email}</strong>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={sendingOtp}
                                style={{
                                  padding: "0.5rem 1rem",
                                  borderRadius: "0.5rem",
                                  background: "rgba(255, 255, 255, 0.12)",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  color: "#ffffff",
                                  fontSize: "0.8125rem",
                                  fontWeight: 600,
                                  cursor: sendingOtp ? "not-allowed" : "pointer",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {sendingOtp ? "Sending Code..." : otpSent ? "Resend OTP" : "Send OTP"}
                              </button>
                            </div>

                            {otpMessage && (
                              <p style={{
                                fontSize: "0.8125rem",
                                color: otpSent ? "#34d399" : "#fca5a5",
                                margin: 0,
                              }}>
                                {otpMessage}
                              </p>
                            )}

                            <div>
                              <input
                                type="text"
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                style={{
                                  width: "14rem",
                                  padding: "0.65rem 1rem",
                                  borderRadius: "0.625rem",
                                  background: "#161616",
                                  border: "1px solid rgba(255, 255, 255, 0.25)",
                                  color: "#ffffff",
                                  fontSize: "1rem",
                                  letterSpacing: "0.2em",
                                  fontWeight: 600,
                                  outline: "none",
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
                  <button
                    type="submit"
                    disabled={saving || loading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.75rem",
                      background: "#ffffff",
                      color: "#000000",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      border: "none",
                      cursor: saving || loading ? "not-allowed" : "pointer",
                      opacity: saving || loading ? 0.6 : 1,
                      boxShadow: "0 4px 14px 0 rgba(255, 255, 255, 0.18)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && !loading) {
                        e.currentTarget.style.background = "#e8e8e8";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Save size={16} />
                    {saving ? "Saving Changes..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
