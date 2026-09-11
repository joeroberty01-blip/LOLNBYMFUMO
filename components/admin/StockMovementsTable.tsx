"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StockMovementRow } from "@/lib/data/stockMovements";
import { deleteStockMovement } from "@/lib/actions/stockMovements";
import { StockMovementFormModal } from "@/components/admin/StockMovementFormModal";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eye } from "lucide-react";

export function StockMovementsTable({
  rows,
  branches,
  canManage,
}: {
  rows: StockMovementRow[];
  branches: { id: string; name: string }[];
  /** Both roles can add a movement; only an admin can edit/delete an existing one. */
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StockMovementRow | null>(null);
  const [viewing, setViewing] = useState<StockMovementRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(row: StockMovementRow) {
    const confirmed = window.confirm(
      `Una uhakika unataka kufuta rekodi hii? (${row.itemName} — ${row.partNumber})`
    );
    if (!confirmed) return;

    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      const result = await deleteStockMovement(row.id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="primary" onClick={() => setAdding(true)}>
          + Ongeza Stock Movement
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState title="Hakuna stock movements zilizopatikana." />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>Tarehe</Th>
              <Th>Aina</Th>
              <Th>Item Name</Th>
              <Th>Part Number</Th>
              <Th className="text-right">Quantity</Th>
              <Th>Branch</Th>
              <Th>Person</Th>
              <Th>Actions</Th>
            </THeadRow>
          </THead>
          <TBody>
            {rows.map((r, i) => (
              <Tr key={r.id} index={i}>
                <Td className="whitespace-nowrap text-secondary">
                  {r.createdAt.toLocaleString("sw-TZ")}
                </Td>
                <Td>
                  <Badge status={r.movementType === "STOCK_IN" ? "success" : "warning"}>
                    {r.movementType === "STOCK_IN" ? "Stock In" : "Stock Out"}
                  </Badge>
                </Td>
                <Td className="max-w-[220px] truncate" title={r.itemName}>
                  {r.itemName}
                </Td>
                <Td className="text-secondary">{r.partNumber}</Td>
                <Td className="text-right tabular-nums">{r.quantity}</Td>
                <Td className="text-secondary">{r.branchName}</Td>
                <Td className="text-secondary">{r.personName}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label="View"
                      title="View"
                      onClick={() => setViewing(r)}
                      className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                    >
                      <Eye size={15} />
                    </button>
                    {canManage && (
                      <>
                        <Button type="button" variant="secondary" onClick={() => setEditing(r)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={isPending && pendingId === r.id}
                          onClick={() => handleDelete(r)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {adding && (
        <StockMovementFormModal mode="create" branches={branches} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <StockMovementFormModal
          mode="edit"
          movementId={editing.id}
          branches={branches}
          defaultValues={{
            movementType: editing.movementType,
            branchId: editing.branchId,
            itemName: editing.itemName,
            partNumber: editing.partNumber,
            quantity: editing.quantity,
            personName: editing.personName,
            description: editing.description ?? undefined,
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
            <h2 className="mb-4 font-medium text-primary">Maelezo ya Stock Movement</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary">Aina</dt>
                <dd className="text-primary">
                  <Badge status={viewing.movementType === "STOCK_IN" ? "success" : "warning"}>
                    {viewing.movementType === "STOCK_IN" ? "Stock In" : "Stock Out"}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Tarehe</dt>
                <dd className="text-primary">{viewing.createdAt.toLocaleString("sw-TZ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Item Name</dt>
                <dd className="text-primary">{viewing.itemName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Part Number</dt>
                <dd className="text-primary">{viewing.partNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Quantity</dt>
                <dd className="text-primary">{viewing.quantity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Branch</dt>
                <dd className="text-primary">{viewing.branchName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Person</dt>
                <dd className="text-primary">{viewing.personName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Recorded by</dt>
                <dd className="text-primary">{viewing.userName}</dd>
              </div>
              {viewing.description && (
                <div>
                  <dt className="mb-1 text-secondary">Description</dt>
                  <dd className="text-primary">{viewing.description}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setViewing(null)}>
                Funga
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
