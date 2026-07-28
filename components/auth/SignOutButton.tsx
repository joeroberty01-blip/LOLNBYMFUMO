"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const t = useTranslations();
  return (
    <Button type="button" variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
      {t.common.signOut}
    </Button>
  );
}
