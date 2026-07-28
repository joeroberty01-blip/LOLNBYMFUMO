"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { customerSchema, type CustomerInput } from "@/lib/validators/customers";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: Partial<CustomerInput>;
};

export function CustomerForm({ mode, customerId, defaultValues }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof customerSchema>, unknown, z.output<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { creditLimit: 0, ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createCustomer(data)
        : await updateCustomer(customerId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/dashboard/admin/customers");
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
        <Label>{t.adminCatalog.customers.creditLimit}</Label>
        <Input type="number" step="0.01" {...register("creditLimit")} />
        {errors.creditLimit && (
          <p className="mt-1 text-sm text-danger">{errors.creditLimit.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? t.common.saving
          : mode === "create"
            ? t.adminCatalog.customers.addSubmit
            : t.adminCatalog.customers.saveChanges}
      </Button>
    </form>
  );
}
