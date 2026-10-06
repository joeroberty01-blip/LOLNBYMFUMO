import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSaleWithItems } from "@/lib/data/sales";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const sale = await getSaleWithItems(id);
  if (!sale) notFound();

  return (
    <div>
      <Link href="/dashboard/admin/sales" className="text-sm text-accent hover:underline">
        ← Back to All Sales
      </Link>

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-primary">Invoice #{sale.invoiceNumber}</h1>
            <Badge status={sale.status === "VOIDED" ? "danger" : "success"}>{sale.status}</Badge>
          </div>
          <p className="text-sm text-secondary">{sale.createdAt.toLocaleString("sw-TZ")}</p>
        </div>
        <div className="flex gap-2">
          {sale.status !== "VOIDED" && (
            <Link href={`/dashboard/admin/sales/${sale.id}/edit`}>
              <Button type="button" variant="secondary">
                Edit
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/sales/receipt/${sale.id}`}>
            <Button type="button" variant="secondary">
              Receipt
            </Button>
          </Link>
          <Link href={`/dashboard/admin/sales/${sale.id}/invoice`}>
            <Button type="button" variant="secondary">
              Tax Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-secondary">Branch</p>
          <p className="font-medium text-primary">{sale.branch.name}</p>
        </Card>
        {sale.sourceBranch && (
          <Card className="border-accent/30 bg-accent/[0.06] p-4">
            <p className="text-sm text-secondary">Source Store (stock kutoka)</p>
            <p className="font-medium text-primary">{sale.sourceBranch.name}</p>
          </Card>
        )}
        <Card className="p-4">
          <p className="text-sm text-secondary">Seller</p>
          <p className="font-medium text-primary">{sale.user.name}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-secondary">Customer</p>
          <p className="font-medium text-primary">{sale.customer?.name ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-secondary">Payment</p>
          <p className="font-medium text-primary">
            {sale.isCredit ? "Credit" : (PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-secondary">Total</p>
          <p className="font-medium text-primary tabular-nums">{currency.format(sale.total.toNumber())}</p>
        </Card>
        {sale.status === "VOIDED" && (
          <Card className="border-danger/30 bg-danger/[0.07] p-4">
            <p className="text-sm text-secondary">Voided</p>
            <p className="font-medium text-primary">
              {sale.voidedBy?.name ?? "—"}
              {sale.voidedAt ? ` · ${sale.voidedAt.toLocaleString("sw-TZ")}` : ""}
            </p>
          </Card>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">Items</h2>
      <Table>
        <THead>
          <THeadRow>
            <Th>Item</Th>
            <Th>Part Number</Th>
            <Th className="text-right">Quantity</Th>
            <Th className="text-right">Unit Price</Th>
            <Th className="text-right">Subtotal</Th>
          </THeadRow>
        </THead>
        <TBody>
          {sale.items.map((item, i) => (
            <Tr key={item.id} index={i}>
              <Td>
                {item.isManualEntry ? (item.manualItemName ?? "Manual item") : (item.part?.name ?? "Part")}
                {item.isManualEntry && (
                  <span className="ml-1.5 align-middle">
                    <Badge status="warning">Manual</Badge>
                  </span>
                )}
              </Td>
              <Td className="text-secondary">
                {item.isManualEntry ? (item.manualPartNumber ?? "—") : (item.part?.partNumber ?? "—")}
              </Td>
              <Td className="text-right tabular-nums">{item.quantity}</Td>
              <Td className="text-right tabular-nums">{currency.format(item.unitPrice.toNumber())}</Td>
              <Td className="text-right tabular-nums">
                {currency.format(item.quantity * item.unitPrice.toNumber())}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
