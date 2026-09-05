import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { HelpCircle, Mail, Phone, MessageSquare, ShieldCheck, Clock } from "lucide-react";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerSupportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Customer Support & Assistance</h1>
              <p className={styles.subtitle}>Get direct help with your quotations, billing schedules, and order fulfillment</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`${styles.card} p-6 text-center`}>
              <div className="w-12 h-12 rounded-xl bg-[rgba(109,40,217,0.2)] text-[#c4b5fd] flex items-center justify-center mx-auto mb-4 border border-[rgba(139,92,246,0.3)]">
                <Mail size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Email Support</h3>
              <p className="text-xs text-[#94a3b8] mb-4">Typical response time: under 2 hours</p>
              <a
                href="mailto:support@dealflow360.com"
                className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.2)] text-[#c4b5fd] hover:bg-[rgba(139,92,246,0.3)] border border-[rgba(139,92,246,0.3)] transition-colors"
              >
                support@dealflow360.com
              </a>
            </div>

            <div className={`${styles.card} p-6 text-center`}>
              <div className="w-12 h-12 rounded-xl bg-[rgba(109,40,217,0.2)] text-[#c4b5fd] flex items-center justify-center mx-auto mb-4 border border-[rgba(139,92,246,0.3)]">
                <Phone size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Priority Desk Phone</h3>
              <p className="text-xs text-[#94a3b8] mb-4">Dedicated direct line for Gold/Platinum</p>
              <a
                href="tel:+918000360360"
                className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.2)] text-[#c4b5fd] hover:bg-[rgba(139,92,246,0.3)] border border-[rgba(139,92,246,0.3)] transition-colors"
              >
                +91 8000 360 360
              </a>
            </div>

            <div className={`${styles.card} p-6 text-center`}>
              <div className="w-12 h-12 rounded-xl bg-[rgba(109,40,217,0.2)] text-[#c4b5fd] flex items-center justify-center mx-auto mb-4 border border-[rgba(139,92,246,0.3)]">
                <Clock size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Operating Hours</h3>
              <p className="text-xs text-[#94a3b8] mb-4">Monday – Friday</p>
              <span className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.2)] text-[#c4b5fd] border border-[rgba(139,92,246,0.3)]">
                9:00 AM – 7:00 PM IST
              </span>
            </div>
          </div>

          <div className={`${styles.card} p-6 max-w-2xl`}>
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-[#a78bfa]" />
              Submit an Inquiry
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Question regarding quotation pricing or delivery"
                  className="w-full px-4 py-2.5 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white text-sm focus:outline-none focus:border-[#a78bfa]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                  Message Details
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your request or question..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[rgba(15,15,35,0.8)] border border-[rgba(139,92,246,0.25)] text-white text-sm focus:outline-none focus:border-[#a78bfa]"
                />
              </div>
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
