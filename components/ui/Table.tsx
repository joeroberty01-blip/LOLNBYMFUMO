import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-surface-elevated">{children}</thead>;
}

export function THeadRow({ children }: { children: ReactNode }) {
  return <tr className="text-left">{children}</tr>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium tracking-wide text-secondary uppercase ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({
  children,
  index,
  onClick,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  onClick?: () => void;
  className?: string;
}) {
  const zebra = index !== undefined && index % 2 === 1 ? "bg-white/[0.02]" : "";
  return (
    <tr
      onClick={onClick}
      className={`border-t border-border transition-colors hover:bg-white/[0.04] ${zebra} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-primary ${className}`}>{children}</td>;
}
