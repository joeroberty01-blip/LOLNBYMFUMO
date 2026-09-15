"use client";

import { useSyncExternalStore } from "react";
import { MessageCircle, Smartphone } from "lucide-react";
import { buildWhatsAppLink, buildSmsLink, toWhatsAppNumber } from "@/lib/messaging";
import { Button } from "@/components/ui/Button";

type Device = { isIOS: boolean; isMobile: boolean };

/** Computed once and cached, because useSyncExternalStore requires a snapshot that keeps the same
 * identity between renders — returning a fresh object each time would loop forever. */
let cachedDevice: Device | null = null;

function readDevice(): Device {
  if (!cachedDevice) {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    // Touch capability rather than screen width: a docked tablet still has a messaging app, a
    // narrow desktop window does not.
    const isMobile = isIOS || /Android|Mobile/i.test(ua) || navigator.maxTouchPoints > 0;
    cachedDevice = { isIOS, isMobile };
  }
  return cachedDevice;
}

/** iOS wants "&body=", everything else wants "?body=", and Windows desktop browsers ignore `sms:`
 * altogether — all of which depend on the device the staff member is actually holding. The server
 * cannot know it, so it renders null and the client fills it in on hydration. */
function useDevice(): Device | null {
  return useSyncExternalStore(
    () => () => {},
    readDevice,
    () => null
  );
}

/**
 * Opens WhatsApp with the message already written and the right customer already selected — the
 * staff member only taps Send. See lib/messaging.ts for why this is a click-to-chat link rather
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

/**
 * The same message sent as an ordinary SMS through the phone's own messaging app — for customers
 * who do not use WhatsApp. It costs whatever an SMS costs on the staff member's line and needs no
 * gateway account.
 *
 * Desktop Chrome, Firefox and Edge on Windows ignore `sms:` links entirely, so there the button is
 * disabled with the reason shown rather than left to do nothing when clicked.
 */
export function SmsButton({
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
  const device = useDevice();
  const hasNumber = toWhatsAppNumber(phone) !== null;

  // Until the effect runs the device is unknown; render the disabled shape so the button does not
  // flip between states after hydration.
  const usable = hasNumber && device?.isMobile === true;
  const href = usable && device ? buildSmsLink(phone, message, device.isIOS ? "ios" : "other") : null;

  if (!href) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled
        title={
          !hasNumber
            ? phone
              ? `Namba "${phone}" haisomeki`
              : "Mteja huyu hana namba ya simu"
            : "SMS inafanya kazi kwenye simu au tablet pekee — si kwenye kompyuta"
        }
      >
        <Smartphone size={14} />
        {compact ? null : " SMS"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        window.location.href = href;
      }}
      title={label}
    >
      <Smartphone size={14} />
      {compact ? null : ` ${label}`}
    </Button>
  );
}
