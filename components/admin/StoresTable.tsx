"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createStore, setStoreSellingPoint, setStoreActive } from "@/lib/actions/branches";
import { storeSchema } from "@/lib/validators/branches";
import type { StoreRow } from "@/lib/data/branches";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function StoresTable({ stores }: { stores: StoreRow[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<StoreRow | null>(null);
  const [pendingArchive, setPendingArchive] = useState<StoreRow | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof storeSchema>, unknown, z.output<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: "", location: "", isSellingPoint: false },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await createStore(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    reset();
    setAddOpen(false);
    router.refresh();
  });

  function confirmToggle() {
    if (!pendingToggle) return;
    startTransition(async () => {
      await setStoreSellingPoint(pendingToggle.id, !pendingToggle.isSellingPoint);
      setPendingToggle(null);
      router.refresh();
    });
  }

  function confirmArchive() {
    if (!pendingArchive) return;
    setArchiveError(null);
    startTransition(async () => {
      const result = await setStoreActive(pendingArchive.id, !pendingArchive.isActive);
      if (!result.success) {
        setArchiveError(result.error);
        setPendingArchive(null);
        return;
      }
      setPendingArchive(null);
      router.refresh();
    });
  }

  return (
    <>
      {archiveError && (
        <p className="mb-4 rounded-control border border-danger/40 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
          {archiveError}
        </p>
      )}

      <div className="mb-4 flex justify-end">
        <Button type="button" variant="primary" onClick={() => setAddOpen(true)}>
          + Add Store
        </Button>
      </div>

      <Table>
        <THead>
          <THeadRow>
            <Th>Name</Th>
            <Th>Location</Th>
            <Th>Selling Point (POS)</Th>
            <Th>Status</Th>
            <Th className="text-right">Parts</Th>
            <Th className="text-right">Total Stock</Th>
            <Th>Actions</Th>
          </THeadRow>
        </THead>
        <TBody>
          {stores.map((s, i) => (
            <Tr key={s.id} index={i} className={s.isActive ? undefined : "opacity-60"}>
              <Td className="font-medium text-primary">{s.name}</Td>
              <Td className="text-secondary">{s.location}</Td>
              <Td>
                <Badge status={s.isSellingPoint ? "success" : "neutral"}>
                  {s.isSellingPoint ? "Selling Point" : "Warehouse only"}
                </Badge>
              </Td>
              <Td>
                <Badge status={s.isActive ? "success" : "neutral"}>
                  {s.isActive ? "Active" : "Archived"}
                </Badge>
              </Td>
              <Td className="text-right tabular-nums">{s.partCount}</Td>
              <Td className="text-right tabular-nums">{s.totalStock}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {s.isActive && (
                    <Button type="button" variant="secondary" onClick={() => setPendingToggle(s)}>
                      {s.isSellingPoint ? "Make Warehouse-Only" : "Make Selling Point"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={s.isActive ? "danger" : "secondary"}
                    onClick={() => setPendingArchive(s)}
                  >
                    {s.isActive ? "Archive" : "Restore"}
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
            <h2 className="mb-4 font-medium text-primary">Add Store</h2>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div>
                <Label>Name</Label>
                <Input {...register("name")} />
                {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Location</Label>
                <Input {...register("location")} />
                {errors.location && (
                  <p className="mt-1 text-sm text-danger">{errors.location.message}</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-primary">
                <input type="checkbox" {...register("isSellingPoint")} />
                This store is a POS selling point (customers check out here)
              </label>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Add Store"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingToggle && (
        <ConfirmDialog
          title={`${pendingToggle.isSellingPoint ? "Remove" : "Add"} "${pendingToggle.name}" as a POS Selling Point?`}
          lines={[
            { label: "Store", value: pendingToggle.name },
            {
              label: "New status",
              value: pendingToggle.isSellingPoint ? "Warehouse only" : "Selling Point",
              emphasis: true,
            },
          ]}
          warning={
            pendingToggle.isSellingPoint
              ? "Sales staff will no longer be able to check out sales at this store."
              : undefined
          }
          confirmLabel="Yes, Confirm"
          isSubmitting={isPending}
          onConfirm={confirmToggle}
          onCancel={() => setPendingToggle(null)}
        />
      )}

      {pendingArchive && (
        <ConfirmDialog
          title={`${pendingArchive.isActive ? "Archive" : "Restore"} "${pendingArchive.name}"?`}
          lines={[
            { label: "Store", value: pendingArchive.name },
            { label: "Parts currently stocked here", value: String(pendingArchive.partCount) },
            {
              label: "New status",
              value: pendingArchive.isActive ? "Archived" : "Active",
              emphasis: true,
            },
          ]}
          warning={
            pendingArchive.isActive
              ? "This hides the store from POS, Bulk Upload, and stock forms. Its sale/expense/stock-adjustment history is never deleted — you can restore it here at any time."
              : undefined
          }
          confirmLabel={pendingArchive.isActive ? "Yes, Archive" : "Yes, Restore"}
          confirmVariant={pendingArchive.isActive ? "danger" : "primary"}
          isSubmitting={isPending}
          onConfirm={confirmArchive}
          onCancel={() => setPendingArchive(null)}
        />
      )}
    </>
  );
}
