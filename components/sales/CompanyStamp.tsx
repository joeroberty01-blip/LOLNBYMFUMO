const STAMP_ASSET: Record<"lolnby" | "woodland", { src: string; dateColor: string }> = {
  lolnby: { src: "/company-stamp.svg", dateColor: "#d1241f" },
  woodland: { src: "/woodland-stamp.svg", dateColor: "#C8102E" },
};

/** Digital rendering of the business's physical rubber stamp (generated from stamp.py — see
 * public/company-stamp.svg for Lolnby and public/woodland-stamp.svg for Woodland, each holding
 * everything except the date). The date is laid over the artwork as plain text rather than
 * baked into the SVG, so it can track each invoice's own date instead of being frozen at
 * whatever date the stamp image was generated.
 *
 * `width` controls the rendered size (default kept small so it reliably sits inside the
 * invoice's signature area instead of overflowing the page); the date's font size scales with
 * it so it stays legible without the width prop being touched everywhere it's used. */
export function CompanyStamp({
  date,
  companyKey = "lolnby",
  width = 130,
  className,
}: {
  date: string;
  companyKey?: "lolnby" | "woodland";
  width?: number;
  className?: string;
}) {
  const asset = STAMP_ASSET[companyKey];
  return (
    <div
      className={`relative inline-block select-none ${className ?? ""}`}
      style={{ width, transform: "rotate(-7deg)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, not an optimizable remote/content image */}
      <img src={asset.src} alt="Company Stamp" className="w-full" draggable={false} />
      <div
        className="absolute inset-x-0 text-center font-bold"
        style={{ top: "61.5%", color: asset.dateColor, fontSize: width * 0.075, letterSpacing: 1 }}
      >
        {date}
      </div>
    </div>
  );
}
