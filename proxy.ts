import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminArea = pathname.startsWith("/dashboard/admin");
  const isSalesArea = pathname.startsWith("/dashboard/sales");

  if (!isAdminArea && !isSalesArea) {
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

  if (isAdminArea && current.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard/sales", req.nextUrl));
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
