"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adjustStock } from "@/lib/actions/inventory";
import { adjustmentReasons } from "@/lib/validators/inventory";

const REASON_LABEL: Record<(typeof adjustmentReasons)[number], string> = {
  NEW_STOCK: "New stock",
  DAMAGED: "Damaged goods",
  CORRECTION: "Correction",
  OTHER: "Other",
};

const formSchema = z.object({
  branchId: z.string().min(1, "Chagua branch"),
  type: z.enum(["ADD", "REMOVE"]),
  amount: z.coerce.number().int().positive("Weka namba zaidi ya 0"),
  reason: z.enum(adjustmentReasons),
});

type Branch = { id: string; name: string };

export function StockAdjustmentModal({
  partId,
  partName,
  branchId,
  branchName,
  branches,
}: {
  partId: string;
  partName: string;
  branchId: string | null;
  branchName: string;
  branches: Branch[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { branchId: branchId ?? "", type: "ADD", reason: "NEW_STOCK" },
  });

  function close() {
    setOpen(false);
    setFormError(null);
    reset();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const quantityChange = values.type === "ADD" ? values.amount : -values.amount;

    const result = await adjustStock({
      partId,
      branchId: values.branchId,
      quantityChange,
      reason: values.reason,
    });

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    close();
    router.refresh();
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
      >
        Rekebisha Stock
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-5 border border-black/10 dark:border-white/15">
            <h2 className="font-medium mb-1">Rekebisha Stock</h2>
            <p className="text-sm text-black/60 dark:text-white/60 mb-4">{partName}</p>

            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              {branchId ? (
                <div>
                  <p className="text-sm font-medium mb-1">Branch</p>
                  <p className="text-sm">{branchName}</p>
                  <input type="hidden" value={branchId} {...register("branchId")} />
                </div>
              ) : (
                <div>
                  <label htmlFor="branchId" className="block text-sm font-medium mb-1">
                    Branch
                  </label>
                  <select
                    id="branchId"
                    className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                    {...register("branchId")}
                  >
                    <option value="">-- Chagua branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p className="mt-1 text-sm text-red-600">{errors.branchId.message}</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Aina</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" value="ADD" {...register("type")} />
                    Ongeza
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" value="REMOVE" {...register("type")} />
                    Punguza
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Kiasi
                </label>
                <input
                  id="amount"
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">
                  Sababu
                </label>
                <select
                  id="reason"
                  className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                  {...register("reason")}
                >
                  {adjustmentReasons.map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Inahifadhi..." : "Hifadhi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
