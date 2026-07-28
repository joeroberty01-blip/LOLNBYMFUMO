import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSuppliersDirectory } from "@/lib/data/suppliers";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Truck } from "lucide-react";

export default async function SalesSuppliersPage() {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const suppliers = await getSuppliersDirectory();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">Suppliers</h1>
      <p className="mb-6 text-sm text-secondary">
        Contact details only. Balances and payments are managed by admins.
      </p>

      {suppliers.length === 0 ? (
        <EmptyState icon={<Truck size={20} />} title="No suppliers yet." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Address</Th>
            </THeadRow>
          </THead>
          <TBody>
            {suppliers.map((s, i) => (
              <Tr key={s.id} index={i}>
                <Td className="font-medium text-primary">{s.name}</Td>
                <Td>{s.phone ?? "—"}</Td>
                <Td>{s.email ?? "—"}</Td>
                <Td>{s.address ?? "—"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
