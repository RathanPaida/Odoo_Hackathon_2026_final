"use client";
import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  confirm: (input: {
      title: string;
      description?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
    }) => Promise<boolean>;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { Icon: React.ComponentType<{ size?: number; className?: string }>; ring: string; icon: string }> = {
  success: { Icon: CheckCircle2, ring: "border-emerald-700/60", icon: "text-emerald-400" },
  error:   { Icon: XCircle,      ring: "border-rose-700/60",    icon: "text-rose-400" },
  info:    { Icon: Info,         ring: "border-slate-700",      icon: "text-slate-300" },
  warning: { Icon: AlertTriangle,ring: "border-amber-700/60",   icon: "text-amber-400" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((input: Omit<ToastItem, "id">) => {
    const id = ++idRef.current;
    setItems((curr) => [...curr, { ...input, id }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = React.useMemo<ToastContextValue>(() => ({
    toast,
    success: (title, description) => toast({ tone: "success", title, description }),
    error:   (title, description) => toast({ tone: "error", title, description }),
    info:    (title, description) => toast({ tone: "info", title, description }),
    warning: (title, description) => toast({ tone: "warning", title, description }),
    confirm: () => Promise.resolve(window.confirm("(fallback) confirm")), // overridden below
  }), [toast]);

  // Confirm modal lives in a sibling provider so we can use it here too.
  const [confirmReq, setConfirmReq] = React.useState<null | {
    title: string; description?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean;
    resolve: (v: boolean) => void;
  }>(null);

  const confirmFn = React.useCallback((input: {
    title: string; description?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean;
  }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmReq({
        title: input.title,
        description: input.description,
        confirmLabel: input.confirmLabel ?? "Confirm",
        cancelLabel: input.cancelLabel ?? "Cancel",
        destructive: input.destructive,
        resolve,
      });
    });
  }, []);

  const fullValue = React.useMemo<ToastContextValue>(() => ({
    ...value,
    confirm: confirmFn,
  }), [value, confirmFn]);

  return (
    <ToastContext.Provider value={fullValue}>
      {children}

      {/* Toasts */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((t) => {
          const { Icon, ring, icon } = toneStyles[t.tone];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-lg border ${ring} bg-[var(--card)] px-3.5 py-3 shadow-lg`}
            >
              <Icon size={16} className={`mt-0.5 ${icon}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{t.description}</p>
                )}
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmReq && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 className="text-base font-semibold tracking-tight">{confirmReq.title}</h2>
            {confirmReq.description && (
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{confirmReq.description}</p>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => { confirmReq.resolve(false); setConfirmReq(null); }}
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 text-sm hover:bg-[var(--card)]"
              >
                {confirmReq.cancelLabel}
              </button>
              <button
                onClick={() => { confirmReq.resolve(true); setConfirmReq(null); }}
                className={`h-9 rounded-md px-4 text-sm font-medium text-white ${
                  confirmReq.destructive
                    ? "bg-[var(--destructive)] hover:bg-red-500"
                    : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                }`}
              >
                {confirmReq.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}