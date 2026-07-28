"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { salesSignupSchema, type SalesSignupInput } from "@/lib/validators/auth";
import { signupSalesStaff } from "@/lib/actions/auth";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SalesSignupForm() {
  const router = useRouter();
  const t = useTranslations();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesSignupInput>({ resolver: zodResolver(salesSignupSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await signupSalesStaff(data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setDone(true);
  });

  if (done) {
    return (
      <div className="rounded-control border border-border bg-surface p-4 text-sm">
        <p className="mb-1 font-medium text-primary">{t.auth.accountCreatedTitle}</p>
        <p className="text-secondary">{t.auth.accountCreatedMessage}</p>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/login/sales-staff")}
          className="mt-3"
        >
          {t.auth.goToLoginButton}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">{t.common.name}</Label>
        <Input id="name" type="text" autoComplete="name" {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">{t.common.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t.auth.creatingAccount : t.auth.salesSignupTitle}
      </Button>
    </form>
  );
}
