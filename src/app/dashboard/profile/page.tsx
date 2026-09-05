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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload: any = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview Card */}
            <div className={`${styles.card} p-6 h-fit`}>
              <div className="flex flex-col items-center text-center pb-6 border-b border-[rgba(139,92,246,0.15)]">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                    boxShadow: "0 8px 24px rgba(109, 40, 217, 0.4)",
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
                <h2 className="text-xl font-bold text-white mb-1">{profile?.name || "Loading..."}</h2>
                <span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider bg-[rgba(139,92,246,0.2)] text-[#c4b5fd] border border-[rgba(139,92,246,0.3)]">
                  {profile?.role?.replace("_", " ") || "USER"}
                </span>
              </div>

              <div className="pt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between text-[#94a3b8]">
                  <span className="flex items-center gap-2">
                    <Mail size={16} className="text-[#a78bfa]" /> Email
                  </span>
                  <span className="text-white font-medium">{profile?.email}</span>
                </div>

                <div className="flex items-center justify-between text-[#94a3b8]">
                  <span className="flex items-center gap-2">
                    <Shield size={16} className="text-[#a78bfa]" /> Role
                  </span>
                  <span className="text-white font-medium">{profile?.role}</span>
                </div>

                {profile?.approvalLimitPct !== undefined && profile.role === "SALES_MANAGER" && (
                  <div className="flex items-center justify-between text-[#94a3b8]">
                    <span className="flex items-center gap-2">
                      <Percent size={16} className="text-[#a78bfa]" /> Approval Limit
                    </span>
                    <span className="text-[#34d399] font-medium">{Number(profile.approvalLimitPct)}%</span>
                  </div>
                )}

                {profile?.createdAt && (
                  <div className="flex items-center justify-between text-[#94a3b8]">
                    <span className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#a78bfa]" /> Member Since
                    </span>
                    <span className="text-white font-medium">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <div className={`${styles.card} p-6 lg:col-span-2`}>
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-[#a78bfa]" />
                Account Settings
              </h2>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white focus:outline-none focus:border-[#a78bfa] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(15,15,35,0.4)] border border-[rgba(139,92,246,0.15)] text-[#64748b] text-sm cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 border-t border-[rgba(139,92,246,0.15)]">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Key size={16} className="text-[#a78bfa]" />
                    Change Password (Optional)
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white focus:outline-none focus:border-[#a78bfa] text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white focus:outline-none focus:border-[#a78bfa] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white focus:outline-none focus:border-[#a78bfa] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[rgba(109,40,217,0.3)]"
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
