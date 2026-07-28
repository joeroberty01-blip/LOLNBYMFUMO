import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-border ${elevated ? "bg-surface-elevated" : "bg-surface"} ${className}`}
    >
      {children}
    </div>
  );
}
