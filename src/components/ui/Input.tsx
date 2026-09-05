import * as React from "react";

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, error, htmlFor, className = "", required, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={`flex flex-col gap-1.5 text-sm ${className}`}>
      {label && (
        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
          {label}
          {required && <span className="text-[var(--destructive)] ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-[var(--destructive)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--muted-foreground)]">{hint}</span>
      ) : null}
    </label>
  );
}

const baseInput =
  "w-full rounded-md border border-[var(--border)] bg-transparent px-3 h-9 text-sm text-[var(--foreground)] " +
  "placeholder:text-[var(--muted-foreground)]/60 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30 focus:border-[var(--ring)] " +
  "disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", value, ...rest }, ref) {
    const sanitizedValue = typeof value === "number" && isNaN(value) ? "" : value;
    return <input ref={ref} value={sanitizedValue} className={`${baseInput} ${className}`} {...rest} />;
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`${baseInput} h-auto py-2 leading-relaxed ${className}`}
        {...rest}
      />
    );
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${baseInput} pr-8 appearance-none ${className}`} {...rest}>
        {children}
      </select>
    );
  }
);