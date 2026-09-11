"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Settings, LogOut } from "lucide-react";

export function Topbar({ userName, userRole }: { userName: string; userRole: string }) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-end gap-4 border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-control text-secondary hover:bg-white/5 hover:text-primary"
          aria-label="Notifications"
          tabIndex={-1}
        >
          <Bell size={18} />
        </button>
        <Link
          href="/dashboard/settings"
          className="flex h-9 w-9 items-center justify-center rounded-control text-secondary hover:bg-white/5 hover:text-primary"
          aria-label="Settings"
        >
          <Settings size={18} />
        </Link>

        <div className="mx-1 h-6 w-px bg-border" />

        <div className="flex items-center gap-2.5 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-xs font-semibold text-white">
            {initials || "?"}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-primary">{userName}</p>
            <p className="text-xs text-secondary">{userRole}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-9 w-9 items-center justify-center rounded-control text-secondary hover:bg-white/5 hover:text-danger"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
