"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { quickCustomerSchema } from "@/lib/validators/customers";
import { createCustomerQuick } from "@/lib/actions/customers";

export function QuickCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: { id: string; name: string; phone: string | null }) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof quickCustomerSchema>, unknown, z.output<typeof quickCustomerSchema>>({
    resolver: zodResolver(quickCustomerSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await createCustomerQuick(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    onCreated({ id: result.customerId, name: data.name, phone: data.phone ?? null });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-5 border border-black/10 dark:border-white/15">
        <h2 className="font-medium mb-4">Ongeza Customer Mpya</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="qc-name" className="block text-sm font-medium mb-1">
              Jina
            </label>
            <input
              id="qc-name"
              type="text"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="qc-phone" className="block text-sm font-medium mb-1">
              Simu (hiari)
            </label>
            <input
              id="qc-phone"
              type="text"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("phone")}
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Inahifadhi..." : "Ongeza"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
