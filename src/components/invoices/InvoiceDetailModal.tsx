"use client";

import { Printer, X, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import s from "./invoice-modal.module.css";

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
  onMarkPaid?: (invoiceId: string) => void;
  isPaying?: boolean;
  canPay?: boolean;
}

export function InvoiceDetailModal({
  invoice,
  onClose,
  onMarkPaid,
  isPaying = false,
  canPay = false,
}: InvoiceModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const lines = invoice.quote?.lines || invoice.lines || [];
  const customer = invoice.customer || invoice.quote?.customer;
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div className={s.overlay}>
      <div className={s.modalContainer}>
        {/* Header Bar */}
        <div className={s.headerBar}>
          <div className={s.headerLeft}>
            <span className={s.invoiceNumBadge}>{invoice.invoiceNumber}</span>
            <span
              className={`${s.statusBadge} ${
                isPaid ? s.statusPaid : isCancelled ? s.statusCancelled : s.statusIssued
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className={s.headerActions}>
            <button onClick={handlePrint} className={s.iconBtn}>
              <Printer size={13} />
              <span>Print / Download PDF</span>
            </button>
            <button onClick={onClose} className={s.closeBtn} aria-label="Close modal">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className={`${s.invoiceBody} ${s.printableContent}`}>
          {/* Company & Invoice meta */}
          <div className={s.brandRow}>
            <div>
              <div className={s.brandLogo}>
                <div className={s.logoBox}>D</div>
                <h2 className={s.brandName}>DealFlow 360</h2>
              </div>
              <p className={s.brandText}>Enterprise Deal &amp; Quotation Management</p>
              <p className={s.brandText}>100 Tech Boulevard, Financial District</p>
              <p className={s.brandText}>GST / Tax ID: IND-8829-3910</p>
            </div>

            <div className={s.invoiceMetaBlock}>
              <div className={s.invoiceMetaNum}>Tax Invoice / Receipt</div>
              <div>Issued Date: <span className={s.metaHighlight}>{new Date(invoice.issuedAt).toLocaleDateString()}</span></div>
              <div>Due Date: <span className={s.metaHighlight}>{new Date(invoice.dueAt).toLocaleDateString()}</span></div>
              {invoice.quote?.quoteNumber && (
                <div>Ref Quote: <span className={s.metaHighlight}>{invoice.quote.quoteNumber}</span></div>
              )}
            </div>
          </div>

          {/* Info Cards Grid */}
          <div className={s.infoGrid}>
            <div className={s.infoCard}>
              <span className={s.infoLabel}>Billed To Customer</span>
              <p className={s.infoVal}>{customer?.companyName || customer?.name || "Client Account"}</p>
              {customer?.contactName && <p className={s.infoSub}>Attn: {customer.contactName}</p>}
              <p className={s.infoSub}>{customer?.email}</p>
              {customer?.phone && <p className={s.infoSub}>Phone: {customer.phone}</p>}
            </div>

            <div className={s.infoCard}>
              <span className={s.infoLabel}>Payment Status &amp; Method</span>
              <p className={s.infoVal}>
                {isPaid ? "Paid in Full" : "Pending Settlement"}
              </p>
              <p className={s.infoSub}>
                Type: {invoice.invoiceType || "ONE_TIME"} &middot; Terms: Net 15
              </p>
              {isPaid && (
                <p className={s.infoSub} style={{ color: "#34d399", fontWeight: 600 }}>
                  ✓ Certified electronic transaction verified
                </p>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className={s.itemsSection}>
            <div className={s.sectionTitle}>Itemized Billing Specification</div>
            <div className={s.itemsTableWrapper}>
              <table className={s.itemsTable}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style={{ textAlign: "center" }}>Billing Type</th>
                    <th style={{ textAlign: "center" }}>Quantity</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? (
                    lines.map((line: any, idx: number) => {
                      const name = line.product?.name || line.description || `Item #${idx + 1}`;
                      const billing = line.billingType || line.productType || "ONE_TIME";
                      const qty = line.qty || line.quantity || 1;
                      const unitPrice = line.unitPrice || 0;
                      const lineTotal = line.lineTotal || line.totalAmount || (qty * unitPrice);

                      return (
                        <tr key={line.id || idx}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#ffffff" }}>{name}</div>
                            {line.product?.category && (
                              <div style={{ fontSize: "0.6875rem", color: "#777777" }}>{line.product.category}</div>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={s.typeBadge}>{billing}</span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600, color: "#ffffff" }}>{qty}</td>
                          <td style={{ textAlign: "right", color: "#aaaaaa" }}>₹{Number(unitPrice).toLocaleString()}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#ffffff" }}>
                            ₹{Number(lineTotal).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#777777", padding: "1.5rem" }}>
                        Direct itemized settlement for invoice {invoice.invoiceNumber}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className={s.bottomSection}>
            <div className={s.notesBlock}>
              <div className={s.notesTitle}>Payment Information &amp; Policy</div>
              <p>All remittances are processed securely via DealFlow360 Enterprise Treasury. This document serves as a certified digital tax invoice and payment receipt.</p>
            </div>

            <div className={s.totalsCard}>
              <div className={s.totalsRow}>
                <span>Subtotal</span>
                <span className={s.totalsVal}>₹{Number(invoice.subtotal || invoice.amount).toLocaleString()}</span>
              </div>
              <div className={s.totalsRow}>
                <span>Applicable GST / Tax</span>
                <span className={s.totalsVal}>₹{Number(invoice.taxAmount || 0).toLocaleString()}</span>
              </div>
              <div className={s.totalsGrandRow}>
                <span>Total Amount</span>
                <span>₹{Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className={s.footerBar}>
          <div className={s.certifiedText}>
            ✓ DealFlow360 Certified Billing &amp; Invoicing
          </div>

          <div className={s.footerButtons}>
            {canPay && !isPaid && !isCancelled && onMarkPaid && (
              <button
                onClick={() => onMarkPaid(invoice.id)}
                disabled={isPaying}
                className={s.settleBtn}
              >
                {isPaying ? "Processing..." : "Mark as Paid / Settle Now"}
              </button>
            )}
            <button onClick={onClose} className={s.cancelActionBtn}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
