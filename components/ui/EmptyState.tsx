import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          {icon}
        </div>
      )}
      <div>
        <p className="font-medium text-primary">{title}</p>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
