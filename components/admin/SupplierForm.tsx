"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { supplierSchema } from "@/lib/validators/suppliers";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  mode: "create" | "edit";
  supplierId?: string;
  defaultValues?: Partial<z.output<typeof supplierSchema>>;
};

export function SupplierForm({ mode, supplierId, defaultValues }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof supplierSchema>, unknown, z.output<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { balance: 0, ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createSupplier(data)
        : await updateSupplier(supplierId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/dashboard/admin/suppliers");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <Label>{t.common.name}</Label>
        <Input {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div>
        <Label>
          {t.common.phone} ({t.common.optional})
        </Label>
        <Input {...register("phone")} />
      </div>

      <div>
        <Label>
          {t.common.email} ({t.common.optional})
        </Label>
        <Input type="email" {...register("email")} />
      </div>

      <div>
        <Label>
          {t.common.address} ({t.common.optional})
        </Label>
        <Input {...register("address")} />
      </div>

      <div>
        <Label>{t.adminCatalog.suppliers.balanceLabel}</Label>
        <Input type="number" step="0.01" {...register("balance")} />
        {errors.balance && <p className="mt-1 text-sm text-danger">{errors.balance.message}</p>}
        <p className="mt-1 text-xs text-secondary">{t.adminCatalog.suppliers.balanceHelp}</p>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? t.common.saving
          : mode === "create"
            ? t.adminCatalog.suppliers.addSubmit
            : t.adminCatalog.suppliers.saveChanges}
      </Button>
    </form>
  );
}
