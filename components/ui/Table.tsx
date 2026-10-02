import type { MouseEvent, ReactNode } from "react";

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className={`w-full border-collapse text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-surface-elevated">{children}</thead>;
}

export function THeadRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`text-left ${className}`}>{children}</tr>;
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
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

export function Td({
  children,
  className = "",
  title,
  colSpan,
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  /** Native tooltip — lets a truncated cell still reveal its full value on hover. */
  title?: string;
  colSpan?: number;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td
      title={title}
      colSpan={colSpan}
      onClick={onClick}
      className={`px-4 py-3 text-primary ${className}`}
    >
      {children}
    </td>
  );
}
