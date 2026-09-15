import "server-only";

/**
 * Sends SMS through SMSGate (https://sms-gate.app) — an open-source Android app that turns a
 * phone into an SMS gateway. The app is free; each message goes out over that phone's own SIM at
 * whatever the carrier charges, so there is no per-message platform fee and no aggregator
 * account. That is the only route to genuinely automatic sending on no budget: WhatsApp's
 * Business API bills every business-initiated message, and a commercial SMS aggregator bills
 * TZS 12-25 each.
 *
 * In Cloud mode the phone holds a connection to api.sms-gate.app and this app POSTs there, which
 * is what makes it reachable from a serverless host that cannot see the phone's local network.
 * Point SMS_GATEWAY_URL at a self-hosted instance instead if the messages should not pass
 * through a third party.
 *
 * Nothing is sent unless all three variables are set, and the error says so plainly rather than
 * failing silently — the same shape as the SMTP check in lib/actions/reportEmail.ts.
 */

const DEFAULT_URL = "https://api.sms-gate.app/3rdparty/v1";

export type SmsResult = { success: true; id?: string } | { success: false; error: string };

export function isSmsGatewayConfigured(): boolean {
  return Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASS);
}

export function smsGatewayNotConfiguredMessage(): string {
  return (
    "SMS gateway haijawekwa. Weka SMS_GATEWAY_USER na SMS_GATEWAY_PASS kwenye environment " +
    "variables (kutoka app ya SMSGate kwenye simu), kisha jaribu tena."
  );
}

/**
 * Sends one message to one or more numbers. Numbers must already be in international form with
 * a leading "+" — callers normalise through toWhatsAppNumber in lib/messaging.ts so a malformed
 * number never reaches the gateway.
 */
export async function sendSms(phoneNumbers: string[], text: string): Promise<SmsResult> {
  if (!isSmsGatewayConfigured()) {
    return { success: false, error: smsGatewayNotConfiguredMessage() };
  }
  if (phoneNumbers.length === 0) {
    return { success: false, error: "Hakuna namba ya kutuma" };
  }

  const base = (process.env.SMS_GATEWAY_URL || DEFAULT_URL).replace(/\/+$/, "");
  const auth = Buffer.from(
    `${process.env.SMS_GATEWAY_USER}:${process.env.SMS_GATEWAY_PASS}`
  ).toString("base64");

  try {
    const response = await fetch(`${base}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers }),
      // A phone on a mobile connection can be slow to acknowledge; well under the serverless
      // request budget, but short enough that one stuck recipient cannot stall a whole batch.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `Gateway imekataa (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { success: true, id: data?.id };
  } catch (e) {
    const err = e as Error;
    return {
      success: false,
      error:
        err.name === "TimeoutError"
          ? "Gateway haijajibu kwa wakati — hakikisha simu ina internet"
          : `Imeshindikana kufikia gateway: ${err.message}`,
    };
  }
}
