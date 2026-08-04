import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStoresForAdmin } from "@/lib/data/branches";
import { StoresTable } from "@/components/admin/StoresTable";
import { ListToolbar } from "@/components/ui/ListToolbar";

export default async function StoresPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const stores = await getStoresForAdmin();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Stores</h1>
        <p className="text-sm text-secondary">
          Business locations. &ldquo;Selling Point&rdquo; stores appear in the POS checkout
          picker; warehouse-only stores hold inventory but are not offered for direct checkout.
        </p>
      </div>

      <ListToolbar
        filename="stores"
        headers={["Name", "Location", "Selling Point", "Status", "Parts", "Total Stock"]}
        rows={stores.map((s) => [
          s.name,
          s.location,
          s.isSellingPoint ? "Yes" : "No",
          s.isActive ? "Active" : "Archived",
          s.partCount,
          s.totalStock,
        ])}
      />

      <StoresTable stores={stores} />
    </div>
  );
}
