import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const FIELD_CLASSES =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_CLASSES} ${className}`} />;
}

export function DateInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" {...props} className={`${FIELD_CLASSES} ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={`${FIELD_CLASSES} ${className}`}>
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-secondary">
      {children}
    </label>
  );
}
