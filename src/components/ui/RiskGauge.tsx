"use client";
import { Badge, badgeToneForRisk, type BadgeTone } from "./Badge";
import { ShieldAlert } from "lucide-react";

interface RiskGaugeProps {
  score: number | null | undefined;
  breakdown?: Array<{
    productName: string;
    categoryName: string;
    appliedDiscount: number;
    allowedDiscount: number;
    lineExcess: number;
    weightedViolation: number;
  }>;
}

/**
 * Read-only. Renders the blended risk score and the per-line breakdown
 * exactly as returned by the approval API. Does not calculate risk —
 * the backend owns that logic.
 */
export function RiskGauge({ score, breakdown }: RiskGaugeProps) {
  const numeric = Number(score ?? 0);
  const tone: BadgeTone = badgeToneForRisk(numeric);

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Blended Risk Score
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular">
            {numeric.toFixed(1)} <span className="text-sm text-[var(--muted-foreground)] font-normal">pts</span>
          </p>
        </div>
        <Badge tone={tone} dot>
          {tone === "risk-high" ? "High" : tone === "risk-medium" ? "Medium" : "Low"}
        </Badge>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            <ShieldAlert size={12} /> Per-line attribution
          </p>
          <ul className="space-y-1.5 text-xs">
            {breakdown.map((line) => (
              <li key={`${line.productName}-${line.categoryName}`} className="flex items-center justify-between gap-3 tabular">
                <span className="truncate">
                  <span className="text-[var(--foreground)]">{line.productName}</span>
                  <span className="ml-1.5 text-[var(--muted-foreground)]">{line.categoryName}</span>
                </span>
                <span className={`font-semibold ${line.lineExcess > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {line.appliedDiscount}% / cap {line.allowedDiscount}%
                  {line.lineExcess > 0 && ` (+${line.lineExcess}%)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}