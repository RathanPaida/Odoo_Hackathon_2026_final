import * as React from "react";

type Tone = "default" | "paper";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padded?: boolean;
}

export function Card({ tone = "default", padded = true, className = "", ...rest }: CardProps) {
  const surface = tone === "paper" ? "surface-paper-card" : "surface-card";
  return <div className={`${surface} ${padded ? "p-5 sm:p-6" : ""} ${className}`} {...rest} />;
}

export function CardHeader({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 flex items-start justify-between gap-3 ${className}`} {...rest} />;
}

export function CardTitle({ className = "", ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-base font-semibold tracking-tight ${className}`} {...rest} />;
}

export function CardSubtitle({ className = "", ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-[var(--muted-foreground)] mt-0.5 ${className}`} {...rest} />;
}