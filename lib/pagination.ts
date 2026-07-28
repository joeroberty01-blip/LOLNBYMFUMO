/** Shared server-side pagination contract for every list page.
 *
 * Lists must never load a whole table into memory — at the target scale (100k+ parts) that
 * breaks both the query and the RSC payload. Every list query takes `skip`/`take` and returns
 * the matching total alongside the page of rows, so the UI can render page controls without a
 * second round trip. */

export const DEFAULT_PAGE_SIZE = 50;
const MIN_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 200;

export type PageParams = { page?: string; pageSize?: string };

export type PageArgs = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

/** Clamps untrusted query-string values so a hand-edited `?pageSize=999999` can't be used to
 * pull the entire table. */
export function parsePageParams(params: PageParams): PageArgs {
  const rawPage = Number(params.page);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const rawSize = Number(params.pageSize);
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(rawSize)))
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export type Paginated<T> = {
  rows: T[];
  /** Total matching records, ignoring the current page window. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function paginated<T>(rows: T[], total: number, args: PageArgs): Paginated<T> {
  return {
    rows,
    total,
    page: args.page,
    pageSize: args.pageSize,
    totalPages: Math.max(1, Math.ceil(total / args.pageSize)),
  };
}
