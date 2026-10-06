/** Digital rendering of the physical company rubber stamp (generated from the business's own
 * stamp.py — see public/company-stamp.svg, which holds everything except the date). The date
 * is laid over the artwork as plain text rather than baked into the SVG, so it can track each
 * invoice's own date instead of being frozen at whatever date the stamp image was generated.
 *
 * Position/size below are tuned for the fixed 200px width this renders at; both the image and
 * the date move together since they share one `position: relative` wrapper. */
export function CompanyStamp({ date, className }: { date: string; className?: string }) {
  return (
    <div
      className={`relative inline-block select-none ${className ?? ""}`}
      style={{ width: 200, transform: "rotate(-7deg)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, not an optimizable remote/content image */}
      <img src="/company-stamp.svg" alt="Company Stamp" className="w-full" draggable={false} />
      <div
        className="absolute inset-x-0 text-center font-bold"
        style={{ top: "61.5%", color: "#d1241f", fontSize: 15, letterSpacing: 1.3 }}
      >
        {date}
      </div>
    </div>
  );
}
