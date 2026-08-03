import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Receipt, DollarSign, Boxes, Ban } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDateRange } from "@/lib/dateRanges";
import { getMyPerformance } from "@/lib/data/reports/staff";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  DEACTIVATED: "neutral",
};

export default async function SalesStaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const staff = await prisma.user.findUnique({
    where: { id, role: "SALES_STAFF" },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });
  if (!staff) notFound();

  const range = getDateRange({ period: "monthly" });
  const perf = await getMyPerformance(staff.id, range);

  return (
    <div>
      <Link href="/dashboard/admin/sales-staff" className="text-sm text-accent hover:underline">
        ← Back to Sales Staff
      </Link>

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-primary">{staff.name}</h1>
            <Badge status={STATUS_VARIANT[staff.status] ?? "neutral"}>{staff.status}</Badge>
          </div>
          <p className="text-sm text-secondary">
            {staff.email} · Joined {staff.createdAt.toLocaleDateString("sw-TZ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/admin/sales-staff/${staff.id}/edit`}>
            <Button type="button" variant="secondary">
              Edit
            </Button>
          </Link>
          <Link href={`/dashboard/admin/sales?userId=${staff.id}`}>
            <Button type="button" variant="secondary">
              View Sales
            </Button>
          </Link>
        </div>
      </div>

      <p className="mb-3 text-sm text-secondary">Performance — {range.label}</p>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Receipt size={18} />}
          label="Transactions"
          value={String(perf.transactionCount)}
          accent="primary"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Sales"
          value={currency.format(perf.totalSales)}
          accent="success"
        />
        <StatCard
          icon={<Boxes size={18} />}
          label="Manual Items"
          value={String(perf.manualItemCount)}
          accent="tertiary"
        />
        <StatCard
          icon={<Ban size={18} />}
          label="Voided"
          value={String(perf.voidedCount)}
          accent="warning"
        />
      </div>
    </div>
  );
}
