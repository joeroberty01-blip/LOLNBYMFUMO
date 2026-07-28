import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] hover:opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
  secondary: "border border-border text-primary bg-transparent hover:bg-white/5",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-secondary hover:text-primary hover:bg-white/5",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
