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

          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
            {/* Preferences */}
            <div className={`${styles.card} p-6`}>
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Sliders size={20} className="text-[#a78bfa]" />
                Workspace Preferences
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-[rgba(139,92,246,0.15)]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Default Currency</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Primary currency used for quotations and revenue tracking</p>
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white text-sm focus:outline-none focus:border-[#a78bfa]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pb-6 border-b border-[rgba(139,92,246,0.15)]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Live Pipeline Auto-Refresh</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Periodically update quotation risk status and metrics without manual reloads</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7c3aed]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Interface Theme</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Optimized ultra-deep violet theme for 24-hour high productivity</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(139,92,246,0.2)] text-[#c4b5fd] border border-[rgba(139,92,246,0.3)] font-medium">
                    Dark Violet (Active)
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Governance */}
            <div className={`${styles.card} p-6`}>
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Bell size={20} className="text-[#a78bfa]" />
                Governance & Notification Alerts
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-[rgba(139,92,246,0.15)]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Email Digest & Approval Notifications</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Receive email alerts when quotations exceed discount ceilings or require sign-off</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7c3aed]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Real-Time Risk Alerts</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">Immediate pop-up notification when customer requests an out-of-policy discount</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalAlerts}
                      onChange={(e) => setApprovalAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7c3aed]"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[rgba(109,40,217,0.3)]"
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
