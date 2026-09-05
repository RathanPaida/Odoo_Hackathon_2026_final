import * as React from "react";

export type BadgeTone =
  | "neutral"
  | "pending"
  | "approved"
  | "rejected"
  | "info"
  | "negotiating"
  | "risk-low"
  | "risk-medium"
  | "risk-high";

const styles: Record<BadgeTone, string> = {
  neutral:     "text-[var(--status-neutral-fg)]     bg-[var(--status-neutral-bg)]     border-[var(--status-neutral-bd)]",
  pending:     "text-[var(--status-pending-fg)]     bg-[var(--status-pending-bg)]     border-[var(--status-pending-bd)]",
  approved:    "text-[var(--status-approved-fg)]    bg-[var(--status-approved-bg)]    border-[var(--status-approved-bd)]",
  rejected:    "text-[var(--status-rejected-fg)]    bg-[var(--status-rejected-bg)]    border-[var(--status-rejected-bd)]",
  info:        "text-[var(--status-info-fg)]        bg-[var(--status-info-bg)]        border-[var(--status-info-bd)]",
  negotiating: "text-[var(--status-negotiating-fg)] bg-[var(--status-negotiating-bg)] border-[var(--status-negotiating-bd)]",
  "risk-low":    "text-[var(--risk-low-fg)]    bg-[var(--risk-low-bg)]    border-[var(--risk-low-bd)]",
  "risk-medium": "text-[var(--risk-medium-fg)] bg-[var(--risk-medium-bg)] border-[var(--risk-medium-bd)]",
  "risk-high":   "text-[var(--risk-high-fg)]   bg-[var(--risk-high-bg)]   border-[var(--risk-high-bd)]",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot, className = "", children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${styles[tone]} ${className}`}
      {...rest}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function badgeToneForQuoteStatus(status: string): BadgeTone {
  switch (status) {
    case "DRAFT": return "info";
    case "PENDING_APPROVAL": return "pending";
    case "APPROVED": return "approved";
    case "CONFIRMED": return "approved";
    case "REJECTED": return "rejected";
    case "NEGOTIATING": return "negotiating";
    default: return "neutral";
  }
}

export function badgeToneForRisk(score: number): BadgeTone {
  if (score > 25) return "risk-high";
  if (score > 10) return "risk-medium";
  return "risk-low";
}