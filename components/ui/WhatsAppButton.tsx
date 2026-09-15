"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";

/**
 * Opens WhatsApp with the message already written and the right customer already selected — the
 * staff member only taps Send. See lib/whatsapp.ts for why this is a click-to-chat link rather
 * than an automated send.
 *
 * When the customer has no usable number the button is disabled and says so, rather than being
 * hidden: a missing phone number is something the admin needs to notice and fix, not something to
 * quietly hide.
 */
export function WhatsAppButton({
  phone,
  message,
  label,
  compact = false,
}: {
  phone: string | null | undefined;
  message: string;
  label: string;
  compact?: boolean;
}) {
  const href = buildWhatsAppLink(phone, message);

  if (!href) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled
        title={phone ? `Namba "${phone}" haisomeki` : "Mteja huyu hana namba ya simu"}
      >
        <MessageCircle size={14} />
        {compact ? null : " Hakuna namba"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      title={label}
    >
      <MessageCircle size={14} />
      {compact ? null : ` ${label}`}
    </Button>
  );
}
