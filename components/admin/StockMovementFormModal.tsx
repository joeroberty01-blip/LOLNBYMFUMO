"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { stockMovementSchema } from "@/lib/validators/stockMovements";
import { createStockMovement, updateStockMovement } from "@/lib/actions/stockMovements";
import { Input, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  mode: "create" | "edit";
  movementId?: string;
  branches: { id: string; name: string }[];
  defaultValues?: Partial<z.output<typeof stockMovementSchema>>;
  onClose: () => void;
};

export function StockMovementFormModal({ mode, movementId, branches, defaultValues, onClose }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof stockMovementSchema>, unknown, z.output<typeof stockMovementSchema>>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { movementType: "STOCK_IN", branchId: branches[0]?.id ?? "", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createStockMovement(data)
        : await updateStockMovement(movementId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">
          {mode === "create" ? "Ongeza Stock Movement" : "Hariri Stock Movement"}
        </h2>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Aina</Label>
            <Select {...register("movementType")}>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
            </Select>
          </div>

          <div>
            <Label>Branch</Label>
            <Select {...register("branchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            {errors.branchId && <p className="mt-1 text-sm text-danger">{errors.branchId.message}</p>}
          </div>

          <div>
            <Label>Item Name</Label>
            <Input {...register("itemName")} placeholder="mfano: Toyota Hilux Brake Pad" />
            {errors.itemName && <p className="mt-1 text-sm text-danger">{errors.itemName.message}</p>}
          </div>

          <div>
            <Label>Part Number</Label>
            <Input {...register("partNumber")} placeholder="mfano: XYZ123" />
            {errors.partNumber && <p className="mt-1 text-sm text-danger">{errors.partNumber.message}</p>}
          </div>

          <div>
            <Label>Quantity</Label>
            <Input type="number" step="1" {...register("quantity")} />
            {errors.quantity && <p className="mt-1 text-sm text-danger">{errors.quantity.message}</p>}
          </div>

          <div>
            <Label>Person Name</Label>
            <Input {...register("personName")} placeholder="mfano: John" />
            {errors.personName && <p className="mt-1 text-sm text-danger">{errors.personName.message}</p>}
          </div>

          <div>
            <Label>Description (hiari)</Label>
            <Input {...register("description")} placeholder="mfano: Imepokewa kutoka supplier" />
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Ghairi
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Ongeza" : "Hifadhi"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
