import Link from "next/link";
import { getServerDictionary } from "@/lib/i18n/server";

type Props = {
  /** Path the page links back to, e.g. "/dashboard/admin/parts". */
  baseHref: string;
  /** Current filter/query params to carry across page changes (page is overwritten). */
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function hrefFor(baseHref: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${baseHref}?${qs}` : baseHref;
}

/** Page window that always shows at most 5 numbered pages around the current one, so the
 * control stays a fixed width whether there are 3 pages or 3,000. */
function pageWindow(page: number, totalPages: number) {
  const span = 5;
  let start = Math.max(1, page - Math.floor(span / 2));
  const end = Math.min(totalPages, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export async function Pagination({ baseHref, params, page, pageSize, total, totalPages }: Props) {
  const { t } = await getServerDictionary();

  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const linkClass =
    "rounded-control border border-border px-3 py-1.5 text-sm text-secondary transition-colors hover:text-primary";
  const disabledClass =
    "rounded-control border border-border px-3 py-1.5 text-sm text-secondary opacity-40";

  return (
    <nav
      aria-label={t.common.pagination.label}
      className="no-print mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-secondary tabular-nums">
        {t.common.pagination.showing} {first}–{last} {t.common.pagination.of} {total}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(baseHref, params, page - 1)} className={linkClass} rel="prev">
            {t.common.pagination.previous}
          </Link>
        ) : (
          <span className={disabledClass}>{t.common.pagination.previous}</span>
        )}

        {pageWindow(page, totalPages).map((p) =>
          p === page ? (
            <span
              key={p}
              aria-current="page"
              className="rounded-control border border-accent bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent tabular-nums"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(baseHref, params, p)}
              className={`${linkClass} tabular-nums`}
            >
              {p}
            </Link>
          )
        )}

        {page < totalPages ? (
          <Link href={hrefFor(baseHref, params, page + 1)} className={linkClass} rel="next">
            {t.common.pagination.next}
          </Link>
        ) : (
          <span className={disabledClass}>{t.common.pagination.next}</span>
        )}
      </div>
    </nav>
  );
}
