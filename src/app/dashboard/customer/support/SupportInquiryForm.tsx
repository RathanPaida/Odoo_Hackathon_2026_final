"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui";
import s from "./support.module.css";

export function SupportInquiryForm() {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Billing & Invoices");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Missing fields", "Please provide both a subject and a message.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Inquiry Submitted", "Your ticket has been routed to our priority support team.");
      setSubject("");
      setMessage("");
    }, 600);
  };

  return (
    <div className={s.formCard}>
      <div className={s.formHeader}>
        <div>
          <h2 className={s.formTitle}>Submit Support Ticket</h2>
          <p className={s.formSubtitle}>Direct channel to billing, quotation, and fulfillment specialists</p>
        </div>
        <span className={s.slaBadge}>PRIORITY SLA</span>
      </div>

      {isSubmitted ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <CheckCircle2 size={40} color="#ffffff" style={{ margin: "0 auto 1rem auto" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
            Inquiry Sent Successfully
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "#888888", maxWidth: "400px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
            Ticket #SUP-{Math.floor(100000 + Math.random() * 900000)} has been logged. An enterprise specialist will respond within 2 hours.
          </p>
          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className={s.submitButton}
          >
            Send Another Inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={s.formFields}>
          <div className={s.formRow}>
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Inquiry Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={s.select}
              >
                <option value="Billing & Invoices">Billing & Invoices</option>
                <option value="Quotation & Pricing">Quotation & Pricing</option>
                <option value="Order Fulfillment & Stock">Order Fulfillment & Stock</option>
                <option value="Contract & Subscriptions">Contract & Subscriptions</option>
                <option value="Other">Other Assistance</option>
              </select>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Invoice clarification or delivery update"
                className={s.input}
                required
              />
            </div>
          </div>

          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>Message Details</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide specifics (quote number, invoice ID, or question)..."
              className={s.textarea}
              required
            />
          </div>

          <div className={s.formFooter}>
            <p className={s.footerNote}>
              Monitored 24/7 for urgent order and invoice requests
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className={s.submitButton}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
