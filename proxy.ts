import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Sub-areas of /dashboard/admin that an approved SALES_STAFF account may also reach — the
 * day-to-day catalogue/operational sections, each already gated the same way at the page level
 * (isApprovedSalesStaff checks in those pages' own route guards). Everything else under
 * /dashboard/admin (the Dashboard overview, Accounting, Expenses, Reports, Logs, Sales-Staff
 * management, Parts Bulk Upload, China Master File) stays ADMIN-only. */
const STAFF_ALLOWED_ADMIN_PREFIXES = [
  "/dashboard/admin/customers",
  "/dashboard/admin/debt-management",
  "/dashboard/admin/parts",
  "/dashboard/admin/stores",
  "/dashboard/admin/sales",
  "/dashboard/admin/stock-movements",
  "/dashboard/admin/suppliers",
  "/dashboard/admin/manual-invoices",
  "/dashboard/admin/stickers",
  "/dashboard/admin/purchases",
];

/** Carve-outs within the otherwise-open prefixes above that stay ADMIN-only: bulk-importing
 * parts (a mass-edit power tool) and editing/voiding an already-completed sale (a correction
 * action, same split as everywhere else — staff can create/view, admin corrects). */
function isStaffBlockedAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/admin/parts/bulk-upload") ||
    /^\/dashboard\/admin\/sales\/[^/]+\/edit(\/|$)/.test(pathname)
  );
}

function isStaffAllowedAdminPath(pathname: string): boolean {
  if (isStaffBlockedAdminPath(pathname)) return false;
  return STAFF_ALLOWED_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminArea = pathname.startsWith("/dashboard/admin");
  const isSalesArea = pathname.startsWith("/dashboard/sales");
  const isSettingsArea = pathname.startsWith("/dashboard/settings");

  if (!isAdminArea && !isSalesArea && !isSettingsArea) {
    return NextResponse.next();
  }

  if (!session) {
    const loginPath = isAdminArea ? "/login/admin" : "/login/sales-staff";
    return NextResponse.redirect(new URL(loginPath, req.nextUrl));
  }

  // Re-check role/status against the database on every dashboard request so an
  // admin deactivating a sales-staff account (or revoking access) takes effect
  // immediately, instead of waiting for that user's JWT session to expire.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true },
  });

  if (!current) {
    return NextResponse.redirect(new URL("/login/admin", req.nextUrl));
  }

  // Settings is shared by both roles — any admin, or any approved sales-staff
  // account, may reach it.
  if (isSettingsArea) {
    const isApprovedSalesStaff = current.role === "SALES_STAFF" && current.status === "APPROVED";
    if (current.role !== "ADMIN" && !isApprovedSalesStaff) {
      return NextResponse.redirect(new URL("/login/sales-staff", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isAdminArea && current.role !== "ADMIN") {
    const isApprovedSalesStaff = current.role === "SALES_STAFF" && current.status === "APPROVED";
    if (!isApprovedSalesStaff || !isStaffAllowedAdminPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard/sales", req.nextUrl));
    }
  }

  // POS, Sales History and Receipts are shared: admins can also sell directly (e.g. when
  // no sales staff is on shift) and need to reprint any receipt, so these routes accept
  // ADMIN in addition to an approved SALES_STAFF account. Every other /dashboard/sales/**
  // route (home, inventory, suppliers, my-performance) stays SALES_STAFF-only.
  // The receipt page itself further restricts sales staff to their own sales.
  const isSharedSalesRoute =
    pathname.startsWith("/dashboard/sales/pos") ||
    pathname.startsWith("/dashboard/sales/history") ||
    pathname.startsWith("/dashboard/sales/receipt");

  if (isSalesArea && isSharedSalesRoute) {
    const isApprovedSalesStaff = current.role === "SALES_STAFF" && current.status === "APPROVED";
    if (current.role !== "ADMIN" && !isApprovedSalesStaff) {
      return NextResponse.redirect(new URL("/login/sales-staff", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isSalesArea && (current.role !== "SALES_STAFF" || current.status !== "APPROVED")) {
    const loginPath = "/login/sales-staff";
    return NextResponse.redirect(new URL(loginPath, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
