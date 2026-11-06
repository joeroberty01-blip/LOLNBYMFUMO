import { Dancing_Script } from "next/font/google";
import { COMPANY_PROFILES, getSignatureLabel } from "@/lib/companyInfo";

const signatureFont = Dancing_Script({ subsets: ["latin"], weight: "700" });

/** Lightweight "digital signature" rendered for whichever branch's letterhead is showing, in
 * place of a blank line meant for a pen — nothing here is meant to be hand-signed. Each branch
 * gets the same treatment (its own name, in a signature-style script); Lolnby additionally gets
 * its real rubber-stamp artwork (CompanyStamp) layered on top, same as before. */
export function DigitalSignature({
  companyKey,
  label,
}: {
  companyKey: "lolnby" | "woodland";
  /** Overrides the default company-name signature with an actual signer's name (e.g. the
   * Delivery Note's "Authorized By" person) — falls back to the company label when unset. */
  label?: string;
}) {
  const company = COMPANY_PROFILES[companyKey];
  return (
    <div
      className={`${signatureFont.className} select-none text-2xl`}
      style={{ color: company.titleColor, transform: "rotate(-3deg)" }}
    >
      {label || getSignatureLabel(company)}
    </div>
  );
}
