"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

/**
 * Coordinates the mobile nav drawer between the Topbar (which renders the hamburger trigger) and
 * the Sidebar (which renders the drawer itself). They are siblings under a server-component
 * layout with no shared state of their own, so this context is the thinnest boundary that lets
 * them talk to each other without threading `open`/`setOpen` props through the layout files.
 */
export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
