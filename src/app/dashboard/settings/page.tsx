"use client";

import { useEffect, useState } from "react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { 
  Settings, 
  Bell, 
  Moon, 
  Globe, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  Save 
} from "lucide-react";
import styles from "../dashboard.module.css";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [approvalAlerts, setApprovalAlerts] = useState(true);
  const [currency, setCurrency] = useState("INR");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const userData = data.success ? data.data : data.user;
          if (userData?.id) {
            setProfile(userData);
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }
    load();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <RoleSidebar role={profile?.role} userName={profile?.name} userEmail={profile?.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>System Settings</h1>
              <p className={styles.subtitle}>Customize your application preferences, notifications, and workflow alerts</p>
            </div>
          </header>

          {saved && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm border bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]">
              <CheckCircle2 size={18} />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "52rem" }}>
            {/* Preferences */}
            <div className={styles.card} style={{ padding: "1.75rem 2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
                <Sliders size={20} color="#ffffff" />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Workspace Preferences
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Row 1: Default Currency */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.125rem 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  gap: "1.5rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                      Default Currency
                    </h3>
                    <p style={{ fontSize: "0.8125rem", color: "#888888", margin: "0.25rem 0 0 0" }}>
                      Primary currency used for quotations and revenue tracking
                    </p>
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "0.625rem",
                      background: "#161616",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="INR" style={{ background: "#161616", color: "#ffffff" }}>INR (₹)</option>
                    <option value="USD" style={{ background: "#161616", color: "#ffffff" }}>USD ($)</option>
                    <option value="EUR" style={{ background: "#161616", color: "#ffffff" }}>EUR (€)</option>
                  </select>
                </div>

                {/* Row 2: Live Pipeline Auto-Refresh */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.125rem 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  gap: "1.5rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                      Live Pipeline Auto-Refresh
                    </h3>
                    <p style={{ fontSize: "0.8125rem", color: "#888888", margin: "0.25rem 0 0 0" }}>
                      Periodically update quotation risk status and metrics without manual reloads
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRefresh}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    style={{
                      width: "2.75rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                      background: autoRefresh ? "#ffffff" : "rgba(255, 255, 255, 0.12)",
                      border: `1px solid ${autoRefresh ? "#ffffff" : "rgba(255, 255, 255, 0.2)"}`,
                      position: "relative",
                      cursor: "pointer",
                      padding: 0,
                      outline: "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: "2px",
                      left: autoRefresh ? "calc(100% - 1.25rem - 2px)" : "2px",
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: autoRefresh ? "#000000" : "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    }} />
                  </button>
                </div>

                {/* Row 3: Interface Theme */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.125rem 0 0.25rem 0",
                  gap: "1.5rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                      Interface Theme
                    </h3>
                    <p style={{ fontSize: "0.8125rem", color: "#888888", margin: "0.25rem 0 0 0" }}>
                      High contrast monochrome dark theme for precision and readability
                    </p>
                  </div>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.5rem",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    whiteSpace: "nowrap",
                  }}>
                    Monochrome Dark (Active)
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Governance */}
            <div className={styles.card} style={{ padding: "1.75rem 2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
                <Bell size={20} color="#ffffff" />
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Governance & Notification Alerts
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Row 1: Email Digest */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.125rem 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  gap: "1.5rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                      Email Digest & Approval Notifications
                    </h3>
                    <p style={{ fontSize: "0.8125rem", color: "#888888", margin: "0.25rem 0 0 0" }}>
                      Receive email alerts when quotations exceed discount ceilings or require sign-off
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailNotifications}
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    style={{
                      width: "2.75rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                      background: emailNotifications ? "#ffffff" : "rgba(255, 255, 255, 0.12)",
                      border: `1px solid ${emailNotifications ? "#ffffff" : "rgba(255, 255, 255, 0.2)"}`,
                      position: "relative",
                      cursor: "pointer",
                      padding: 0,
                      outline: "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: "2px",
                      left: emailNotifications ? "calc(100% - 1.25rem - 2px)" : "2px",
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: emailNotifications ? "#000000" : "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    }} />
                  </button>
                </div>

                {/* Row 2: Real-Time Risk Alerts */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.125rem 0 0.25rem 0",
                  gap: "1.5rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                      Real-Time Risk Alerts
                    </h3>
                    <p style={{ fontSize: "0.8125rem", color: "#888888", margin: "0.25rem 0 0 0" }}>
                      Immediate pop-up notification when customer requests an out-of-policy discount
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={approvalAlerts}
                    onClick={() => setApprovalAlerts(!approvalAlerts)}
                    style={{
                      width: "2.75rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                      background: approvalAlerts ? "#ffffff" : "rgba(255, 255, 255, 0.12)",
                      border: `1px solid ${approvalAlerts ? "#ffffff" : "rgba(255, 255, 255, 0.2)"}`,
                      position: "relative",
                      cursor: "pointer",
                      padding: 0,
                      outline: "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: "2px",
                      left: approvalAlerts ? "calc(100% - 1.25rem - 2px)" : "2px",
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: approvalAlerts ? "#000000" : "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="submit"
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
                  cursor: "pointer",
                  boxShadow: "0 4px 14px 0 rgba(255, 255, 255, 0.18)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e8e8e8";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Save size={16} />
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      </main>
    </RoleSidebar>
  );
}
