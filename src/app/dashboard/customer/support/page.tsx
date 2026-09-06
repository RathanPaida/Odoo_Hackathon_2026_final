import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { Mail, Phone, Clock, ShieldCheck, HelpCircle } from "lucide-react";
import { SupportInquiryForm } from "./SupportInquiryForm";
import s from "./support.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerSupportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={s.page}>
        <div className={s.container}>
          <header className={s.header}>
            <h1 className={s.title}>Customer Support &amp; Assistance</h1>
            <p className={s.subtitle}>
              Direct enterprise assistance for your quotations, billing schedules, and order fulfillment
            </p>
          </header>

          {/* Direct channels */}
          <div className={s.channelGrid}>
            <div className={s.channelCard}>
              <div className={s.channelIcon}>
                <Mail size={22} />
              </div>
              <h3 className={s.channelTitle}>Email Support</h3>
              <p className={s.channelSub}>Typical response time: under 2 hours</p>
              <a href="mailto:support@dealflow360.com" className={s.channelAction}>
                support@dealflow360.com
              </a>
            </div>

            <div className={s.channelCard}>
              <div className={s.channelIcon}>
                <Phone size={22} />
              </div>
              <h3 className={s.channelTitle}>Priority Desk Phone</h3>
              <p className={s.channelSub}>Direct priority line for verified customers</p>
              <a href="tel:+918000360360" className={s.channelAction}>
                +91 8000 360 360
              </a>
            </div>

            <div className={s.channelCard}>
              <div className={s.channelIcon}>
                <Clock size={22} />
              </div>
              <h3 className={s.channelTitle}>Operating Hours</h3>
              <p className={s.channelSub}>Monday through Friday</p>
              <span className={s.channelBadge}>9:00 AM – 7:00 PM IST</span>
            </div>
          </div>

          {/* Form and side assistance */}
          <div className={s.mainGrid}>
            <SupportInquiryForm />

            <div className={s.infoColumn}>
              <div className={s.infoCard}>
                <div className={s.infoHeader}>
                  <div className={s.infoIconWrap}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className={s.infoTitle}>Enterprise Guarantee</h3>
                    <p className={s.infoSub}>Financial and stock SLA</p>
                  </div>
                </div>
                <p className={s.infoBody}>
                  Every quotation is backed by verified warehouse inventory locking and audited discount compliance.
                </p>
              </div>

              <div className={s.infoCard}>
                <div className={s.infoHeader}>
                  <div className={s.infoIconWrap}>
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h3 className={s.infoTitle}>Billing &amp; Invoices</h3>
                    <p className={s.infoSub}>Payment receipts &amp; schedules</p>
                  </div>
                </div>
                <p className={s.infoBody}>
                  To view receipts or print tax invoices, head to your account&apos;s Billing tab to review itemized breakdowns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
