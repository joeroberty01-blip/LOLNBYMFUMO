"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Search, Bell, Settings, LogOut } from "lucide-react";
import { useTranslations } from "@/lib/i18n/I18nProvider";

export function Topbar({ userName, userRole }: { userName: string; userRole: string }) {
  const t = useTranslations();
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-secondary"
        />
        <input
          type="text"
          placeholder={t.adminOps.topbar.searchPlaceholder}
          disabled
          className="w-full rounded-control border border-border bg-surface-elevated py-2 pr-3 pl-9 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

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
