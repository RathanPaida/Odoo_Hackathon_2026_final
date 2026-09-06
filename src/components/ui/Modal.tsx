"use client";
import * as React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

const widths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, description, children, size = "md", footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div
        className={`w-full ${widths[size]} max-h-[90vh] flex flex-col rounded-2xl bg-[#0f0f0f] border border-[rgba(255,255,255,0.15)] shadow-2xl shadow-black/80 overflow-hidden`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.1)] px-6 py-5 bg-[#141414]">
            <div>
              {title && <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>}
              {description && <p className="mt-1 text-xs text-[#888888] leading-relaxed">{description}</p>}
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="text-[#888888] hover:text-white transition-colors p-1 rounded-lg hover:bg-[rgba(255,255,255,0.1)] ml-4"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-[rgba(255,255,255,0.1)] px-6 py-4 bg-[#141414]">{footer}</div>}
      </div>
    </div>
  );
}