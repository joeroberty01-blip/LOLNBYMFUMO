"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { quickCustomerSchema } from "@/lib/validators/customers";
import { createCustomerQuick } from "@/lib/actions/customers";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function QuickCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: { id: string; name: string; phone: string | null }) => void;
}) {
  const t = useTranslations();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">{t.sales.quickCustomer.title}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>{t.common.name}</Label>
            <Input id="qc-name" type="text" {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
          </div>

          <div>
            <Label>
              {t.common.phone} ({t.common.optional})
            </Label>
            <Input id="qc-phone" type="text" {...register("phone")} />
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.add}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
